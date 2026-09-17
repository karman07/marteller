import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SystemMailLogDocument = HydratedDocument<SystemMailLog>;

// Audit/debug trail for SystemMailService — internal platform notifications
// (e.g. verification approved/rejected) sent directly via
// MailTransportService, bypassing the tenant-facing MailService/EmailMessage
// pipeline entirely (see system-mail.service.ts for why). This is the only
// record of those sends existing anywhere.
@Schema({ timestamps: true })
export class SystemMailLog {
  @Prop({ required: true })
  to: string;

  @Prop({ required: true })
  subject: string;

  // Freeform identifier for what triggered this send, e.g.
  // 'verification_approved', 'verification_rejected' — not an enum, since
  // new system notifications will be added over time without needing a
  // schema migration each time.
  @Prop({ required: true, index: true })
  template: string;

  @Prop({ required: true, enum: ['sent', 'failed'] })
  status: 'sent' | 'failed';

  @Prop()
  error?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const SystemMailLogSchema = SchemaFactory.createForClass(SystemMailLog);
