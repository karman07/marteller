import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VerificationFieldType = 'text' | 'textarea' | 'select' | 'number';
export const VERIFICATION_FIELD_TYPES: VerificationFieldType[] = [
  'text',
  'textarea',
  'select',
  'number',
];

export type VerificationFieldDefDocument =
  HydratedDocument<VerificationFieldDef>;

// The business-details form customers fill in to get verified is built from
// these — the sales team edits this collection, and both the customer's
// submit form and the sales review screen render off it. File uploads
// (business/address proof) stay as a fixed pair, not part of this — only
// the text-style fields are dynamic.
@Schema({ timestamps: true })
export class VerificationFieldDef {
  @Prop({ required: true, unique: true, index: true })
  key: string;

  @Prop({ required: true })
  label: string;

  @Prop({ enum: VERIFICATION_FIELD_TYPES, default: 'text' })
  type: VerificationFieldType;

  @Prop({ default: true })
  required: boolean;

  @Prop({ type: [String], default: [] })
  options: string[];

  @Prop()
  placeholder?: string;

  @Prop({ default: 0 })
  order: number;

  createdAt: Date;
  updatedAt: Date;
}

export const VerificationFieldDefSchema =
  SchemaFactory.createForClass(VerificationFieldDef);
