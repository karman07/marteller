import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { Channel } from '../../templates/schemas/template.schema';

export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'failed';
export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: true })
export class Message {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  channel: Channel;

  @Prop()
  templateId?: string;

  @Prop()
  templateName?: string;

  @Prop({ required: true })
  to: string;

  @Prop({ type: Object, default: {} })
  variables: Record<string, string>;

  @Prop({ enum: ['queued', 'sent', 'delivered', 'failed'], default: 'queued' })
  status: MessageStatus;

  @Prop()
  providerMessageId?: string;

  @Prop()
  errorMessage?: string;

  @Prop({ required: true })
  costPaise: number;

  // Populated by { timestamps: true } — declared here (no @Prop) purely so
  // TypeScript knows these exist on a hydrated document.
  createdAt: Date;
  updatedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
