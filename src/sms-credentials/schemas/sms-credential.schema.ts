import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SmsCredentialDocument = HydratedDocument<SmsCredential>;

// One Fast2SMS (fast2sms.com) config per user — deliberately not something
// the customer sets up themselves: sales/admin provision it on their
// behalf (see SmsCredentialsService), same "we configure it for them"
// model as an account manager setting up billing. Only one config per
// user is kept, not a history — configuring again overwrites in place.
@Schema({ timestamps: true })
export class SmsCredential {
  @Prop({ required: true, unique: true, index: true })
  userId: string;

  @Prop({ required: true })
  apiKey: string;

  // Fast2SMS's routing parameter — 'q' (Quick/Transactional) works with
  // freeform message text and no DLT template pre-registration, which
  // matches how this app already renders an arbitrary body from a
  // template; 'dlt' would require a pre-approved template ID this app has
  // no model for, so it's left as an escape hatch for an account that
  // needs it rather than the default.
  @Prop({ default: 'q' })
  route: string;

  // DLT-registered sender ID (e.g. "MRTLER") — optional, only meaningful
  // for accounts Fast2SMS has approved one for. Left unset uses
  // Fast2SMS's own shared sender ID for the route.
  @Prop()
  senderId?: string;

  // The sales rep or admin who last set this — an audit trail for "who
  // configured this account's SMS," since it's staff-provisioned rather
  // than self-service.
  @Prop()
  configuredByUserId?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const SmsCredentialSchema = SchemaFactory.createForClass(SmsCredential);
