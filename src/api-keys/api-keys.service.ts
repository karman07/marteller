import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash, randomBytes } from 'crypto';
import { ApiKey, ApiKeyDocument } from './schemas/api-key.schema';

const KEY_PREFIX = 'mrt_';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectModel(ApiKey.name) private readonly model: Model<ApiKeyDocument>,
  ) {}

  list(userId: string) {
    return this.model
      .find({ userId })
      .select('-keyHash')
      .sort({ createdAt: -1 })
      .exec();
  }

  async create(userId: string, name: string) {
    const rawKey = `${KEY_PREFIX}${randomBytes(24).toString('hex')}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 12);

    const doc = await this.model.create({ userId, name, keyHash, keyPrefix });

    return {
      id: doc.id,
      name: doc.name,
      keyPrefix: doc.keyPrefix,
      key: rawKey,
      createdAt: (doc as ApiKeyDocument).get('createdAt') as Date,
    };
  }

  async remove(userId: string, id: string) {
    const res = await this.model.deleteOne({ _id: id, userId }).exec();
    if (res.deletedCount === 0)
      throw new NotFoundException('API key not found');
    return { deleted: true };
  }

  // Used by ApiKeyOrJwtGuard for server-to-server calls (e.g. sending mail
  // via the REST API instead of the dashboard). Previously nothing in this
  // codebase actually validated a key against this hash — keys could be
  // created but never used to authenticate a request.
  async verifyKey(rawKey: string) {
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const key = await this.model.findOne({ keyHash }).exec();
    if (!key) return null;
    this.model
      .updateOne({ _id: key._id }, { lastUsedAt: new Date() })
      .exec()
      .catch(() => {});
    return { userId: key.userId };
  }
}
