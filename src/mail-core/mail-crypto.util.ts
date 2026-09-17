import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export type EncryptedSecret = {
  ciphertext: string;
  iv: string;
  authTag: string;
};

// DKIM private keys are the one credential in this app that must never be
// readable straight out of Mongo (see AiConfig.ownApiKeys, which is stored
// in plaintext — deliberately not repeating that here since these keys can
// impersonate a verified sending domain). AES-256-GCM with a key that lives
// only in the environment, never in the database.
function getKey(config: ConfigService): Buffer {
  const raw = config.get<string>('MAIL_DKIM_ENCRYPTION_KEY');
  if (!raw) {
    throw new BadRequestException(
      'Mail is not configured on this server (missing MAIL_DKIM_ENCRYPTION_KEY).',
    );
  }
  const key = Buffer.from(raw, 'hex');
  if (key.length !== 32) {
    throw new BadRequestException(
      'MAIL_DKIM_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).',
    );
  }
  return key;
}

export function encryptSecret(
  config: ConfigService,
  plaintext: string,
): EncryptedSecret {
  const key = getKey(config);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

export function decryptSecret(
  config: ConfigService,
  encrypted: EncryptedSecret,
): string {
  const key = getKey(config);
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(encrypted.iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(encrypted.authTag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}
