import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { RazorpayService } from '../billing/razorpay.service';
import { WalletTransaction, WalletTransactionDocument } from './schemas/wallet-transaction.schema';
import { WalletTopupOrder, WalletTopupOrderDocument } from './schemas/wallet-topup-order.schema';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(WalletTransaction.name)
    private readonly transactionModel: Model<WalletTransactionDocument>,
    @InjectModel(WalletTopupOrder.name)
    private readonly topupOrderModel: Model<WalletTopupOrderDocument>,
    private readonly razorpayService: RazorpayService,
    private readonly config: ConfigService,
  ) {}

  isDevBypassEnabled(): boolean {
    return (
      this.config.get<string>('NODE_ENV') !== 'production' &&
      this.config.get<string>('DEV_PHONE_AUTH_BYPASS') === 'true'
    );
  }

  async getBalance(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('User not found');
    return { balancePaise: user.walletBalancePaise };
  }

  async listTransactions(userId: string, page = 1, limit = 20) {
    const filter = { userId };
    const [items, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.transactionModel.countDocuments(filter).exec(),
    ]);
    return { items, total, page, limit };
  }

  // The shared credit primitive — used by the real Razorpay top-up flow
  // below (after signature verification), by the dev-only instant-credit
  // route, and by AdminController/SalesController's staff-initiated
  // add-balance routes. `description` distinguishes which of those it was,
  // and shows up as-is in the customer's own transaction history.
  async addBalance(userId: string, amountPaise: number, description = 'Credits added') {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { $inc: { walletBalancePaise: amountPaise } }, { new: true })
      .exec();
    if (!user) throw new NotFoundException('User not found');

    await this.transactionModel.create({
      userId,
      type: 'credit',
      amountPaise,
      description,
    });

    return { balancePaise: user.walletBalancePaise };
  }

  // Debits atomically and only if sufficient funds exist — used by message
  // sending so spend and balance can never drift apart.
  async debit(userId: string, amountPaise: number, description: string, relatedMessageId?: string) {
    const user = await this.userModel
      .findOneAndUpdate(
        { _id: userId, walletBalancePaise: { $gte: amountPaise } },
        { $inc: { walletBalancePaise: -amountPaise } },
        { new: true },
      )
      .exec();

    if (!user) {
      throw new BadRequestException('Insufficient credits. Add more credits to continue.');
    }

    await this.transactionModel.create({
      userId,
      type: 'debit',
      amountPaise,
      description,
      relatedMessageId,
    });

    return { balancePaise: user.walletBalancePaise };
  }

  // Starts a one-time Razorpay Order for a self-service wallet top-up — the
  // frontend takes the returned orderId + key id and opens Razorpay
  // Checkout; the wallet is only credited once verifyAndCreditTopup
  // confirms the payment signature below (never trust client-side
  // "success" alone, same reasoning as SubscriptionsService.subscribe()).
  async createTopupOrder(userId: string, amountPaise: number) {
    if (!this.razorpayService.isConfigured()) {
      throw new BadRequestException('Payments are not available yet — payment gateway is not configured.');
    }

    const order = await this.razorpayService.createOrder(amountPaise, `wallet_${userId}_${Date.now()}`, {
      userId,
      purpose: 'wallet_topup',
    });

    await this.topupOrderModel.create({ userId, razorpayOrderId: order.id, amountPaise });

    return {
      orderId: order.id,
      amountPaise,
      currency: 'INR',
      keyId: this.razorpayService.getKeyId(),
    };
  }

  async verifyAndCreditTopup(userId: string, orderId: string, paymentId: string, signature: string) {
    const valid = this.razorpayService.verifyPaymentSignature(orderId, paymentId, signature);
    if (!valid) throw new UnauthorizedException('Invalid payment signature');

    const order = await this.topupOrderModel.findOne({ razorpayOrderId: orderId, userId }).exec();
    if (!order) throw new NotFoundException('Top-up order not found');

    // Replaying an already-verified order (e.g. a duplicate client retry)
    // is a no-op, not a second credit.
    if (order.status === 'paid') return this.getBalance(userId);

    order.status = 'paid';
    order.razorpayPaymentId = paymentId;
    await order.save();

    return this.addBalance(userId, order.amountPaise, 'Credits purchased via Razorpay');
  }

  // Dev-only instant credit, with no payment at all — the old behavior,
  // kept for local testing without needing a live Razorpay checkout for
  // every balance change. Hard-disabled unless NODE_ENV !== 'production'
  // AND DEV_PHONE_AUTH_BYPASS=true, same gate as every other dev shortcut
  // in this codebase (see AuthService.isDevBypassEnabled() etc.).
  async devAddBalance(userId: string, amountPaise: number) {
    if (!this.isDevBypassEnabled()) {
      throw new ForbiddenException('Dev wallet top-up is disabled');
    }
    return this.addBalance(userId, amountPaise, 'Credits added (dev test — no payment)');
  }
}
