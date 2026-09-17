import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { generateKeyPairSync, randomBytes } from 'crypto';
import { promises as dns } from 'dns';
import { MailDomain, MailDomainDocument } from './schemas/mail-domain.schema';
import { decryptSecret, encryptSecret } from './mail-crypto.util';

export type DkimForSend = {
  domainName: string;
  keySelector: string;
  privateKey: string;
};

function newSelector(): string {
  // Short, DNS-label-safe, unique enough to allow future key rotation
  // (a rotated key just gets a new selector alongside the old one).
  return `mrt${randomBytes(3).toString('hex')}`;
}

function newVerificationToken(): string {
  return randomBytes(16).toString('hex');
}

// The encrypted DKIM private key material (ciphertext/IV/authTag) must
// never leave the server, even encrypted — getDkimForSend is the only
// consumer that needs it. Every method that returns a domain to an HTTP
// caller (list/create/verify/setDefault) goes through this first.
function toClientDomain(doc: MailDomainDocument) {
  const obj = doc.toObject();
  delete (obj as Partial<typeof obj>).dkimPrivateKeyCiphertext;
  delete (obj as Partial<typeof obj>).dkimPrivateKeyIv;
  delete (obj as Partial<typeof obj>).dkimPrivateKeyAuthTag;
  return obj;
}

@Injectable()
export class MailDomainsService {
  constructor(
    @InjectModel(MailDomain.name)
    private readonly model: Model<MailDomainDocument>,
    private readonly config: ConfigService,
  ) {}

  async list(userId: string) {
    const domains = await this.model
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
    return domains.map(toClientDomain);
  }

