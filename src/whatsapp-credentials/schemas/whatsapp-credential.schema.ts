import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WhatsAppCredentialDocument = HydratedDocument<WhatsAppCredential>;

// One Fast2SMS WhatsApp config per user — deliberately not something the
// customer sets up themselves: sales/admin provision it on their behalf
// (see WhatsAppCredentialsService), same "we configure it for them" model
// this session already used for SmsCredential. A separate API key from
// the SmsCredential's — WhatsApp and SMS are billed/managed as distinct
// products on Fast2SMS's side even under one account. Only one config per
// user is kept, not a history — configuring again overwrites in place.
@Schema({ timestamps: true })
export class WhatsAppCredential {
  @Prop({ required: true, unique: true, index: true })
  userId: string;

  // Fast2SMS's id for this account's registered WhatsApp Business number —
  // passed as `phone_number_id` on every send.
  @Prop({ required: true })
  phoneNumberId: string;

  // Fast2SMS API key for the WhatsApp product (see the Dev API section of
  // the Fast2SMS dashboard) — sent as the `authorization` header.
  @Prop({ required: true })
  apiKey: string;

  // WhatsApp Business Account id — required for the template-submission
  // and approval-status APIs (WhatsAppTemplateSubmissionService), distinct
  // from phoneNumberId. Optional on the credential itself since sending
  // only needs phoneNumberId + apiKey; without it, auto template
  // submission is skipped and templates fall to the staff approval queue.
  @Prop()
  wabaId?: string;

  // The sales rep or admin who last set this — an audit trail for "who
  // configured this account's WhatsApp," since it's staff-provisioned
  // rather than self-service.
  @Prop()
  configuredByUserId?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const WhatsAppCredentialSchema = SchemaFactory.createForClass(WhatsAppCredential);
