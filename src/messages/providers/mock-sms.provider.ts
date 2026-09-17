import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  MessageProvider,
  ProviderSendParams,
  ProviderSendResult,
} from './provider.interface';

// Dev-level stand-in for a real SMS provider (e.g. MSG91, Twilio).
@Injectable()
export class MockSmsProvider implements MessageProvider {
  private readonly logger = new Logger('MockSmsProvider');

  async send(params: ProviderSendParams): Promise<ProviderSendResult> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    this.logger.log(`[mock] SMS -> ${params.to}: ${params.body.slice(0, 60)}`);
    return { providerMessageId: `sms_${randomUUID()}`, status: 'sent' };
  }
}
