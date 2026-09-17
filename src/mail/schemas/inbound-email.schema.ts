import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type InboundEmailDocument = HydratedDocument<InboundEmail>;

@Schema({ _id: false })
export class InboundAttachmentMeta {
  @Prop({ required: true })
  filename: string;

  @Prop()
  contentType?: string;

  @Prop({ required: true })
  sizeBytes: number;

  @Prop({ required: true })
  storagePath: string;
}

const InboundAttachmentMetaSchema = SchemaFactory.createForClass(
  InboundAttachmentMeta,
);

// The rich sibling of InboundMessage (src/inbox) for real received email —
// holds the MIME-specific data (headers needed for threading, raw storage,
// attachments) that InboundMessage's generic {channel, from, text} shape
// can't. Linked from InboundMessage via emailMetaId, not the other way
// round, so the generic inbox/conversation view never needs to know this
// collection exists.
@Schema({ timestamps: true })
export class InboundEmail {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  domain: string;

  // RFC Message-ID header — dedupe key, since a redelivering relay/webhook
  // must never create two InboundEmail rows for the same message.
  @Prop({ required: true, unique: true })
  messageId: string;

  @Prop({ required: true })
  from: string;

  @Prop({ type: [String], required: true })
  to: string[];

  @Prop()
  subject?: string;

  @Prop()
  text?: string;

  @Prop()
  html?: string;

  @Prop()
  inReplyTo?: string;

  @Prop({ type: [String], default: [] })
  references: string[];

  @Prop()
  spamScore?: number;

  @Prop({ type: [InboundAttachmentMetaSchema], default: [] })
  attachments: InboundAttachmentMeta[];

  // Path to the raw .eml on disk under uploads/mail-inbound/ — kept for
  // reprocessing/audit without re-deriving parsed fields.
  @Prop()
  rawStoragePath?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const InboundEmailSchema = SchemaFactory.createForClass(InboundEmail);
