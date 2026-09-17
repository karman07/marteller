import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { MailTransportService } from './mail-transport.service';
import { SystemMailLog, SystemMailLogDocument } from './schemas/system-mail-log.schema';

// Internal platform notifications (verification approved/rejected, and
// whatever else system mail gets added later) — deliberately NOT routed
// through MailService (backend/src/mail/mail.service.ts). That path is
// tenant/self-serve infra: it requires the caller's own verified
// MailDomain, debits the caller's wallet, and DKIM-signs with the caller's
// own domain key. None of that fits "Marteller sends its own user a
// system email" — inventing a fake wallet-funded tenant user just to
// satisfy that path would be more coupling than this needs.
//
// Instead this calls MailTransportService directly (the actual "only
// thing that speaks SMTP to the outside world" — see its own doc
// comment), signing with a platform-owned DKIM key read from config, and
// logs every attempt to SystemMailLog since it bypasses MailService's
// EmailMessage/EmailEvent tracking entirely.
//
// Requires SYSTEM_MAIL_FROM, SYSTEM_MAIL_DOMAIN, SYSTEM_MAIL_DKIM_SELECTOR,
// and SYSTEM_MAIL_DKIM_PRIVATE_KEY in the environment (see backend/.env).
// The DKIM public key must also be published as a DNS TXT record at
// <selector>._domainkey.<SYSTEM_MAIL_DOMAIN> — same requirement any tenant
// domain has, see mail-domains.service.ts's dnsRecords(). If any of these
// are unset, send() logs a warning and returns without throwing — a
// missing/incomplete mail config must never block the action that
// triggered the notification (e.g. approving a verification).
@Injectable()
export class SystemMailService {
  private readonly logger = new Logger(SystemMailService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly mailTransportService: MailTransportService,
    @InjectModel(SystemMailLog.name)
    private readonly logModel: Model<SystemMailLogDocument>,
  ) {}

  private isConfigured(): boolean {
    return !!(
      this.config.get<string>('SYSTEM_MAIL_FROM') &&
      this.config.get<string>('SYSTEM_MAIL_DOMAIN') &&
      this.config.get<string>('SYSTEM_MAIL_DKIM_SELECTOR') &&
      this.config.get<string>('SYSTEM_MAIL_DKIM_PRIVATE_KEY')
    );
  }

  async send(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
    template: string;
  }) {
    if (!this.isConfigured()) {
      this.logger.warn(
        `Skipping system mail "${params.template}" to ${params.to} — SYSTEM_MAIL_* env vars not set.`,
      );
      return;
    }

    const from = this.config.getOrThrow<string>('SYSTEM_MAIL_FROM');
    const domainName = this.config.getOrThrow<string>('SYSTEM_MAIL_DOMAIN');
    const keySelector = this.config.getOrThrow<string>(
      'SYSTEM_MAIL_DKIM_SELECTOR',
    );
    const privateKey = this.config
      .getOrThrow<string>('SYSTEM_MAIL_DKIM_PRIVATE_KEY')
      // .env stores the PEM with literal "\n" escapes (can't contain real
      // newlines in a single env var line) — unescape before use.
      .replace(/\\n/g, '\n');

    try {
      await this.mailTransportService.send({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        messageId: `<${randomUUID()}@${domainName}>`,
        dkim: { domainName, keySelector, privateKey },
      });
      await this.logModel.create({
        to: params.to,
        subject: params.subject,
        template: params.template,
        status: 'sent',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to send system mail "${params.template}" to ${params.to}: ${message}`,
      );
      await this.logModel.create({
        to: params.to,
        subject: params.subject,
        template: params.template,
        status: 'failed',
        error: message,
      });
    }
  }
}
