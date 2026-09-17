import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MailDomainsService } from '../../mail-core/mail-domains.service';
import { SuppressionService } from '../../mail-core/suppression.service';
import { MailTransportService } from '../../mail-core/mail-transport.service';
import {
  MessageProvider,
  ProviderSendParams,
  ProviderSendResult,
} from './provider.interface';

// Real email delivery for the generic template-blast path (`/messages/send`,
// the existing "Send" tab under the Email channel) — goes out through the
// same self-hosted relay/DKIM machinery as the dedicated Mail module, via
// the user's default verified sending domain. Only tracks a simple
// sent/failed status on the generic Message row; the richer per-message
// lifecycle (bounces, opens, clicks) lives on EmailMessage/EmailEvent for
// mail sent through the dedicated Mail API — see src/mail.
@Injectable()
export class SmtpRelayEmailProvider implements MessageProvider {
  private readonly logger = new Logger(SmtpRelayEmailProvider.name);

  constructor(
    private readonly mailDomainsService: MailDomainsService,
    private readonly suppressionService: SuppressionService,
    private readonly mailTransportService: MailTransportService,
  ) {}

  async send(params: ProviderSendParams): Promise<ProviderSendResult> {
    if (!params.userId) {
      return {
        providerMessageId: '',
        status: 'failed',
        errorMessage: 'No sending account resolved',
      };
    }

    try {
      if (
        await this.suppressionService.isSuppressed(params.userId, params.to)
      ) {
        return {
          providerMessageId: '',
          status: 'failed',
          errorMessage: 'Recipient is suppressed',
        };
      }

      const domain = await this.mailDomainsService.getDefaultDomain(
        params.userId,
      );
      const dkim = this.mailDomainsService.getDkimForSend(domain);
      const from = `${domain.defaultFromLocalPart}@${domain.domain}`;
      const messageId = `<${randomUUID()}@${domain.domain}>`;

      const result = await this.mailTransportService.send({
        from,
        to: [params.to],
        subject: params.subject ?? '(no subject)',
        html: params.body,
        messageId,
        dkim,
      });

      if (result.rejected.length > 0) {
        return {
          providerMessageId: messageId,
          status: 'failed',
          errorMessage: `Rejected: ${result.rejected.join(', ')}`,
        };
      }
      return { providerMessageId: messageId, status: 'sent' };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Email send failed';
      this.logger.warn(`Send to ${params.to} failed: ${errorMessage}`);
      return { providerMessageId: '', status: 'failed', errorMessage };
    }
  }
}
