import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StaffActivity, StaffActivityDocument } from './schemas/staff-activity.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class StaffActivityService {
  private readonly logger = new Logger(StaffActivityService.name);

  constructor(
    @InjectModel(StaffActivity.name)
    private readonly model: Model<StaffActivityDocument>,
    private readonly usersService: UsersService,
  ) {}

  // Best-effort and never awaited by its callers for its result — a
  // logging failure must never break the actual action (lead update,
  // verification review, etc.) it's recording.
  async log(
    staffUserId: string,
    action: string,
    summary: string,
    target?: { targetUserId?: string; targetLeadId?: string },
  ) {
    try {
      const staff = await this.usersService.findById(staffUserId);
      await this.model.create({
        staffUserId,
        staffName: staff?.name || staff?.email || 'Unknown',
        staffRole: staff?.role === 'admin' ? 'admin' : 'sales',
        action,
        summary,
        ...target,
      });
    } catch (err) {
      this.logger.warn(
        `Failed to log staff activity (${action}): ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  listRecent(limit = 100) {
    return this.model.find().sort({ createdAt: -1 }).limit(limit).exec();
  }

  listForStaff(staffUserId: string, limit = 100) {
    return this.model.find({ staffUserId }).sort({ createdAt: -1 }).limit(limit).exec();
  }
}
