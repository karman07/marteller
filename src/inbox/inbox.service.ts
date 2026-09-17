import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  InboundMessage,
  InboundMessageDocument,
} from './schemas/inbound-message.schema';
import { Message, MessageDocument } from '../messages/schemas/message.schema';
import type { Channel } from '../templates/schemas/template.schema';
import { SimulateInboundDto } from './dto/simulate-inbound.dto';
import { AiReplyService } from '../ai/ai-reply.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { LeadsService } from '../leads/leads.service';
import { MailService } from '../mail/mail.service';
import { MailDomainsService } from '../mail-core/mail-domains.service';
import { DEMO_THREADS, findDemoThread } from './inbox-demo-data';

type ConversationItem = {
  direction: 'in' | 'out';
  source: 'customer' | 'ai_reply' | 'sent_message';
  text: string;
  createdAt: Date;
  aiSentiment?: string;
  aiInDomain?: boolean;
  aiInterested?: boolean;
  status?: string;
  templateName?: string;
  // Set only on 'ai_reply' items — the InboundMessage id and its
  // approve/reject state, so the frontend can call
  // POST /inbox/:id/approve-reply|reject-reply directly from this view.
  id?: string;
  replyStatus?: string;
  sentMessageId?: string;
};

type ConversationThread = {
  channel: Channel;
  contact: string;
  lastAt: Date;
  lastPreview: string;
  messageCount: number;
};

@Injectable()
export class InboxService {
  constructor(
    @InjectModel(InboundMessage.name)
    private readonly model: Model<InboundMessageDocument>,
    // Direct model access, same reasoning as elsewhere in this codebase —
    // reading outbound send history doesn't need the full MessagesModule
    // (wallet/verification/provider wiring).
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    private readonly aiReplyService: AiReplyService,
    private readonly workflowsService: WorkflowsService,
    private readonly leadsService: LeadsService,
    private readonly mailService: MailService,
    private readonly mailDomainsService: MailDomainsService,
    private readonly config: ConfigService,
  ) {}

  private isDevBypassEnabled(): boolean {
    return (
      this.config.get<string>('NODE_ENV') !== 'production' &&
      this.config.get<string>('DEV_PHONE_AUTH_BYPASS') === 'true'
    );
  }

  list(userId: string) {
    return this.model
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
  }

  // No real inbound webhook is wired up (see InboundMessage schema comment) —
  // this is the honest stand-in: run the exact same pipeline a real webhook
  // would trigger, on a message you type in yourself.
  async simulate(userId: string, dto: SimulateInboundDto) {
    try {
      const result = await this.aiReplyService.generateReply(userId, dto.text);

      let leadId: string | undefined;
      if (result.interested) {
        const lead = await this.leadsService.createFromInbound(userId, {
          channel: dto.channel,
          from: dto.from,
          text: dto.text,
        });
        leadId = (lead._id as { toString(): string }).toString();
      }

      const saved = await this.model.create({
        userId,
        channel: dto.channel,
        from: dto.from,
        text: dto.text,
        aiReplyText: result.reply,
        aiSentiment: result.sentiment,
        aiInDomain: result.inDomain,
        aiInterested: result.interested,
        aiProvider: result.provider,
        aiModel: result.model,
        status: 'processed',
        leadId,
      });
      await this.workflowsService.runTriggersForEvent(
        userId,
        'ai_replied',
        saved,
      );
      return saved;
    } catch (err) {
      const saved = await this.model.create({
        userId,
        channel: dto.channel,
        from: dto.from,
        text: dto.text,
        status: 'error',
        errorMessage: err instanceof Error ? err.message : 'AI reply failed',
      });
      return saved;
    }
  }

  // Sends an AI-drafted reply that was held for approval (see
  // AiConfig.autoSendChannels and MailInboundService) — only meaningful for
  // email today, the one channel with a real outbound send path.
  async approveReply(userId: string, id: string) {
    const inbound = await this.model.findOne({ _id: id, userId }).exec();
    if (!inbound) throw new NotFoundException('Message not found');
    if (inbound.replyStatus !== 'pending_approval') {
      throw new BadRequestException('This reply is not awaiting approval');
    }
    if (inbound.channel !== 'email' || !inbound.aiReplyText) {
      throw new BadRequestException('No sendable reply on this message');
    }

    const domain = await this.mailDomainsService.getDefaultDomain(userId);
    const sent = await this.mailService.send(userId, {
      from: `${domain.defaultFromLocalPart}@${domain.domain}`,
      to: [inbound.from],
      subject: 'Re: your message',
      text: inbound.aiReplyText,
    });

    inbound.replyStatus = 'sent';
    inbound.sentMessageId = sent.id;
    await inbound.save();
    return inbound;
  }

