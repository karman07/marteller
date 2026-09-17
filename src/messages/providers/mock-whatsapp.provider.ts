import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  MessageProvider,
  ProviderSendParams,
  ProviderSendResult,
} from './provider.interface';

// Dev-level stand-in for a real WhatsApp Business API provider (e.g. Gupshup,
// Meta Cloud API, Twilio). Simulates network latency and always succeeds.
@Injectable()
export class MockWhatsappProvider implements MessageProvider {
  private readonly logger = new Logger('MockWhatsappProvider');

  async send(params: ProviderSendParams): Promise<ProviderSendResult> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    this.logger.log(
      `[mock] WhatsApp -> ${params.to}: ${params.body.slice(0, 60)}`,
    );
    return { providerMessageId: `wa_${randomUUID()}`, status: 'sent' };
  }
}
