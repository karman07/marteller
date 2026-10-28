import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import Razorpay from 'razorpay';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan, PlanDocument } from './schemas/plan.schema';

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private client?: Razorpay;

  constructor(
    private readonly config: ConfigService,
    @InjectModel(Plan.name) private readonly planModel: Model<PlanDocument>,
  ) {}

  isConfigured(): boolean {
    return !!(
      this.config.get<string>('RAZORPAY_KEY_ID') &&
      this.config.get<string>('RAZORPAY_KEY_SECRET')
    );
  }

  getKeyId(): string {
    return this.config.getOrThrow<string>('RAZORPAY_KEY_ID');
  }

  private getClient(): Razorpay {
    if (!this.client) {
      this.client = new Razorpay({
        key_id: this.config.getOrThrow<string>('RAZORPAY_KEY_ID'),
        key_secret: this.config.getOrThrow<string>('RAZORPAY_KEY_SECRET'),
      });
    }
    return this.client;
  }

  // Razorpay-side Plan is created lazily on first subscribe (not at
  // Plan-creation time in our own admin UI) — see plan.schema.ts's
  // razorpayPlanId comment for why. Cached back onto the Plan doc so
  // repeat subscribes to the same plan reuse the same Razorpay plan_id
  // rather than accumulating duplicates.
  async createOrGetRazorpayPlan(plan: PlanDocument): Promise<string> {
    if (plan.razorpayPlanId) return plan.razorpayPlanId;

    const client = this.getClient();
    const created = await client.plans.create({
      period: 'monthly',
      interval: 1,
      item: {
        name: plan.name,
        amount: plan.priceMonthlyPaise,
        currency: plan.currency,
        description: plan.description,
      },
    });

    plan.razorpayPlanId = created.id;
    await plan.save();
    return created.id;
  }

  // total_count: 360 monthly cycles (~30 years) — Razorpay requires a
  // finite count, not "forever"; this is the same trick most SaaS
  // integrations use for an effectively-indefinite subscription that
  // renews monthly until explicitly cancelled.
  async createSubscription(razorpayPlanId: string) {
    const client = this.getClient();
    return client.subscriptions.create({
      plan_id: razorpayPlanId,
      total_count: 360,
      customer_notify: true,
    });
  }

  async cancelSubscription(razorpaySubscriptionId: string, atCycleEnd: boolean) {
    const client = this.getClient();
    return client.subscriptions.cancel(razorpaySubscriptionId, atCycleEnd);
  }

  // One-time payment order for a wallet top-up (as opposed to the recurring
  // Subscription flow above) — amountPaise is already in the smallest
  // currency unit, same convention as Plan.priceMonthlyPaise.
  async createOrder(amountPaise: number, receipt: string, notes?: Record<string, string>) {
    const client = this.getClient();
    return client.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes,
    });
  }

  // Standard Razorpay Orders signature check — HMAC-SHA256 of
  // "order_id|payment_id" against the account's key secret (NOT the
  // separate webhook secret above). Verified synchronously right after
  // Checkout's success handler, since a one-time order has no recurring
  // webhook lifecycle the way a Subscription does.
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    const secret = this.config.getOrThrow<string>('RAZORPAY_KEY_SECRET');
    const expected = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
    return expected === signature;
  }

  // HMAC-SHA256 signature check against RAZORPAY_WEBHOOK_SECRET, run
  // against the RAW request body — the webhook route must use a raw body
  // parser instead of Nest's default JSON parser, or this always fails.
  // See billing.controller.ts's webhook route registration.
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const secret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.warn(
        'RAZORPAY_WEBHOOK_SECRET not set — refusing to process webhook.',
      );
      return false;
    }
    return Razorpay.validateWebhookSignature(rawBody, signature, secret);
  }
}
