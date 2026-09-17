import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SuppressionReason = 'hard_bounce' | 'complaint' | 'manual';
export type SuppressionEntryDocument = HydratedDocument<SuppressionEntry>;

// Scoped per-user (not platform-wide): a hard bounce or spam complaint means
// "don't send FROM this user's domains TO this address again" — it doesn't
// necessarily mean every other tenant on the platform should be blocked from
// that same address too.
@Schema({ timestamps: true })
export class SuppressionEntry {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ enum: ['hard_bounce', 'complaint', 'manual'], required: true })
  reason: SuppressionReason;

  @Prop()
  source?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const SuppressionEntrySchema =
  SchemaFactory.createForClass(SuppressionEntry);

SuppressionEntrySchema.index({ userId: 1, email: 1 }, { unique: true });
