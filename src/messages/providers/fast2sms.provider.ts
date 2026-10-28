import { Injectable, Logger } from '@nestjs/common';
import { SmsCredentialsService } from '../../sms-credentials/sms-credentials.service';
import {
  MessageProvider,
  ProviderSendParams,
  ProviderSendResult,
} from './provider.interface';
import { normalizeIndianMobileNumber } from './phone-number.util';

const FAST2SMS_ENDPOINT = 'https://www.fast2sms.com/dev/bulkV2';

type Fast2SmsResponse = {
  return: boolean;
  request_id?: string;
  // Fast2SMS is inconsistent about this field's shape: an array of lines
  // on success, a single string on most error responses — never trust
  // either shape alone, see extractMessage() below.
  message?: string | string[];
  status_code?: number;
};

function extractMessage(message: string | string[] | undefined): string | undefined {
  if (Array.isArray(message)) return message.join(', ');
  return message;
}

// Fast2SMS (fast2sms.com) delivers via India-registered numbers only.
// Credentials are per-user (see SmsCredentialsService) and provisioned by
// sales/admin, not the customer — resolved here from params.userId the
// same way SmtpRelayEmailProvider resolves a per-user sending domain.
@Injectable()
export class Fast2SmsProvider implements MessageProvider {
  private readonly logger = new Logger(Fast2SmsProvider.name);

  constructor(private readonly smsCredentialsService: SmsCredentialsService) {}

  async send(params: ProviderSendParams): Promise<ProviderSendResult> {
    if (!params.userId) {
      return {
        providerMessageId: '',
        status: 'failed',
        errorMessage: 'No sending account resolved',
      };
    }

    const credential = await this.smsCredentialsService.findByUserId(params.userId);
    if (!credential) {
      return {
        providerMessageId: '',
        status: 'failed',
        errorMessage: 'No SMS provider configured for this account — contact your account manager.',
      };
    }

    const number = normalizeIndianMobileNumber(params.to);
    if (!number) {
      return {
        providerMessageId: '',
        status: 'failed',
        errorMessage: `"${params.to}" isn't a valid 10-digit Indian mobile number`,
      };
    }

    try {
      const body = new URLSearchParams({
        route: credential.route,
        message: params.body,
        numbers: number,
        ...(credential.senderId ? { sender_id: credential.senderId } : {}),
        flash: '0',
      });

      const res = await fetch(FAST2SMS_ENDPOINT, {
        method: 'POST',
        headers: {
          authorization: credential.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });

      const data = (await res.json()) as Fast2SmsResponse;

      if (!res.ok || !data.return) {
        const errorMessage = extractMessage(data.message) || `SMS request failed (${res.status})`;
        this.logger.warn(`Send to ${params.to} failed: ${errorMessage}`);
        return { providerMessageId: '', status: 'failed', errorMessage };
      }

      return {
        providerMessageId: data.request_id ?? '',
        status: 'sent',
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'SMS send failed';
      this.logger.warn(`Send to ${params.to} failed: ${errorMessage}`);
      return { providerMessageId: '', status: 'failed', errorMessage };
    }
  }
}
