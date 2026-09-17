import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type Channel = 'whatsapp' | 'email' | 'sms';
export type WhatsappCategory = 'marketing' | 'utility' | 'authentication';
export type TemplateStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';
export type HeaderType = 'text' | 'image';

export const CHANNELS: Channel[] = ['whatsapp', 'email', 'sms'];
export const WHATSAPP_CATEGORIES: WhatsappCategory[] = ['marketing', 'utility', 'authentication'];
export const HEADER_TYPES: HeaderType[] = ['text', 'image'];

export type TemplateButtonType = 'quick_reply' | 'phone_number' | 'url';
export const TEMPLATE_BUTTON_TYPES: TemplateButtonType[] = ['quick_reply', 'phone_number', 'url'];

@Schema({ _id: false })
export class TemplateButton {
  @Prop({ required: true, enum: TEMPLATE_BUTTON_TYPES })
  type: TemplateButtonType;

  @Prop({ required: true })
  text: string;

  // Only set when type is 'phone_number' — international format, e.g. +911234567890.
  @Prop()
  phoneNumber?: string;

  // Only set when type is 'url'.
  @Prop()
  url?: string;
}

const TemplateButtonSchema = SchemaFactory.createForClass(TemplateButton);

export type TemplateDocument = HydratedDocument<Template>;

@Schema({ timestamps: true })
export class Template {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ enum: CHANNELS, required: true, index: true })
  channel: Channel;

  @Prop({ required: true })
  name: string;

  @Prop({ enum: WHATSAPP_CATEGORIES })
  category?: WhatsappCategory;

  @Prop({ default: 'en' })
  language?: string;

  @Prop()
  subject?: string;

  @Prop({ enum: HEADER_TYPES, default: 'text' })
  headerType?: HeaderType;

  @Prop()
  header?: string;

  @Prop()
  headerImageUrl?: string;

  @Prop({ required: true })
  body: string;

  @Prop()
  footer?: string;

  // Email only — an optional banner image shown above the body.
  @Prop()
  bannerImageUrl?: string;

  @Prop({ type: [TemplateButtonSchema], default: [] })
  buttons: TemplateButton[];

  @Prop({ type: [String], default: [] })
  variables: string[];

  @Prop({ enum: ['draft', 'pending_review', 'approved', 'rejected'], default: 'approved' })
  status: TemplateStatus;

  // Shared starter templates available to every user, seeded on boot — not
  // owned by any single account and not user-editable/deletable.
  @Prop({ default: false, index: true })
  isSystem: boolean;
}

export const TemplateSchema = SchemaFactory.createForClass(Template);
