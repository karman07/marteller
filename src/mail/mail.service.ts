import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import {
  EmailMessage,
  EmailMessageDocument,
} from './schemas/email-message.schema';
import { EmailEvent, EmailEventDocument } from './schemas/email-event.schema';
import { Message, MessageDocument } from '../messages/schemas/message.schema';
import { MailDomainsService } from '../mail-core/mail-domains.service';
import { SuppressionService } from '../mail-core/suppression.service';
import { WalletService } from '../wallet/wallet.service';
import { PricingService } from '../messages/pricing.service';
import { SendEmailDto } from './dto/send-email.dto';
import { MailUsageService } from './mail-usage.service';
import { MAIL_OUTBOUND_QUEUE } from './mail-queue.module';

@Injectable()
export class MailService {
  constructor(
    @InjectModel(EmailMessage.name)
    private readonly model: Model<EmailMessageDocument>,
    @InjectModel(EmailEvent.name)
    private readonly eventModel: Model<EmailEventDocument>,
    // Direct model access, same reasoning used throughout this codebase
    // (InboxModule/WorkflowsService/LeadsService) — mirroring one row into
    // the generic ledger doesn't need the full MessagesModule (verification
    // gate/provider wiring built for the template-blast flow).
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    private readonly mailDomainsService: MailDomainsService,
    private readonly suppressionService: SuppressionService,
    private readonly walletService: WalletService,
    private readonly pricingService: PricingService,
    private readonly mailUsageService: MailUsageService,
    @InjectQueue(MAIL_OUTBOUND_QUEUE) private readonly queue: Queue,
  ) {}

  // The dedicated Mail send path — full MIME, queued, async. Returns as
  // soon as the job is durably queued; a background worker does the actual
  // send (see MailQueueProcessor).
  async send(userId: string, dto: SendEmailDto) {
    const fromDomain = dto.from.split('@')[1] ?? '';
    const domain = await this.mailDomainsService.getVerifiedDomainByName(
      userId,
      fromDomain,
    );

    const suppressedChecks = await Promise.all(
      dto.to.map((addr) => this.suppressionService.isSuppressed(userId, addr)),
    );
    const recipients = dto.to.filter((_, i) => !suppressedChecks[i]);
    if (recipients.length === 0) {
      throw new BadRequestException(
        'Every recipient on this send is suppressed (previously bounced or complained).',
      );
    }

    const costPaise = this.pricingService.estimate('email', {
      bodyLength: (dto.html ?? dto.text ?? '').length,
    });
    const { balancePaise } = await this.walletService.getBalance(userId);
    if (balancePaise < costPaise) {
      throw new BadRequestException(
        'Insufficient balance. Add funds to continue.',
      );
    }

    await this.mailUsageService.reserve(userId, 1);

    const messageId = `<${randomUUID()}@${domain.domain}>`;

    const relatedMessage = await this.messageModel.create({
      userId,
      channel: 'email',
      to: recipients.join(', '),
      status: 'queued',
      costPaise,
    });

    const emailMessage = await this.model.create({
      userId,
      messageId,
      domain: domain.domain,
      from: dto.from,
      to: recipients,
      cc: dto.cc ?? [],
      bcc: dto.bcc ?? [],
      subject: dto.subject,
      html: dto.html,
      text: dto.text,
      status: 'queued',
      costPaise,
      relatedMessageId: (
        relatedMessage._id as { toString(): string }
      ).toString(),
    });

    await this.recordEvent(userId, emailMessage.id, 'queued');
    await this.queue.add('send', { emailMessageId: emailMessage.id });

    return emailMessage;
  }

  async recordEvent(
    userId: string,
    emailMessageId: string,
    type: EmailEventDocument['type'],
    extra?: {
      bounceType?: 'hard' | 'soft';
      diagnosticCode?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.eventModel.create({ userId, emailMessageId, type, ...extra });
  }

  async list(userId: string, page = 1, limit = 20) {
    const filter = { userId };
    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, total, page, limit };
  }

  async get(userId: string, id: string) {
    const message = await this.model.findOne({ _id: id, userId }).exec();
    if (!message) throw new NotFoundException('Email not found');
    const events = await this.eventModel
      .find({ emailMessageId: id })
      .sort({ createdAt: 1 })
      .exec();
    return { message, events };
  }
}
