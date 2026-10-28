// The seam a real provider (Gupshup/Twilio for WhatsApp & SMS, SendGrid/SES for
// email) plugs into. Nothing outside this folder should ever talk to a
// provider directly — MessagesService only knows this interface.
export type ProviderSendResult = {
  providerMessageId: string;
  status: 'sent' | 'failed';
  errorMessage?: string;
};

export type ProviderSendParams = {
  to: string;
  subject?: string;
  body: string;
  // Optional — set by MessagesService so a real provider (e.g. the email
  // provider) can resolve per-user identity (sending domain, credentials)
  // rather than sending from one shared identity for every account. Mock
  // providers ignore it.
  userId?: string;
  // Optional — only the Fast2SMS WhatsApp provider reads these. It can't
  // work off `body` alone: Fast2SMS needs its own per-tenant message_id
  // (resolved from templateId via WhatsAppTemplateMappingService) and the
  // raw variable values in the original template's positional order,
  // not a pre-rendered string. Email/SMS providers ignore both.
  templateId?: string;
  variables?: Record<string, string>;
};

export interface MessageProvider {
  send(params: ProviderSendParams): Promise<ProviderSendResult>;
}

export const WHATSAPP_PROVIDER = 'WHATSAPP_PROVIDER';
export const EMAIL_PROVIDER = 'EMAIL_PROVIDER';
export const SMS_PROVIDER = 'SMS_PROVIDER';
