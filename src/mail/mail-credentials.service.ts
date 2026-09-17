import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  MailCredential,
  MailCredentialDocument,
} from './schemas/mail-credential.schema';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class MailCredentialsService {
  constructor(
    @InjectModel(MailCredential.name)
    private readonly model: Model<MailCredentialDocument>,
  ) {}

  list(userId: string) {
    return this.model
      .find({ userId })
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .exec();
  }

  async create(userId: string, label: string, domainId?: string) {
    const username = `smtp_${randomBytes(6).toString('hex')}`;
    const password = randomBytes(18).toString('base64url');
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const doc = await this.model.create({
      userId,
      label,
      domainId,
      username,
      passwordHash,
    });

    // Raw password is returned exactly once, here — same convention as
    // ApiKeysService.create, never stored or retrievable again.
    return {
      id: doc.id,
      label: doc.label,
      username: doc.username,
      password,
      host: 'smtp.<your-platform-domain>',
      port: 587,
      createdAt: (doc as MailCredentialDocument).get('createdAt'),
    };
  }

  async revoke(userId: string, id: string) {
    const res = await this.model
      .updateOne({ _id: id, userId }, { status: 'revoked' })
      .exec();
    if (res.matchedCount === 0)
      throw new NotFoundException('Credential not found');
    return { revoked: true };
  }

  // Used by the SMTP submission gateway — looks up by username, verifies
  // the password with bcrypt, and returns the owning userId + allowed
  // domain restriction (if any). Never used from the HTTP API surface.
  async verifyCredential(username: string, password: string) {
    const cred = await this.model
      .findOne({ username, status: 'active' })
      .exec();
    if (!cred) return null;
    const valid = await bcrypt.compare(password, cred.passwordHash);
    if (!valid) return null;
    this.model
      .updateOne({ _id: cred._id }, { lastUsedAt: new Date() })
      .exec()
      .catch(() => {});
    return {
      userId: cred.userId,
      domainId: cred.domainId,
      credentialId: (cred._id as { toString(): string }).toString(),
    };
  }
}
