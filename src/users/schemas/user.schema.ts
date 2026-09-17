import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AccountType = 'individual' | 'business';
export type CompanySize = '1-10' | '11-50' | '51-200' | '201-1000' | '1000+';
export type Interest = 'whatsapp' | 'email' | 'sms' | 'otp';
export type UserRole = 'customer' | 'sales';
export type SalesStage =
  'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
export type UserDocument = HydratedDocument<User>;

export const COMPANY_SIZES: CompanySize[] = ['1-10', '11-50', '51-200', '201-1000', '1000+'];
export const INTERESTS: Interest[] = ['whatsapp', 'email', 'sms', 'otp'];
export const USER_ROLES: UserRole[] = ['customer', 'sales'];
export const SALES_STAGES: SalesStage[] = [
  'new',
  'contacted',
  'qualified',
  'converted',
  'lost',
];

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, index: true })
  firebaseUid: string;

  @Prop({ unique: true, sparse: true, index: true })
  email?: string;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ unique: true, sparse: true, index: true })
  phoneNumber?: string;

  @Prop()
  countryDialCode?: string;

  @Prop()
  country?: string;

  @Prop()
  countryIso2?: string;

  @Prop()
  address?: string;

  @Prop()
  city?: string;

  @Prop()
  state?: string;

  @Prop()
  postalCode?: string;

  @Prop()
  name?: string;

  @Prop()
  photoUrl?: string;

  @Prop({ enum: ['individual', 'business'] })
  accountType?: AccountType;

  @Prop()
  companyName?: string;

  @Prop({ enum: COMPANY_SIZES })
  companySize?: CompanySize;

  @Prop({ type: [String], enum: INTERESTS, default: [] })
  interests: Interest[];

  @Prop({ default: false })
  onboarded: boolean;

  @Prop({ default: 0 })
  walletBalancePaise: number;

  @Prop({ enum: USER_ROLES, default: 'customer', index: true })
  role: UserRole;

  // The sales team's own relationship-tracking pipeline — separate from
  // verification status, which is a compliance gate, not a sales stage.
  @Prop({ enum: SALES_STAGES, default: 'new', index: true })
  salesStage: SalesStage;

  @Prop()
  salesNotes?: string;

  // Populated by { timestamps: true } — declared here (no @Prop) purely so
  // TypeScript knows these exist on a hydrated document.
  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
