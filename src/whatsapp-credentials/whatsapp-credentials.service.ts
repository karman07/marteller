import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WhatsAppCredential, WhatsAppCredentialDocument } from './schemas/whatsapp-credential.schema';
import { UpsertWhatsAppCredentialDto } from './dto/upsert-whatsapp-credential.dto';

@Injectable()
export class WhatsAppCredentialsService {
  constructor(
    @InjectModel(WhatsAppCredential.name)
    private readonly model: Model<WhatsAppCredentialDocument>,
  ) {}

  findByUserId(userId: string) {
    return this.model.findOne({ userId }).exec();
  }

  // Upsert rather than create-only — sales/admin re-running this on an
  // already-configured user (rotating a token, switching phone number)
  // should just overwrite, not require a separate "update" call.
  upsert(userId: string, dto: UpsertWhatsAppCredentialDto, configuredByUserId: string) {
    return this.model
      .findOneAndUpdate(
        { userId },
        {
          userId,
          phoneNumberId: dto.phoneNumberId,
          apiKey: dto.apiKey,
          wabaId: dto.wabaId,
          configuredByUserId,
        },
        { upsert: true, new: true },
      )
      .exec();
  }

  async remove(userId: string) {
    const res = await this.model.deleteOne({ userId }).exec();
    if (res.deletedCount === 0) {
      throw new NotFoundException('No WhatsApp provider configured for this user');
    }
    return { deleted: true };
  }
}