  async rejectReply(userId: string, id: string) {
    const inbound = await this.model.findOne({ _id: id, userId }).exec();
    if (!inbound) throw new NotFoundException('Message not found');
    if (inbound.replyStatus !== 'pending_approval') {
      throw new BadRequestException('This reply is not awaiting approval');
    }
    inbound.replyStatus = 'rejected';
    await inbound.save();
    return inbound;
  }

  // One row per contact thread within this channel, newest activity first —
  // merges inbound messages with the templated sends MessagesService already
  // logs, since neither collection alone is "the conversation". Falls back
  // to sample data in dev when this channel genuinely has nothing yet.
  async listConversations(userId: string, channel: Channel) {
    const [inbound, outbound] = await Promise.all([
      this.model
        .find({ userId, channel })
        .sort({ createdAt: -1 })
        .limit(500)
        .exec(),
      this.messageModel
        .find({ userId, channel })
        .sort({ createdAt: -1 })
        .limit(500)
        .exec(),
    ]);

    const threads = new Map<string, ConversationThread>();
    const touch = (contact: string, at: Date, preview: string) => {
      const existing = threads.get(contact);
      if (!existing) {
        threads.set(contact, {
          channel,
          contact,
          lastAt: at,
          lastPreview: preview,
          messageCount: 1,
        });
        return;
      }
      existing.messageCount += 1;
      if (at > existing.lastAt) {
        existing.lastAt = at;
        existing.lastPreview = preview;
      }
    };

    for (const m of inbound) touch(m.from, m.createdAt, m.text);
    for (const m of outbound) {
      touch(
        m.to,
        m.createdAt,
        m.templateName ? `Sent: ${m.templateName}` : 'Sent a message',
      );
    }

    const items = Array.from(threads.values()).sort(
      (a, b) => b.lastAt.getTime() - a.lastAt.getTime(),
    );

    if (items.length > 0 || !this.isDevBypassEnabled()) {
      return { items, isDummyData: false };
    }

    const demoItems: ConversationThread[] = DEMO_THREADS[channel].map(
      (thread) => {
        const last = thread.messages[thread.messages.length - 1];
        return {
          channel,
          contact: thread.contact,
          lastAt: new Date(Date.now() - last.minutesAgo * 60_000),
          lastPreview: last.text,
          messageCount: thread.messages.length * 2,
        };
      },
    );
    return { items: demoItems, isDummyData: true };
  }

  async getConversation(userId: string, channel: Channel, contact: string) {
    const [inbound, outbound] = await Promise.all([
      this.model
        .find({ userId, channel, from: contact })
        .sort({ createdAt: 1 })
        .exec(),
      this.messageModel
        .find({ userId, channel, to: contact })
        .sort({ createdAt: 1 })
        .exec(),
    ]);

    if (
      inbound.length === 0 &&
      outbound.length === 0 &&
      this.isDevBypassEnabled()
    ) {
      const demo = findDemoThread(channel, contact);
      if (demo) {
        const items: ConversationItem[] = [];
        for (const m of demo.messages) {
          const at = new Date(Date.now() - m.minutesAgo * 60_000);
          items.push({
            direction: 'in',
            source: 'customer',
            text: m.text,
            createdAt: at,
            aiSentiment: m.sentiment,
            aiInDomain: m.inDomain,
            aiInterested: m.interested,
          });
          items.push({
            direction: 'out',
            source: 'ai_reply',
            text: m.reply,
            createdAt: new Date(at.getTime() + 1),
          });
        }
        return { channel, contact, items, isDummyData: true };
      }
    }

    const items: ConversationItem[] = [];

    for (const m of inbound) {
      const at = m.createdAt;
      items.push({
        direction: 'in',
        source: 'customer',
        text: m.text,
        createdAt: at,
        aiSentiment: m.aiSentiment,
        aiInDomain: m.aiInDomain,
        aiInterested: m.aiInterested,
      });
      if (m.aiReplyText) {
        // Same instant as the inbound message, nudged 1ms later so a stable
        // sort always keeps the AI's reply after what it's replying to.
        items.push({
          direction: 'out',
          source: 'ai_reply',
          text: m.aiReplyText,
          createdAt: new Date(at.getTime() + 1),
          id: m.id,
          replyStatus: m.replyStatus,
          sentMessageId: m.sentMessageId,
        });
      }
    }

    for (const m of outbound) {
      items.push({
        direction: 'out',
        source: 'sent_message',
        text: m.templateName ? `Template: ${m.templateName}` : 'Message sent',
        createdAt: m.createdAt,
        status: m.status,
        templateName: m.templateName,
      });
    }

    items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return { channel, contact, items, isDummyData: false };
  }
}
