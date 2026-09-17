import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EmailMessageStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'bounced'
  | 'failed'
  | 'suppressed';

export type EmailMessageDocument = HydratedDocument<EmailMessage>;

@Schema({ _id: false })
export class EmailAttachmentMeta {
  @Prop({ required: true })
  filename: string;

  @Prop()
  contentType?: string;

  @Prop({ required: true })
  sizeBytes: number;

  // Path on disk under uploads/mail-attachments/ — same convention as
  // templates/verification/profile-photos (see uploads/ in backend root).
  @Prop({ required: true })
  storagePath: string;
}

const EmailAttachmentMetaSchema =
  SchemaFactory.createForClass(EmailAttachmentMeta);

// The rich outbound record for the dedicated Mail API/dashboard/SMTP
// submission paths — attachments, CC/BCC, full lifecycle. Deliberately
// separate from the generic Message schema (src/messages), which stays the
// simple cross-channel ledger used by unified inbox/summary views; this
// links back to it via relatedMessageId rather than duplicating its role.
@Schema({ timestamps: true })
export class EmailMessage {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, unique: true })
  messageId: string;

  @Prop({ required: true })
  domain: string;

  @Prop()
  credentialId?: string;

  @Prop({ required: true })
  from: string;

  @Prop({ type: [String], required: true })
  to: string[];

  @Prop({ type: [String], default: [] })
  cc: string[];

  @Prop({ type: [String], default: [] })
  bcc: string[];

  @Prop({ required: true })
  subject: string;

  @Prop()
  html?: string;

  @Prop()
  text?: string;

  @Prop({ type: [EmailAttachmentMetaSchema], default: [] })
  attachments: EmailAttachmentMeta[];

  @Prop({
    enum: [
      'queued',
      'sending',
      'sent',
      'delivered',
      'bounced',
      'failed',
      'suppressed',
    ],
    default: 'queued',
    index: true,
  })
  status: EmailMessageStatus;

  @Prop({ default: 0 })
  attempts: number;

  @Prop()
  lastError?: string;

  @Prop({ required: true })
  costPaise: number;

  // Set once at enqueue time by PlanEnforcementService and only ever READ
  // (never re-decided) at debit time in MailQueueProcessor — the balance
  // check happens synchronously in MailService.send(), but the actual
  // wallet debit happens later, asynchronously, in the queue worker. If
  // "within plan" were re-derived at debit time instead of persisted here,
  // a message could be judged differently between the two moments under
  // concurrent sends, causing double-charging or double-counting.
  @Prop({ default: false })
  withinPlanAllowance: boolean;

  @Prop()
  relatedMessageId?: string;

  @Prop()
  sentAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const EmailMessageSchema = SchemaFactory.createForClass(EmailMessage);

EmailMessageSchema.index({ userId: 1, createdAt: -1 });
EmailMessageSchema.index({ userId: 1, status: 1 });
