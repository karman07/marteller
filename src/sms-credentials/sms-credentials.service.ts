import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SmsCredential, SmsCredentialDocument } from './schemas/sms-credential.schema';
import { UpsertSmsCredentialDto } from './dto/upsert-sms-credential.dto';

@Injectable()
export class SmsCredentialsService {
  constructor(
    @InjectModel(SmsCredential.name)
    private readonly model: Model<SmsCredentialDocument>,
  ) {}

  findByUserId(userId: string) {
    return this.model.findOne({ userId }).exec();
  }

  // Upsert rather than create-only — sales/admin re-running this on an
  // already-configured user (rotating a key, switching route/sender)
  // should just overwrite, not require a separate "update" call.
  upsert(userId: string, dto: UpsertSmsCredentialDto, configuredByUserId: string) {
    return this.model
      .findOneAndUpdate(
        { userId },
        {
          userId,
          apiKey: dto.apiKey,
          route: dto.route ?? 'q',
          senderId: dto.senderId,
          configuredByUserId,
        },
        { upsert: true, new: true },
      )
      .exec();
  }

  async remove(userId: string) {
    const res = await this.model.deleteOne({ userId }).exec();
    if (res.deletedCount === 0) {
      throw new NotFoundException('No SMS provider configured for this user');
    }
    return { deleted: true };
  }
}
