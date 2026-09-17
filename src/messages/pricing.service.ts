import { Injectable } from '@nestjs/common';
import { Channel, WhatsappCategory } from '../templates/schemas/template.schema';

// Flat, illustrative dev-level rates in paise (1 INR = 100 paise). Loosely
// modeled on real Indian WhatsApp Business API conversation pricing tiers.
// Swap for real provider rate cards once a live provider is wired up.
const WHATSAPP_RATES_PAISE: Record<WhatsappCategory, number> = {
  marketing: 88,
  utility: 35,
  authentication: 35,
};

const EMAIL_RATE_PAISE = 10;
const SMS_RATE_PAISE_PER_SEGMENT = 18;
const SMS_SEGMENT_LENGTH = 160;

@Injectable()
export class PricingService {
  estimate(channel: Channel, opts: { category?: WhatsappCategory; bodyLength?: number } = {}) {
    if (channel === 'whatsapp') {
      return WHATSAPP_RATES_PAISE[opts.category ?? 'marketing'];
    }
    if (channel === 'email') {
      return EMAIL_RATE_PAISE;
    }
    // sms
    const segments = Math.max(1, Math.ceil((opts.bodyLength ?? 0) / SMS_SEGMENT_LENGTH));
    return segments * SMS_RATE_PAISE_PER_SEGMENT;
  }

  rateCard() {
    return {
      whatsapp: WHATSAPP_RATES_PAISE,
      email: EMAIL_RATE_PAISE,
      sms: { perSegmentPaise: SMS_RATE_PAISE_PER_SEGMENT, segmentLength: SMS_SEGMENT_LENGTH },
    };
  }
}
