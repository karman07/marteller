import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ResendDnsRecord = {
  record: string; // 'SPF' | 'DKIM' | 'Receiving'
  name: string;
  type: string;
  value: string;
  ttl?: string;
  status?: string;
  priority?: number;
};

export type ResendDomain = {
  id: string;
  name: string;
  status: string; // not_started | pending | verified | failed | temporary_failure
  records?: ResendDnsRecord[];
};

// Thrown for 4xx responses (other than 429) — the request itself is wrong
// (invalid recipient, unverified domain, bad key), so retrying can't help.
// MailQueueProcessor treats this as a permanent failure.
export class ResendPermanentError extends Error {}

// Thin wrapper over Resend's REST API (no SDK dependency — we only need a
// handful of endpoints). Active when MAIL_PROVIDER=resend; see
// MailTransportService and MailDomainsService for the call sites.
@Injectable()
export class ResendService implements OnModuleInit {
  private readonly logger = new Logger(ResendService.name);

  constructor(private readonly config: ConfigService) {}

  // Resend is used when MAIL_PROVIDER=resend, or when MAIL_PROVIDER is unset
  // and RESEND_API_KEY exists. Set MAIL_PROVIDER=smtp to force the SMTP relay.
  isEnabled(): boolean {
    const provider = this.config.get<string>('MAIL_PROVIDER');
    if (provider) return provider === 'resend';
    return !!this.config.get<string>('RESEND_API_KEY');
  }

  onModuleInit() {
    if (!this.isEnabled()) {
      this.logger.warn(
        'Mail provider: SMTP relay (Resend not configured — set RESEND_API_KEY to use Resend)',
      );
    } else if (!this.config.get<string>('RESEND_API_KEY')) {
      this.logger.error(
        'MAIL_PROVIDER=resend but RESEND_API_KEY is missing — every send will fail',
      );
    } else {
      this.logger.log('Mail provider: Resend');
    }
  }

  private apiKey(): string {
    const key = this.config.get<string>('RESEND_API_KEY');
    if (!key) {
      throw new ResendPermanentError(
        'MAIL_PROVIDER=resend but RESEND_API_KEY is not set',
      );
    }
    return key;
  }

  private async call<T>(
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<T> {
    const base =
      this.config.get<string>('RESEND_API_URL') ?? 'https://api.resend.com';
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey()}`,
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let data: unknown = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      // non-JSON error body — fall through with raw text in the message
    }
    if (!res.ok) {
      const message =
        (data as { message?: string }).message ??
        `Resend ${method} ${path} failed (${res.status})`;
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        throw new ResendPermanentError(message);
      }
      throw new Error(message); // 429 / 5xx — transient, let the queue retry
    }
    return data as T;
  }

  async sendEmail(params: {
    from: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    html?: string;
    text?: string;
    messageId: string;
    attachments?: { filename: string; content: string }[];
  }): Promise<{ id: string }> {
    return this.call<{ id: string }>(
      'POST',
      '/emails',
      {
        from: params.from,
        to: params.to,
        cc: params.cc?.length ? params.cc : undefined,
        bcc: params.bcc?.length ? params.bcc : undefined,
        subject: params.subject,
        html: params.html,
        text: params.text,
        attachments: params.attachments?.length ? params.attachments : undefined,
      },
      // Queue retries after a timeout must not double-send.
      { 'Idempotency-Key': params.messageId.replace(/[<>]/g, '') },
    );
  }

  createDomain(name: string) {
    return this.call<ResendDomain>('POST', '/domains', { name });
  }

  getDomain(id: string) {
    return this.call<ResendDomain>('GET', `/domains/${id}`);
  }

  async verifyDomain(id: string) {
    await this.call('POST', `/domains/${id}/verify`);
    return this.getDomain(id);
  }

  async deleteDomain(id: string) {
    try {
      await this.call('DELETE', `/domains/${id}`);
    } catch (err) {
      this.logger.warn(
        `Could not delete Resend domain ${id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
