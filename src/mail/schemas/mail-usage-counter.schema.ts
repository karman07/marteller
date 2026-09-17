import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MailUsageCounterDocument = HydratedDocument<MailUsageCounter>;

// One doc per user per day — atomic increment-with-cap using the same
// findOneAndUpdate($lt guard) pattern WalletService uses for balance debits,
// so a burst of concurrent sends can never blow past the daily quota.
@Schema({ timestamps: true })
export class MailUsageCounter {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  periodKey: string;

  @Prop({ default: 0 })
  sentCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export const MailUsageCounterSchema =
  SchemaFactory.createForClass(MailUsageCounter);

MailUsageCounterSchema.index({ userId: 1, periodKey: 1 }, { unique: true });