  async create(userId: string, domainInput: string) {
    const domain = domainInput.trim().toLowerCase();
    if (
      !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(
        domain,
      )
    ) {
      throw new BadRequestException(
        'Enter a valid domain name (e.g. mail.yourcompany.com)',
      );
    }

    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const encrypted = encryptSecret(this.config, privateKey);

    try {
      const created = await this.model.create({
        userId,
        domain,
        status: 'pending',
        verificationToken: newVerificationToken(),
        dkimSelector: newSelector(),
        dkimPublicKeyPem: publicKey,
        dkimPrivateKeyCiphertext: encrypted.ciphertext,
        dkimPrivateKeyIv: encrypted.iv,
        dkimPrivateKeyAuthTag: encrypted.authTag,
      });
      return toClientDomain(created);
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: number }).code === 11000
      ) {
        throw new BadRequestException(
          'This domain is already added to your account, or verified by another account.',
        );
      }
      throw err;
    }
  }

  async remove(userId: string, id: string) {
    const res = await this.model.deleteOne({ _id: id, userId }).exec();
    if (res.deletedCount === 0) throw new NotFoundException('Domain not found');
    return { deleted: true };
  }

  async setDefault(userId: string, id: string) {
    const domain = await this.model.findOne({ _id: id, userId }).exec();
    if (!domain) throw new NotFoundException('Domain not found');
    if (domain.status !== 'verified') {
      throw new BadRequestException(
        'Verify this domain before making it the default sender',
      );
    }
    await this.model.updateMany({ userId }, { isDefault: false }).exec();
    domain.isDefault = true;
    await domain.save();
    return toClientDomain(domain);
  }

  // For the DNS-instructions endpoint only — dnsRecords() below only ever
  // reads public fields off this, but it's kept separate from list()
  // (which returns client-safe sanitized objects) so this lookup path
  // isn't tied to that sanitization contract.
  findOne(userId: string, id: string) {
    return this.model.findOne({ _id: id, userId }).exec();
  }

  // DNS instructions shown in the dashboard — public key + verification
  // token only, never the private key.
  dnsRecords(domain: MailDomainDocument) {
    return {
      verification: {
        type: 'TXT',
        host: `_mrtverify.${domain.domain}`,
        value: domain.verificationToken,
      },
      dkim: {
        type: 'TXT',
        host: `${domain.dkimSelector}._domainkey.${domain.domain}`,
        value: `v=DKIM1; k=rsa; p=${domain.dkimPublicKeyPem
          .replace(/-----BEGIN PUBLIC KEY-----/, '')
          .replace(/-----END PUBLIC KEY-----/, '')
          .replace(/\s+/g, '')}`,
      },
      spf: {
        type: 'TXT',
        host: domain.domain,
        value: 'v=spf1 a mx ~all',
        note: 'Add our outbound sending IPs to this record once assigned — see the setup runbook.',
      },
      dmarc: {
        type: 'TXT',
        host: `_dmarc.${domain.domain}`,
        value:
          'v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@' + domain.domain,
      },
    };
  }

  private isDevBypassEnabled(): boolean {
    return (
      this.config.get<string>('NODE_ENV') !== 'production' &&
      this.config.get<string>('DEV_PHONE_AUTH_BYPASS') === 'true'
    );
  }

  async verify(userId: string, id: string) {
    const domain = await this.model.findOne({ _id: id, userId }).exec();
    if (!domain) throw new NotFoundException('Domain not found');

    domain.lastCheckedAt = new Date();

    // Same dev-bypass convention as AuthService's phone-OTP shortcut — lets
    // the add-domain -> verify -> send flow be exercised through the real
    // dashboard UI without owning real DNS for a test domain. Hard-gated on
    // NODE_ENV, exactly like the existing bypass; never applies in prod.
    if (this.isDevBypassEnabled()) {
      domain.status = 'verified';
      domain.verifiedAt = new Date();
      await domain.save();
      return toClientDomain(domain);
    }

    try {
      const records = await dns.resolveTxt(`_mrtverify.${domain.domain}`);
      const found = records.some(
        (r) => r.join('').trim() === domain.verificationToken,
      );
      if (found) {
        domain.status = 'verified';
        domain.verifiedAt = new Date();
      } else {
        domain.status = 'failed';
      }
    } catch {
      domain.status = 'failed';
    }

    await domain.save();
    return toClientDomain(domain);
  }

  // Resolves the sending domain for a rich send where the caller specified
  // an explicit From address — the domain must be this user's and verified.
  async getVerifiedDomainByName(userId: string, domainName: string) {
    const domain = await this.model
      .findOne({ userId, domain: domainName.toLowerCase(), status: 'verified' })
      .exec();
    if (!domain) {
      throw new BadRequestException(
        `"${domainName}" is not a verified sending domain on your account. Add and verify it first.`,
      );
    }
    return domain;
  }

  // Resolves the sending domain for paths that don't specify a From address
  // (e.g. the generic template-blast provider) — falls back to the user's
  // first verified domain if no default is set. Deliberately does NOT fall
  // back to a shared platform domain: pooling unrelated users' mail onto one
  // sending identity/reputation is an anti-pattern for a multi-tenant
  // sending platform.
  async getDefaultDomain(userId: string) {
    const domain =
      (await this.model
        .findOne({ userId, status: 'verified', isDefault: true })
        .exec()) ??
      (await this.model
        .findOne({ userId, status: 'verified' })
        .sort({ createdAt: 1 })
        .exec());
    if (!domain) {
      throw new BadRequestException(
        'Add and verify a sending domain in Mail → Domains before sending email.',
      );
    }
    return domain;
  }

  getDkimForSend(domain: MailDomainDocument): DkimForSend {
    const privateKey = decryptSecret(this.config, {
      ciphertext: domain.dkimPrivateKeyCiphertext,
      iv: domain.dkimPrivateKeyIv,
      authTag: domain.dkimPrivateKeyAuthTag,
    });
    return {
      domainName: domain.domain,
      keySelector: domain.dkimSelector,
      privateKey,
    };
  }

  // Used by the inbound path to map a recipient's domain back to the owning
  // user — only verified domains are eligible to receive.
  findVerifiedByDomainName(domainName: string) {
    return this.model
      .findOne({ domain: domainName.toLowerCase(), status: 'verified' })
      .exec();
  }
}
