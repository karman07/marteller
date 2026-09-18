import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { WalletTransaction, WalletTransactionDocument } from './schemas/wallet-transaction.schema';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(WalletTransaction.name)
    private readonly transactionModel: Model<WalletTransactionDocument>,
  ) {}

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

  // Dev-level top-up — no real payment gateway yet, this credits the wallet
  // directly. Clearly a test top-up; swap for a real payment webhook later.
  // `description` distinguishes a self-service top-up from one an admin/
  // sales rep pushed on the customer's behalf (see AdminController/
  // SalesController's add-balance routes) — shows up as-is in the
  // customer's own transaction history for transparency.
  async addBalance(userId: string, amountPaise: number, description = 'Balance top-up') {
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
      throw new BadRequestException('Insufficient balance. Add funds to continue.');
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
}
