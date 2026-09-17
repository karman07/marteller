import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PaymentEventDocument = HydratedDocument<PaymentEvent>;

// Webhook audit/idempotency log — Razorpay retries webhook deliveries, so
// every processed event is recorded here keyed by the X-Razorpay-Event-Id
// request header to dedupe (see SubscriptionsService.processWebhookEvent).
// Also doubles as a debugging trail since it stores the raw payload.
@Schema({ timestamps: true })
export class PaymentEvent {
  @Prop({ index: true })
  subscriptionId?: string;

  @Prop({ required: true, unique: true, index: true })
  razorpayEventId: string;

  @Prop({ required: true })
  type: string;

  @Prop({ type: Object, required: true })
  payload: Record<string, unknown>;

  @Prop()
  processedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const PaymentEventSchema = SchemaFactory.createForClass(PaymentEvent);
