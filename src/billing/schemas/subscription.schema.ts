import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { PlanMessageLimits } from './plan.schema';

// Verbatim Razorpay Subscription entity statuses — deliberately not our
// own enum, so webhook events map onto this field without translation.
// https://razorpay.com/docs/payments/subscriptions/entity/#subscription-entity
export type SubscriptionStatus =
  | 'created'
  | 'authenticated'
  | 'active'
  | 'pending'
  | 'halted'
  | 'cancelled'
  | 'completed'
  | 'expired';

export type SubscriptionDocument = HydratedDocument<Subscription>;

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  planId: string;

  @Prop({ required: true, unique: true, index: true })
  razorpaySubscriptionId: string;

  @Prop({
    enum: [
      'created',
      'authenticated',
      'active',
      'pending',
      'halted',
      'cancelled',
      'completed',
      'expired',
    ],
    required: true,
    default: 'created',
  })
  status: SubscriptionStatus;

  @Prop()
  currentPeriodStart?: Date;

  @Prop()
  currentPeriodEnd?: Date;

  // Reset to {0,0,0} on every subscription.charged webhook (new billing
  // period started) — see SubscriptionsService.processWebhookEvent.
  @Prop({ type: Object, default: { whatsapp: 0, email: 0, sms: 0 } })
  messagesUsedThisPeriod: PlanMessageLimits;

  @Prop({ default: false })
  cancelAtPeriodEnd: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
SubscriptionSchema.index({ userId: 1, status: 1 });
