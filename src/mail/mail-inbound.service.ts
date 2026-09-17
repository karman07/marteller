import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import {
  InboundEmail,
  InboundEmailDocument,
} from './schemas/inbound-email.schema';
import {
  EmailMessage,
  EmailMessageDocument,
} from './schemas/email-message.schema';
import {
  InboundMessage,
  InboundMessageDocument,
} from '../inbox/schemas/inbound-message.schema';
import { MailDomainsService } from '../mail-core/mail-domains.service';
import { SuppressionService } from '../mail-core/suppression.service';
import { AiReplyService } from '../ai/ai-reply.service';
import { LeadsService } from '../leads/leads.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { MailService } from './mail.service';

export type ParsedInboundAttachment = {
  filename: string;
  contentType?: string;
  content: Buffer;
};

export type ParsedInboundEmail = {
  messageId: string;
  from: string;
  to: string[];
  subject?: string;
  text?: string;
  html?: string;
  inReplyTo?: string;
  references?: string[];
  attachments?: ParsedInboundAttachment[];
  raw?: Buffer;
};

const UPLOAD_ROOT = join(process.cwd(), 'uploads', 'mail-inbound');

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// The entry point for real inbound email — called by the inbound SMTP
// listener (src/mail-inbound.main.ts) after Postfix + rspamd have accepted
// and forwarded a message locally. Mirrors InboxService.simulate's pipeline
// (generate reply -> maybe create lead -> fire workflow trigger) but reads
// AiConfig.autoReplyChannels/autoSendChannels first, since this is a real
// inbound event, not an explicit manual test.
@Injectable()
export class MailInboundService {
  private readonly logger = new Logger(MailInboundService.name);

  constructor(
    @InjectModel(InboundEmail.name)
    private readonly inboundEmailModel: Model<InboundEmailDocument>,
    @InjectModel(InboundMessage.name)
    private readonly inboundMessageModel: Model<InboundMessageDocument>,
    @InjectModel(EmailMessage.name)
    private readonly emailMessageModel: Model<EmailMessageDocument>,
    private readonly mailDomainsService: MailDomainsService,
    private readonly suppressionService: SuppressionService,
    private readonly aiReplyService: AiReplyService,
    private readonly leadsService: LeadsService,
    private readonly workflowsService: WorkflowsService,
    private readonly mailService: MailService,
  ) {}

  // Bounce DSNs come back addressed to the VERP envelope-from we set on
  // every outbound send (bounce+<emailMessageId>@<domain> — see
  // MailQueueProcessor), so we recognize and short-circuit them here rather
  // than filing a bounce notification as if it were a customer message.
  // Classification is a best-effort text scan for standard DSN status
  // codes/phrases, not full RFC 3464 parsing — good enough to gate
  // suppression without pulling in a dedicated DSN-parsing dependency.
  private async tryProcessBounce(parsed: ParsedInboundEmail): Promise<boolean> {
    const bounceRecipient = parsed.to.find((addr) =>
      addr.split('@')[0]?.startsWith('bounce+'),
    );
    if (!bounceRecipient) return false;

    const emailMessageId = bounceRecipient
      .split('@')[0]
      .slice('bounce+'.length);
    const email = await this.emailMessageModel.findById(emailMessageId).exec();
    if (!email) {
      this.logger.warn(
        `Bounce DSN referenced unknown EmailMessage ${emailMessageId}`,
      );
      return true;
    }

    const body = `${parsed.text ?? ''} ${parsed.html ?? ''}`;
    const finalRecipient = body
      .match(/Final-Recipient:\s*rfc822;\s*(\S+)/i)?.[1]
      ?.replace(/[<>]/g, '');
    const bouncedAddress = finalRecipient ?? email.to[0];
    const isHard =
      /\b5\.\d\.\d\b|permanent failure|does not exist|user unknown|no such user/i.test(
        body,
      );

    email.status = 'bounced';
    await email.save();
    await this.mailService.recordEvent(email.userId, email.id, 'bounced', {
      bounceType: isHard ? 'hard' : 'soft',
      diagnosticCode: body.slice(0, 500),
    });

    if (isHard && bouncedAddress) {
      await this.suppressionService.add(
        email.userId,
        bouncedAddress,
        'hard_bounce',
        'Automatic — hard bounce DSN',
      );
    }
    return true;
  }

