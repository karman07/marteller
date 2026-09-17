import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MailDomainStatus = 'pending' | 'verified' | 'failed';
export type MailDomainDocument = HydratedDocument<MailDomain>;

@Schema({ timestamps: true })
export class MailDomain {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, lowercase: true, trim: true })
  domain: string;

  @Prop({ enum: ['pending', 'verified', 'failed'], default: 'pending' })
  status: MailDomainStatus;

  // Checked at `_mrtverify.<domain>` (TXT) to prove domain ownership before
  // any DKIM/SPF instructions are trusted.
  @Prop({ required: true })
  verificationToken: string;

  @Prop({ required: true })
  dkimSelector: string;

  // Public key only — safe to return to the client as-is for the DNS TXT
  // instructions. The private half never leaves encrypted storage.
  @Prop({ required: true })
  dkimPublicKeyPem: string;

  @Prop({ required: true })
  dkimPrivateKeyCiphertext: string;

  @Prop({ required: true })
  dkimPrivateKeyIv: string;

  @Prop({ required: true })
  dkimPrivateKeyAuthTag: string;

  // Local-part used as the From address for sends that don't specify one
  // explicitly (e.g. the generic template-blast path) — "<localPart>@<domain>".
  @Prop({ default: 'no-reply' })
  defaultFromLocalPart: string;

  @Prop({ default: false, index: true })
  isDefault: boolean;

  @Prop()
  verifiedAt?: Date;

  @Prop()
  lastCheckedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const MailDomainSchema = SchemaFactory.createForClass(MailDomain);

MailDomainSchema.index({ userId: 1, domain: 1 }, { unique: true });
// A domain can only be *verified* under one account at a time — prevents two
// users both claiming to own the same domain. Multiple pending/unverified
// attempts at the same domain are harmless and allowed.
MailDomainSchema.index(
  { domain: 1 },
  { unique: true, partialFilterExpression: { status: 'verified' } },
);
