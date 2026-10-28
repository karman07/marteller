import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppCredentialsService } from '../../whatsapp-credentials/whatsapp-credentials.service';
import { WhatsAppTemplateMappingService } from '../../whatsapp-credentials/whatsapp-template-mapping.service';
import { TemplatesService } from '../../templates/templates.service';
import {
  MessageProvider,
  ProviderSendParams,
  ProviderSendResult,
} from './provider.interface';
import { normalizeIndianMobileNumber } from './phone-number.util';

const FAST2SMS_WHATSAPP_ENDPOINT = 'https://www.fast2sms.com/dev/whatsapp';

type Fast2SmsWhatsAppResponse = {
  status: boolean;
  message?: string;
  request_id?: string;
};

// Fast2SMS's WhatsApp product (fast2sms.com/help/whatsapp-message-api) —
// NOT Meta's Graph API directly. Credentials are per-user (see
// WhatsAppCredentialsService) and provisioned by sales/admin, same model
// as Fast2SmsProvider for SMS.
//
// Unlike SMS/Email, this can't send from `params.body` alone: Fast2SMS
// requires its own `message_id`, referencing a template pre-approved
// inside that tenant's Fast2SMS panel (via a Facebook-login flow on their
// side) — never our Template._id. Since templates can be shared
// (isSystem) across tenants but each tenant approves "the same" template
// separately in their own Fast2SMS account, the message_id mapping is
// per-tenant (WhatsAppTemplateMappingService), not a field on Template.
@Injectable()
export class Fast2SmsWhatsAppProvider implements MessageProvider {
  private readonly logger = new Logger(Fast2SmsWhatsAppProvider.name);

  constructor(
    private readonly whatsappCredentialsService: WhatsAppCredentialsService,
    private readonly whatsappTemplateMappingService: WhatsAppTemplateMappingService,
    private readonly templatesService: TemplatesService,
  ) {}

  async send(params: ProviderSendParams): Promise<ProviderSendResult> {
    if (!params.userId || !params.templateId) {
      return {
        providerMessageId: '',
        status: 'failed',
        errorMessage: 'No sending account or template resolved',
      };
    }

    const credential = await this.whatsappCredentialsService.findByUserId(params.userId);
    if (!credential) {
      return {
        providerMessageId: '',
        status: 'failed',
        errorMessage: 'No WhatsApp provider configured for this account — contact your account manager.',
      };
    }

    const mapping = await this.whatsappTemplateMappingService.getMapping(
      params.userId,
      params.templateId,
    );
    if (!mapping || mapping.status === 'pending') {
      return {
        providerMessageId: '',
        status: 'failed',
        errorMessage: 'This WhatsApp template is still pending approval — it will be ready to send once approved.',
      };
    }
    if (mapping.status === 'rejected' || !mapping.providerMessageId) {
      return {
        providerMessageId: '',
        status: 'failed',
        errorMessage: mapping.rejectionReason
          ? `This WhatsApp template was not approved: ${mapping.rejectionReason}`
          : 'This WhatsApp template was not approved.',
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

    // Fast2SMS's variables_values is positional, not named — the
    // template's own `.variables` order (first-appearance order in
    // header/body/footer) is the only ordering this app has, so it's
    // trusted to match the order the tenant approved on Fast2SMS's side.
    let template;
    try {
      template = await this.templatesService.findOne(params.userId, params.templateId);
    } catch {
      return { providerMessageId: '', status: 'failed', errorMessage: 'Template not found' };
    }
    const variablesValues = template.variables.map((v) => params.variables?.[v] ?? '').join('|');

    try {
      const query = new URLSearchParams({
        message_id: mapping.providerMessageId,
        phone_number_id: credential.phoneNumberId,
        numbers: number,
        ...(variablesValues ? { variables_values: variablesValues } : {}),
      });

      const res = await fetch(`${FAST2SMS_WHATSAPP_ENDPOINT}?${query.toString()}`, {
        headers: { authorization: credential.apiKey },
      });

      const data = (await res.json()) as Fast2SmsWhatsAppResponse;

      if (!res.ok || !data.status) {
        const errorMessage = data.message || `WhatsApp send failed (${res.status})`;
        this.logger.warn(`Send to ${params.to} failed: ${errorMessage}`);
        return { providerMessageId: '', status: 'failed', errorMessage };
      }

      return {
        providerMessageId: data.request_id ?? '',
        status: 'sent',
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'WhatsApp send failed';
      this.logger.warn(`Send to ${params.to} failed: ${errorMessage}`);
      return { providerMessageId: '', status: 'failed', errorMessage };
    }
  }
}