  async processInbound(parsed: ParsedInboundEmail): Promise<void> {
    if (await this.tryProcessBounce(parsed)) return;

    const existing = await this.inboundEmailModel
      .findOne({ messageId: parsed.messageId })
      .exec();
    if (existing) {
      this.logger.log(`Duplicate delivery of ${parsed.messageId}, skipping`);
      return;
    }

    let userId: string | undefined;
    let receivingAddress: string | undefined;
    let domainName = '';
    for (const addr of parsed.to) {
      const domainPart = addr.split('@')[1];
      if (!domainPart) continue;
      const domain =
        await this.mailDomainsService.findVerifiedByDomainName(domainPart);
      if (domain) {
        userId = domain.userId;
        receivingAddress = addr;
        domainName = domain.domain;
        break;
      }
    }

    if (!userId || !receivingAddress) {
      this.logger.warn(
        `No verified domain matched recipients [${parsed.to.join(', ')}] — discarding`,
      );
      return;
    }

    const dir = join(UPLOAD_ROOT, randomUUID());
    await mkdir(dir, { recursive: true });

    let rawStoragePath: string | undefined;
    if (parsed.raw) {
      rawStoragePath = join(dir, 'message.eml');
      await writeFile(rawStoragePath, parsed.raw);
    }

    const attachments = await Promise.all(
      (parsed.attachments ?? []).map(async (a) => {
        const storagePath = join(dir, a.filename);
        await writeFile(storagePath, a.content);
        return {
          filename: a.filename,
          contentType: a.contentType,
          sizeBytes: a.content.length,
          storagePath,
        };
      }),
    );

    const inboundEmail = await this.inboundEmailModel.create({
      userId,
      domain: domainName,
      messageId: parsed.messageId,
      from: parsed.from,
      to: parsed.to,
      subject: parsed.subject,
      text: parsed.text,
      html: parsed.html,
      inReplyTo: parsed.inReplyTo,
      references: parsed.references ?? [],
      attachments,
      rawStoragePath,
    });

    const settings = await this.aiReplyService.getAutoReplySettings(
      userId,
      'email',
    );
    const bodyForAi =
      parsed.text?.trim() ||
      (parsed.html ? stripHtml(parsed.html) : '') ||
      '(no content)';

    if (!settings.autoReply) {
      await this.inboundMessageModel.create({
        userId,
        channel: 'email',
        from: parsed.from,
        text: bodyForAi,
        status: 'processed',
        replyStatus: 'none',
        emailMetaId: inboundEmail.id,
      });
      return;
    }

    try {
      const result = await this.aiReplyService.generateReply(userId, bodyForAi);

      let leadId: string | undefined;
      if (result.interested) {
        const lead = await this.leadsService.createFromInbound(userId, {
          channel: 'email',
          from: parsed.from,
          text: bodyForAi,
        });
        leadId = (lead._id as { toString(): string }).toString();
      }

      let replyStatus: InboundMessageDocument['replyStatus'] =
        'pending_approval';
      let sentMessageId: string | undefined;
      if (settings.autoSend) {
        try {
          const sent = await this.mailService.send(userId, {
            from: receivingAddress,
            to: [parsed.from],
            subject: parsed.subject
              ? `Re: ${parsed.subject}`
              : 'Re: your message',
            text: result.reply,
          });
          replyStatus = 'auto_sent';
          sentMessageId = sent.id;
        } catch (err) {
          this.logger.warn(
            `Auto-send failed for reply to ${parsed.from}: ${err instanceof Error ? err.message : err}`,
          );
          replyStatus = 'pending_approval';
        }
      }

      const saved = await this.inboundMessageModel.create({
        userId,
        channel: 'email',
        from: parsed.from,
        text: bodyForAi,
        aiReplyText: result.reply,
        aiSentiment: result.sentiment,
        aiInDomain: result.inDomain,
        aiInterested: result.interested,
        aiProvider: result.provider,
        aiModel: result.model,
        status: 'processed',
        leadId,
        emailMetaId: inboundEmail.id,
        replyStatus,
        sentMessageId,
      });
      await this.workflowsService.runTriggersForEvent(
        userId,
        'ai_replied',
        saved,
      );
    } catch (err) {
      await this.inboundMessageModel.create({
        userId,
        channel: 'email',
        from: parsed.from,
        text: bodyForAi,
        status: 'error',
        errorMessage: err instanceof Error ? err.message : 'AI reply failed',
        emailMetaId: inboundEmail.id,
      });
    }
  }
}
