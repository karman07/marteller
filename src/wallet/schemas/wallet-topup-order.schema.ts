import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WalletTopupOrderStatus = 'created' | 'paid';
export type WalletTopupOrderDocument = HydratedDocument<WalletTopupOrder>;

// One row per Razorpay Order created for a self-service wallet top-up — the
// idempotency guard against replaying a verified payment (see
// WalletService.verifyAndCreditTopup): a signature-verified request for an
// order already marked 'paid' is a no-op, not a second credit.
@Schema({ timestamps: true })
export class WalletTopupOrder {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, unique: true, index: true })
  razorpayOrderId: string;

  @Prop({ required: true })
  amountPaise: number;

  @Prop({ enum: ['created', 'paid'], required: true, default: 'created' })
  status: WalletTopupOrderStatus;

  @Prop()
  razorpayPaymentId?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const WalletTopupOrderSchema = SchemaFactory.createForClass(WalletTopupOrder);
