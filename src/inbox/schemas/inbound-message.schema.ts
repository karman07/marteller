import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  CHANNELS,
  type Channel,
} from '../../templates/schemas/template.schema';
import { AI_SENTIMENTS, type AiSentiment } from '../../ai/ai-reply.service';

export type InboundMessageStatus = 'processed' | 'error';
export type ReplyStatus =
  'none' | 'pending_approval' | 'auto_sent' | 'sent' | 'rejected';
export const REPLY_STATUSES: ReplyStatus[] = [
  'none',
  'pending_approval',
  'auto_sent',
  'sent',
  'rejected',
];

export type InboundMessageDocument = HydratedDocument<InboundMessage>;

// A customer message the AI assistant looked at — real inbound webhooks
// (Meta/WhatsApp, inbound email, SMS carrier) aren't wired up in this app,
// so every row here comes from the "Simulate incoming message" tool. The AI
// call itself (reply + classification) is real when the user has their own
// provider key saved.
@Schema({ timestamps: true })
export class InboundMessage {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ enum: CHANNELS, required: true })
  channel: Channel;

  @Prop({ required: true })
  from: string;

  @Prop({ required: true })
  text: string;

  @Prop()
  aiReplyText?: string;

  @Prop({ enum: AI_SENTIMENTS })
  aiSentiment?: AiSentiment;

  @Prop()
  aiInDomain?: boolean;

  @Prop()
  aiInterested?: boolean;

  @Prop()
  aiProvider?: string;

  @Prop()
  aiModel?: string;

  @Prop({ enum: ['processed', 'error'], default: 'processed' })
  status: InboundMessageStatus;

  @Prop()
  errorMessage?: string;

  @Prop()
  leadId?: string;

  // Set only for real (non-simulated) inbound email — points at the rich
  // InboundEmail row (src/mail) holding MIME-specific data this generic
  // schema doesn't carry (headers, attachments, threading).
  @Prop()
  emailMetaId?: string;

  // Whether/how the AI-drafted reply (aiReplyText) was actually delivered
  // to the customer — see AiConfig.autoSendChannels. 'none' covers both
  // "no reply was generated" and every row created before this field
  // existed, which is the correct default (nothing was sent for those).
  @Prop({ enum: REPLY_STATUSES, default: 'none' })
  replyStatus: ReplyStatus;

  // Set once replyStatus is 'auto_sent' or 'sent' — the outbound
  // EmailMessage id the reply went out as.
  @Prop()
  sentMessageId?: string;

  // Populated by { timestamps: true } — declared here (no @Prop) purely so
  // TypeScript knows these exist on a hydrated document.
  createdAt: Date;
  updatedAt: Date;
}

export const InboundMessageSchema =
  SchemaFactory.createForClass(InboundMessage);
