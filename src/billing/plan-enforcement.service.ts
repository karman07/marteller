import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subscription, SubscriptionDocument } from './schemas/subscription.schema';
import { WalletTransaction, WalletTransactionDocument } from '../wallet/schemas/wallet-transaction.schema';
import { PlansService } from './plans.service';

export type BillableChannel = 'whatsapp' | 'email' | 'sms';

@Injectable()
export class PlanEnforcementService {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(WalletTransaction.name)
    private readonly transactionModel: Model<WalletTransactionDocument>,
    private readonly plansService: PlansService,
  ) {}

  // Tries to cover `count` messages on `channel` out of the caller's active
  // plan allowance for the current billing period. Returns true (and
  // atomically reserves the usage) if the plan had room; false if the user
  // has no active plan, the plan is not 'active'/'authenticated', or the
  // allowance for this period is exhausted — in which case the caller
  // should fall back to per-message wallet billing.
  //
  // The $inc only commits when the query's usage-so-far condition still
  // holds at write time, so concurrent sends can't both slip in under the
  // cap the way a read-then-write check could.
  async checkAndReserve(
    userId: string,
    channel: BillableChannel,
    count = 1,
  ): Promise<boolean> {
    const subscription = await this.subscriptionModel
      .findOne({ userId, status: { $in: ['active', 'authenticated'] } })
      .sort({ createdAt: -1 })
      .exec();
    if (!subscription) return false;

    const plan = await this.plansService.findById(subscription.planId).catch(() => null);
    if (!plan) return false;

    const limit = plan.messageLimits[channel];
    if (!limit || limit <= 0) return false;

    const usageField = `messagesUsedThisPeriod.${channel}`;
    const updated = await this.subscriptionModel
      .findOneAndUpdate(
        { _id: subscription._id, [usageField]: { $lte: limit - count } },
        { $inc: { [usageField]: count } },
        { new: true },
      )
      .exec();

    if (!updated) return false;

    await this.transactionModel.create({
      userId,
      type: 'debit',
      amountPaise: 0,
      description: `${channel} message covered by plan allowance`,
    });

    return true;
  }
}
