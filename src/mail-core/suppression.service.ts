import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SuppressionEntry,
  SuppressionEntryDocument,
  SuppressionReason,
} from './schemas/suppression-entry.schema';

@Injectable()
export class SuppressionService {
  constructor(
    @InjectModel(SuppressionEntry.name)
    private readonly model: Model<SuppressionEntryDocument>,
  ) {}

  list(userId: string) {
    return this.model.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async isSuppressed(userId: string, email: string): Promise<boolean> {
    const found = await this.model
      .findOne({ userId, email: email.toLowerCase() })
      .select('_id')
      .exec();
    return !!found;
  }

  // Upsert — a manual add shouldn't fail just because a bounce already
  // suppressed the same address, and re-bouncing an already-suppressed
  // address is a no-op rather than a duplicate-key error.
  async add(
    userId: string,
    email: string,
    reason: SuppressionReason,
    source?: string,
  ) {
    return this.model
      .findOneAndUpdate(
        { userId, email: email.toLowerCase() },
        { $set: { reason, source } },
        { upsert: true, new: true },
      )
      .exec();
  }

  async remove(userId: string, id: string) {
    const res = await this.model.deleteOne({ _id: id, userId }).exec();
    if (res.deletedCount === 0)
      throw new NotFoundException('Suppression entry not found');
    return { deleted: true };
  }
}
