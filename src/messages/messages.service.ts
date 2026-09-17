import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument, MessageStatus } from './schemas/message.schema';
import type { Channel } from '../templates/schemas/template.schema';
import { TemplatesService } from '../templates/templates.service';
import { VerificationService } from '../verification/verification.service';
import { WalletService } from '../wallet/wallet.service';
import { PlanEnforcementService } from '../billing/plan-enforcement.service';
import { PricingService } from './pricing.service';
import { SendMessageDto } from './dto/send-message.dto';
import {
  EMAIL_PROVIDER,
  SMS_PROVIDER,
  WHATSAPP_PROVIDER,
} from './providers/provider.interface';
import type { MessageProvider } from './providers/provider.interface';

function render(text: string | undefined, variables: Record<string, string>): string {
  if (!text) return '';
  return text.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key) => variables[key] ?? '');
}

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private readonly model: Model<MessageDocument>,
    private readonly templatesService: TemplatesService,
    private readonly verificationService: VerificationService,
    private readonly walletService: WalletService,
    private readonly planEnforcementService: PlanEnforcementService,
    private readonly pricingService: PricingService,
    private readonly config: ConfigService,
    @Inject(WHATSAPP_PROVIDER) private readonly whatsappProvider: MessageProvider,
    @Inject(EMAIL_PROVIDER) private readonly emailProvider: MessageProvider,
    @Inject(SMS_PROVIDER) private readonly smsProvider: MessageProvider,
  ) {}

  private providerFor(channel: Channel): MessageProvider {
    if (channel === 'whatsapp') return this.whatsappProvider;
    if (channel === 'email') return this.emailProvider;
    return this.smsProvider;
  }

  async send(userId: string, dto: SendMessageDto) {
    const verification = await this.verificationService.findByUserId(userId);
    if (verification.status !== 'verified') {
      throw new ForbiddenException('Complete business verification before sending messages');
    }

    const template = await this.templatesService.findOne(userId, dto.templateId);
    const provider = this.providerFor(template.channel);
    const sharedVariables = dto.variables ?? {};

    // Render per-recipient — a contact's own name (etc.) can override the
    // shared variables just for their message, so a bulk send is genuinely
    // personalized rather than sending everyone the same substituted text.
    const perRecipient = dto.recipients.map((to) => {
      const variables = { ...sharedVariables, ...(dto.recipientVariables?.[to] ?? {}) };
      const body = render(template.body, variables);
      const subject = template.channel === 'email' ? render(template.subject, variables) : undefined;
      const costPaise = this.pricingService.estimate(template.channel, {
        category: template.category,
        bodyLength: body.length,
      });
      return { to, variables, body, subject, costPaise };
    });

    const totalCostPaise = perRecipient.reduce((sum, r) => sum + r.costPaise, 0);

    // Try to cover the whole batch out of the plan allowance first — an
    // all-or-nothing reservation (not per-recipient) so a bulk send never
    // ends up half-billed-to-plan/half-billed-to-wallet. If the allowance
    // can't fit the full batch, it falls through to ordinary wallet billing
    // for the entire batch instead.
    const coveredByPlan = await this.planEnforcementService.checkAndReserve(
      userId,
      template.channel,
      perRecipient.length,
    );

    if (!coveredByPlan) {
      const { balancePaise } = await this.walletService.getBalance(userId);
      if (balancePaise < totalCostPaise) {
        throw new BadRequestException('Insufficient balance. Add funds to continue.');
      }
    }

    const results = await Promise.all(
      perRecipient.map(async (r) => {
        const result = await provider.send({ to: r.to, subject: r.subject, body: r.body, userId });
        return this.model.create({
          userId,
          channel: template.channel,
          templateId: dto.templateId,
          templateName: template.name,
          to: r.to,
          variables: r.variables,
          status: result.status,
          providerMessageId: result.providerMessageId,
          errorMessage: result.errorMessage,
          costPaise: r.costPaise,
        });
      }),
    );

    const actualCostPaise = results.reduce((sum, r) => sum + r.costPaise, 0);
    if (!coveredByPlan && actualCostPaise > 0) {
      const channelLabel = template.channel === 'whatsapp' ? 'WhatsApp' : template.channel === 'email' ? 'Email' : 'SMS';
      await this.walletService.debit(
        userId,
        actualCostPaise,
        `${results.length} ${channelLabel} message${results.length === 1 ? '' : 's'} — ${template.name}`,
      );
    }

    return {
      sent: results.filter((r) => r.status === 'sent').length,
      failed: results.filter((r) => r.status === 'failed').length,
      totalCostPaise: results.reduce((sum, r) => sum + r.costPaise, 0),
      messages: results,
    };
  }

  async list(userId: string, channel?: Channel, page = 1, limit = 20) {
    const filter = { userId, ...(channel ? { channel } : {}) };
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

  async summary(userId: string, channel?: Channel, days = 14) {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const channelFilter = channel ? { channel } : {};

    const [dailyByChannel, spendByChannel, totals, recent, statusBreakdown] = await Promise.all([
      this.model.aggregate([
        { $match: { userId, createdAt: { $gte: since }, ...channelFilter } },
        {
          $group: {
            _id: {
              day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              channel: '$channel',
            },
            count: { $sum: 1 },
          },
        },
      ]),
      this.model.aggregate([
        { $match: { userId, createdAt: { $gte: monthStart }, ...channelFilter } },
        { $group: { _id: '$channel', costPaise: { $sum: '$costPaise' } } },
      ]),
      this.model.aggregate([
        { $match: { userId, createdAt: { $gte: since }, ...channelFilter } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            delivered: {
              $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered']] }, 1, 0] },
            },
          },
        },
      ]),
      this.model
        .find({ userId, ...channelFilter })
        .sort({ createdAt: -1 })
        .limit(8)
        .exec(),
      this.model.aggregate([
        { $match: { userId, createdAt: { $gte: since }, ...channelFilter } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const totalsRow = totals[0] ?? { total: 0, delivered: 0 };
    const deliveryRate = totalsRow.total > 0 ? (totalsRow.delivered / totalsRow.total) * 100 : 0;

    return {
      dailyByChannel: dailyByChannel.map((row) => ({
        day: row._id.day,
        channel: row._id.channel,
        count: row.count,
      })),
      spendByChannel: spendByChannel.map((row) => ({
        channel: row._id as Channel,
        costPaise: row.costPaise,
      })),
      messagesInRange: totalsRow.total,
      days,
      deliveryRate,
      recent,
      statusBreakdown: statusBreakdown.map((row) => ({
        status: row._id as MessageStatus,
        count: row.count as number,
      })),
    };
  }

  // Dev-only: backfills realistic-looking historical message logs so a fresh
  // account's dashboard isn't empty while exploring the UI. Never touches the
  // wallet — this is cosmetic demo data, not a real send.
  async seedDemoData(userId: string) {
    const isDevBypassEnabled =
      this.config.get<string>('NODE_ENV') !== 'production' &&
      this.config.get<string>('DEV_PHONE_AUTH_BYPASS') === 'true';
    if (!isDevBypassEnabled) {
      throw new ForbiddenException('Demo data seeding is disabled');
    }

    const templates = await this.templatesService.list(userId);
    const byChannel: Record<Channel, typeof templates> = {
      whatsapp: templates.filter((t) => t.channel === 'whatsapp'),
      email: templates.filter((t) => t.channel === 'email'),
      sms: templates.filter((t) => t.channel === 'sms'),
    };

    const sampleNames = ['Priya', 'Rahul', 'Ananya', 'Vikram', 'Sneha', 'Arjun', 'Kavya', 'Rohan'];
    const docs: Record<string, unknown>[] = [];

    for (const channel of ['whatsapp', 'email', 'sms'] as Channel[]) {
      const channelTemplates = byChannel[channel];
      if (channelTemplates.length === 0) continue;

      const count = 15 + Math.floor(Math.random() * 10);
      for (let i = 0; i < count; i++) {
        const template = channelTemplates[Math.floor(Math.random() * channelTemplates.length)];
        const daysAgo = Math.floor(Math.random() * 30);
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - daysAgo);
        createdAt.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));

        const statusRoll = Math.random();
        const status = statusRoll < 0.85 ? 'delivered' : statusRoll < 0.95 ? 'sent' : 'failed';
        const name = sampleNames[Math.floor(Math.random() * sampleNames.length)];
        const to =
          channel === 'email'
            ? `${name.toLowerCase()}@example.com`
            : `+91${9000000000 + Math.floor(Math.random() * 99999999)}`;

        const costPaise = this.pricingService.estimate(channel, {
          category: template.category,
          bodyLength: template.body.length,
        });

        docs.push({
          userId,
          channel,
          templateId: template._id,
          templateName: template.name,
          to,
          variables: { name },
          status,
          providerMessageId: `demo_${channel}_${Date.now()}_${i}`,
          costPaise,
          createdAt,
          updatedAt: createdAt,
        });
      }
    }

    if (docs.length > 0) await this.model.insertMany(docs);
    return { inserted: docs.length };
  }
}
