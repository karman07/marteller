import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VerificationStatus =
  'not_submitted' | 'pending' | 'verified' | 'rejected';
export type BusinessType =
  | 'individual'
  | 'proprietorship'
  | 'partnership'
  | 'llp'
  | 'private_limited'
  | 'other';

export const BUSINESS_TYPES: BusinessType[] = [
  'individual',
  'proprietorship',
  'partnership',
  'llp',
  'private_limited',
  'other',
];

@Schema({ _id: false })
export class VerificationDocument {
  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  storedFileName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  sizeBytes: number;

  @Prop({ default: () => new Date() })
  uploadedAt: Date;
}

const VerificationDocumentSchema =
  SchemaFactory.createForClass(VerificationDocument);

export type BusinessVerificationDocument =
  HydratedDocument<BusinessVerification>;

@Schema({ timestamps: true })
export class BusinessVerification {
  @Prop({ required: true, unique: true, index: true })
  userId: string;

  // Keyed by VerificationFieldDef.key — the form is admin-defined
  // (see verification-field.schema.ts), so this document only ever stores
  // whatever fields existed at submission time, not a fixed shape.
  @Prop({ type: Object, default: {} })
  fieldValues: Record<string, string>;

  @Prop({ type: [VerificationDocumentSchema], default: [] })
  documents: VerificationDocument[];

  @Prop({
    enum: ['not_submitted', 'pending', 'verified', 'rejected'],
    default: 'not_submitted',
  })
  status: VerificationStatus;

  @Prop()
  reviewNote?: string;

  @Prop()
  submittedAt?: Date;

  @Prop()
  reviewedAt?: Date;
}

export const BusinessVerificationSchema =
  SchemaFactory.createForClass(BusinessVerification);
