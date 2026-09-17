import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  MailUsageCounter,
  MailUsageCounterDocument,
} from './schemas/mail-usage-counter.schema';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class MailUsageService {
  constructor(
    @InjectModel(MailUsageCounter.name)
    private readonly model: Model<MailUsageCounterDocument>,
    private readonly config: ConfigService,
  ) {}

  private dailyLimit(): number {
    return Number(this.config.get<string>('MAIL_DEFAULT_DAILY_LIMIT') ?? 500);
  }

  // Atomic increment-with-cap, mirroring WalletService.debit's $gte guard —
  // a burst of concurrent sends can never push the count past the limit.
  async reserve(userId: string, count = 1) {
    const limit = this.dailyLimit();
    const periodKey = todayKey();

    const updated = await this.model
      .findOneAndUpdate(
        { userId, periodKey, sentCount: { $lte: limit - count } },
        { $inc: { sentCount: count }, $setOnInsert: { userId, periodKey } },
        { upsert: true, new: true },
      )
      .exec();

    if (!updated) {
      throw new BadRequestException(
        `Daily sending limit reached (${limit} emails/day). Try again tomorrow.`,
      );
    }
    return { sentCount: updated.sentCount, limit };
  }
}
