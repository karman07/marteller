import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PlanMessageLimits = {
  whatsapp: number;
  email: number;
  sms: number;
};

export type PlanDocument = HydratedDocument<Plan>;

// A subscription tier admins define and customers subscribe to via
// Razorpay. Deliberately separate from the existing per-message wallet
// system (WalletTransaction/PricingService) — a Plan grants a monthly
// included-message allowance per channel; usage beyond that still draws
// from the wallet exactly as it does for plan-less users today. See
// PlanEnforcementService for how the two interact.
@Schema({ timestamps: true })
export class Plan {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  priceMonthlyPaise: number;

  @Prop({ default: 'INR' })
  currency: string;

  @Prop({ type: Object, required: true })
  messageLimits: PlanMessageLimits;

  // Marketing bullets shown on the pricing page — mirrors the shape
  // frontend/components/PricingSection.tsx already hardcodes, so that
  // component becomes data-driven with minimal reshaping.
  @Prop({ type: [String], default: [] })
  features: string[];

  // Cached id from Razorpay's own Plans API — created lazily on first
  // subscribe (see RazorpayService.createOrGetRazorpayPlan), not at
  // plan-creation time, so editing a Plan's price here doesn't silently
  // desync from a Razorpay-side plan nothing has subscribed to yet.
  @Prop()
  razorpayPlanId?: string;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;

  createdAt: Date;
  updatedAt: Date;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);
PlanSchema.index({ isActive: 1, sortOrder: 1 });
