import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MailCredentialStatus = 'active' | 'revoked';
export type MailCredentialDocument = HydratedDocument<MailCredential>;

// SMTP AUTH credentials for smtp.<platform-domain>:587 — distinct from
// ApiKey (src/api-keys), which is a bearer token for the REST API. SMTP AUTH
// needs a lookup-by-username-then-verify-password flow, so the password is
// bcrypt-hashed (comparable) rather than sha256-hashed-and-looked-up-by-hash
// like ApiKey.
@Schema({ timestamps: true })
export class MailCredential {
  @Prop({ required: true, index: true })
  userId: string;

  // Restricts this credential to sending From one specific verified domain.
  // Unset = any of the user's verified domains.
  @Prop()
  domainId?: string;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true })
  label: string;

  @Prop({ enum: ['active', 'revoked'], default: 'active' })
  status: MailCredentialStatus;

  @Prop()
  lastUsedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const MailCredentialSchema =
  SchemaFactory.createForClass(MailCredential);
