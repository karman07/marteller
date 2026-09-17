import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job } from 'bullmq';
import {
  EmailMessage,
  EmailMessageDocument,
} from './schemas/email-message.schema';
import { Message, MessageDocument } from '../messages/schemas/message.schema';
import { MailDomainsService } from '../mail-core/mail-domains.service';
import { SuppressionService } from '../mail-core/suppression.service';
import { MailTransportService } from '../mail-core/mail-transport.service';
import { WalletService } from '../wallet/wallet.service';
import { MailService } from './mail.service';
import { MAIL_OUTBOUND_QUEUE } from './mail-queue.module';

type SendJobData = { emailMessageId: string };

// Two failure classes, handled differently:
//  - permanent (suppressed recipient, domain no longer verified): resolve
//    without throwing, so BullMQ doesn't retry something that can never
//    succeed.
//  - transient (relay unreachable, temporary SMTP error): rethrow, so
//    BullMQ's configured backoff (see MailQueueModule) retries it — actual
//    internet-delivery retries beyond our local relay hop are Postfix's job.
@Processor(MAIL_OUTBOUND_QUEUE)
export class MailQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(MailQueueProcessor.name);

  constructor(
    @InjectModel(EmailMessage.name)
    private readonly model: Model<EmailMessageDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    private readonly mailDomainsService: MailDomainsService,
    private readonly suppressionService: SuppressionService,
    private readonly mailTransportService: MailTransportService,
    private readonly walletService: WalletService,
    private readonly mailService: MailService,
  ) {
    super();
  }

  async process(job: Job<SendJobData>): Promise<void> {
    const email = await this.model.findById(job.data.emailMessageId).exec();
    if (!email) return;

    const stillSuppressed = await Promise.all(
      email.to.map((addr) =>
        this.suppressionService.isSuppressed(email.userId, addr),
      ),
    );
    const liveRecipients = email.to.filter((_, i) => !stillSuppressed[i]);
    if (liveRecipients.length === 0) {
      await this.finish(
        email,
        'suppressed',
        'All recipients suppressed since queueing',
      );
      return;
    }

    const domain = await this.mailDomainsService
      .getVerifiedDomainByName(email.userId, email.domain)
      .catch(() => null);
    if (!domain) {
      await this.finish(
        email,
        'failed',
        `Sending domain "${email.domain}" is no longer verified`,
      );
      return;
    }
    const dkim = this.mailDomainsService.getDkimForSend(domain);

    email.attempts += 1;
    email.status = 'sending';
    await email.save();
    await this.mailService.recordEvent(email.userId, email.id, 'sending');

    try {
      const result = await this.mailTransportService.send({
        from: email.from,
        to: liveRecipients,
        cc: email.cc,
        bcc: email.bcc,
        subject: email.subject,
        html: email.html,
        text: email.text,
        messageId: email.messageId,
        dkim,
        envelopeFrom: `bounce+${email.id}@${domain.domain}`,
      });

      if (result.rejected.length === liveRecipients.length) {
        await this.finish(
          email,
          'failed',
          `Rejected by relay: ${result.rejected.join(', ')}`,
        );
        return;
      }

      email.sentAt = new Date();
      await this.finish(email, 'sent');
      if (!email.withinPlanAllowance) {
        await this.walletService.debit(
          email.userId,
          email.costPaise,
          `Email — ${email.subject}`,
          email.relatedMessageId,
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Relay handoff failed';
      const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      if (isFinalAttempt) {
        await this.finish(email, 'failed', message);
        return;
      }
      this.logger.warn(
        `Attempt ${job.attemptsMade + 1} failed for ${email.messageId}: ${message}`,
      );
      throw err; // let BullMQ retry with backoff
    }
  }

  private async finish(
    email: EmailMessageDocument,
    status: EmailMessageDocument['status'],
    error?: string,
  ) {
    email.status = status;
    email.lastError = error;
    await email.save();

    if (email.relatedMessageId) {
      await this.messageModel
        .updateOne(
          { _id: email.relatedMessageId },
          {
            status: status === 'sent' ? 'sent' : 'failed',
            errorMessage: error,
            providerMessageId: email.messageId,
          },
        )
        .exec();
    }

    await this.mailService.recordEvent(
      email.userId,
      email.id,
      status === 'sent' ? 'sent' : 'failed',
      {
        diagnosticCode: error,
      },
    );
  }
}
