import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EmailEventType =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'deferred'
  | 'bounced'
  | 'complained'
  | 'opened'
  | 'clicked'
  | 'failed';

export type BounceType = 'hard' | 'soft';
export type EmailEventDocument = HydratedDocument<EmailEvent>;

// Append-only timeline for a single EmailMessage — what MessagesService's
// flat status field can't express (a message goes through several states,
// and dashboard analytics/debugging need the history, not just the latest).
@Schema({ timestamps: true })
export class EmailEvent {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  emailMessageId: string;

  @Prop({
    enum: [
      'queued',
      'sending',
      'sent',
      'delivered',
      'deferred',
      'bounced',
      'complained',
      'opened',
      'clicked',
      'failed',
    ],
    required: true,
  })
  type: EmailEventType;

  @Prop({ enum: ['hard', 'soft'] })
  bounceType?: BounceType;

  @Prop()
  diagnosticCode?: string;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}

export const EmailEventSchema = SchemaFactory.createForClass(EmailEvent);
