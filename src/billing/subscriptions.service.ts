import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subscription, SubscriptionDocument, SubscriptionStatus } from './schemas/subscription.schema';
import { PaymentEvent, PaymentEventDocument } from './schemas/payment-event.schema';
import { PlansService } from './plans.service';
import { RazorpayService } from './razorpay.service';

// Subset of the Razorpay subscription-event payload shape we actually read.
// Razorpay doesn't publish SDK types for inbound webhook bodies (only for
// its own API responses), so this is intentionally narrow/defensive.
export interface RazorpayWebhookPayload {
  payload?: {
    subscription?: { entity?: { id?: string; status?: string; current_start?: number; current_end?: number } };
  };
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectModel(Subscription.name)
    private readonly model: Model<SubscriptionDocument>,
    @InjectModel(PaymentEvent.name)
    private readonly paymentEventModel: Model<PaymentEventDocument>,
    private readonly plansService: PlansService,
    private readonly razorpayService: RazorpayService,
  ) {}

  // The current user's active-ish subscription (anything not
  // cancelled/expired/completed) — a user has at most one at a time, this
  // app doesn't support stacking plans.
  async findActiveForUser(userId: string) {
    return this.model
      .findOne({
        userId,
        status: { $in: ['created', 'authenticated', 'active', 'pending', 'halted'] },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getForUser(userId: string) {
    const subscription = await this.findActiveForUser(userId);
    if (!subscription) return null;
    const plan = await this.plansService.findById(subscription.planId);
    return { subscription, plan };
  }

  // Starts checkout — creates (or reuses) the Razorpay-side Plan, then a
  // new Razorpay Subscription for this user, and stores our own pending
  // Subscription doc. The frontend takes the returned razorpaySubscriptionId
  // + key id and opens Razorpay Checkout; the subscription only becomes
  // 'active' once the webhook confirms the first payment (see
  // processWebhookEvent below) — never trust client-side "success" alone.
  async subscribe(userId: string, planId: string) {
    if (!this.razorpayService.isConfigured()) {
      throw new BadRequestException(
        'Subscriptions are not available yet — payment gateway is not configured.',
      );
    }

    const existing = await this.findActiveForUser(userId);
    if (existing) {
      throw new BadRequestException(
        'You already have an active subscription. Cancel it before subscribing to a different plan.',
      );
    }

    const plan = await this.plansService.findById(planId);
    if (!plan.isActive) {
      throw new BadRequestException('This plan is no longer available.');
    }

    const razorpayPlanId = await this.razorpayService.createOrGetRazorpayPlan(plan);
    const razorpaySubscription = await this.razorpayService.createSubscription(razorpayPlanId);

    const subscription = await this.model.create({
      userId,
      planId: (plan._id as { toString(): string }).toString(),
      razorpaySubscriptionId: razorpaySubscription.id,
      status: razorpaySubscription.status,
    });

    return {
      subscriptionId: (subscription._id as { toString(): string }).toString(),
      razorpaySubscriptionId: razorpaySubscription.id,
      razorpayKeyId: this.razorpayService.getKeyId(),
    };
  }

  async cancel(userId: string, immediately: boolean) {
    const subscription = await this.findActiveForUser(userId);
    if (!subscription) throw new NotFoundException('No active subscription found');

    await this.razorpayService.cancelSubscription(
      subscription.razorpaySubscriptionId,
      !immediately,
    );

    if (immediately) {
      subscription.status = 'cancelled';
    } else {
      subscription.cancelAtPeriodEnd = true;
    }
    await subscription.save();
    return subscription;
  }

  // Called by BillingController's /billing/webhook route after the raw-body
  // HMAC signature has already been verified. `eventId` is the
  // X-Razorpay-Event-Id header value — Razorpay's documented idempotency
  // key, since retried deliveries reuse it. Dedup is done with an atomic
  // upsert (not a plain findOne + create, which would race under retries
  // that arrive close together): findOneAndUpdate with upsert + new:false
  // returns null only the first time a given eventId is seen.
  async processWebhookEvent(eventId: string, eventType: string, body: RazorpayWebhookPayload) {
    const preExisting = await this.paymentEventModel
      .findOneAndUpdate(
        { razorpayEventId: eventId },
        { $setOnInsert: { razorpayEventId: eventId, type: eventType, payload: body } },
        { upsert: true, new: false },
      )
      .exec();

    if (preExisting) {
      this.logger.debug(`Ignoring duplicate webhook delivery for event ${eventId}`);
      return;
    }

    const subscriptionEntity = body.payload?.subscription?.entity;
    if (!subscriptionEntity?.id) {
      this.logger.warn(`Webhook event ${eventType} (${eventId}) had no subscription entity, skipping`);
      return;
    }

    const subscription = await this.model
      .findOne({ razorpaySubscriptionId: subscriptionEntity.id })
      .exec();
    if (!subscription) {
      this.logger.warn(
        `Webhook event ${eventType} (${eventId}) references unknown subscription ${subscriptionEntity.id}`,
      );
      return;
    }

    if (subscriptionEntity.status) {
      subscription.status = subscriptionEntity.status as SubscriptionStatus;
    }

    if (subscriptionEntity.current_start) {
      subscription.currentPeriodStart = new Date(subscriptionEntity.current_start * 1000);
    }
    if (subscriptionEntity.current_end) {
      subscription.currentPeriodEnd = new Date(subscriptionEntity.current_end * 1000);
    }

    // A fresh charge means a new billing cycle started — reset usage so
    // the plan allowance is available again for the new period.
    if (eventType === 'subscription.charged') {
      subscription.messagesUsedThisPeriod = { whatsapp: 0, email: 0, sms: 0 };
    }

    await subscription.save();

    await this.paymentEventModel
      .updateOne({ razorpayEventId: eventId }, { $set: { processedAt: new Date(), subscriptionId: (subscription._id as { toString(): string }).toString() } })
      .exec();
  }

  // Admin-only revenue/cost dashboard data — MRR per plan from currently
  // active (or authenticated, i.e. billing confirmed but not yet charged)
  // subscriptions, computed from live subscription counts rather than a
  // cached figure so it can't drift from reality.
  async revenueSummary() {
    const [plans, counts] = await Promise.all([
      this.plansService.listAll(),
      this.model.aggregate<{ _id: string; count: number }>([
        { $match: { status: { $in: ['active', 'authenticated'] } } },
        { $group: { _id: '$planId', count: { $sum: 1 } } },
      ]),
    ]);

    const countsByPlanId = new Map(counts.map((c) => [c._id, c.count]));

    const plansSummary = plans.map((plan) => {
      const planId = (plan._id as { toString(): string }).toString();
      const activeSubscribers = countsByPlanId.get(planId) ?? 0;
      return {
        planId,
        name: plan.name,
        slug: plan.slug,
        priceMonthlyPaise: plan.priceMonthlyPaise,
        isActive: plan.isActive,
        activeSubscribers,
        mrrPaise: activeSubscribers * plan.priceMonthlyPaise,
      };
    });

    const totalMrrPaise = plansSummary.reduce((sum, p) => sum + p.mrrPaise, 0);
    const totalActiveSubscribers = plansSummary.reduce((sum, p) => sum + p.activeSubscribers, 0);

    return { plans: plansSummary, totalMrrPaise, totalActiveSubscribers };
  }
}
