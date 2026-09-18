import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Channel, WhatsappCategory } from '../templates/schemas/template.schema';
import { RateCard, RateCardDocument } from './schemas/rate-card.schema';
import { UpdateRateCardDto } from './dto/update-rate-card.dto';

@Injectable()
export class PricingService {
  constructor(
    @InjectModel(RateCard.name) private readonly model: Model<RateCardDocument>,
  ) {}

  // Lazily seeds the singleton rate card (schema defaults = the original
  // illustrative dev rates) on first access — same pattern
  // VerificationService.listFields() uses for its own singleton-ish
  // default config.
  async getRateCard(): Promise<RateCardDocument> {
    const existing = await this.model.findOne().exec();
    if (existing) return existing;
    return this.model.create({});
  }

  async updateRateCard(dto: UpdateRateCardDto): Promise<RateCardDocument> {
    return this.model
      .findOneAndUpdate({}, dto, { upsert: true, new: true, setDefaultsOnInsert: true })
      .exec();
  }

  // Pure calculation against an already-fetched rate card — batch sends
  // fetch the rate card once and call this per recipient, rather than
  // hitting the DB once per recipient (see MessagesService.send()).
  estimateFromRates(
    rates: RateCard,
    channel: Channel,
    opts: { category?: WhatsappCategory; bodyLength?: number } = {},
  ): number {
    if (channel === 'whatsapp') {
      const category = opts.category ?? 'marketing';
      if (category === 'utility') return rates.whatsappUtilityPaise;
      if (category === 'authentication') return rates.whatsappAuthenticationPaise;
      return rates.whatsappMarketingPaise;
    }
    if (channel === 'email') {
      return rates.emailPaise;
    }
    // sms
    const segments = Math.max(1, Math.ceil((opts.bodyLength ?? 0) / rates.smsSegmentLength));
    return segments * rates.smsPerSegmentPaise;
  }

  // Convenience for single-message call sites that don't already have a
  // rate card in hand.
  async estimate(
    channel: Channel,
    opts: { category?: WhatsappCategory; bodyLength?: number } = {},
  ): Promise<number> {
    const rates = await this.getRateCard();
    return this.estimateFromRates(rates, channel, opts);
  }

  async rateCard() {
    const rates = await this.getRateCard();
    return {
      whatsapp: {
        marketing: rates.whatsappMarketingPaise,
        utility: rates.whatsappUtilityPaise,
        authentication: rates.whatsappAuthenticationPaise,
      } satisfies Record<WhatsappCategory, number>,
      email: rates.emailPaise,
      sms: { perSegmentPaise: rates.smsPerSegmentPaise, segmentLength: rates.smsSegmentLength },
    };
  }
}
