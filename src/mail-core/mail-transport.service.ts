import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import type { DkimForSend } from './mail-domains.service';

export type OutboundMailParams = {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  messageId: string;
  dkim: DkimForSend;
  attachments?: { filename: string; path: string; contentType?: string }[];
  // SMTP envelope sender (MAIL FROM) — distinct from the visible From:
  // header. Set to a per-message VERP address (bounce+<id>@domain) so a
  // bounce DSN comes back addressed to something we can trace to the
  // original EmailMessage; see MailQueueProcessor and MailInboundService.
  envelopeFrom?: string;
};

export type OutboundMailResult = {
  accepted: string[];
  rejected: string[];
  response: string;
};

// The only thing in this app that speaks SMTP to the outside world — every
// other piece of the mail feature (queue, providers, submission gateway)
// funnels through here. Delivers to a local, trusted MTA hop (self-hosted
// Postfix, per the approved architecture) which owns actual internet
// delivery, retries, and bounce generation; this service's job is just to
// hand it a fully-formed, DKIM-signed message.
@Injectable()
export class MailTransportService {
  private readonly logger = new Logger(MailTransportService.name);
  private transport?: Transporter;

  constructor(private readonly config: ConfigService) {}

  private getTransport(): Transporter {
    if (!this.transport) {
      this.transport = nodemailer.createTransport({
        host: this.config.get<string>('MAIL_RELAY_HOST') ?? '127.0.0.1',
        port: Number(this.config.get<string>('MAIL_RELAY_PORT') ?? 25),
        secure: this.config.get<string>('MAIL_RELAY_SECURE') === 'true',
        // Loopback hop to the local Postfix instance — the submission
        // gateway (or the queue worker, for API/dashboard sends) already
        // authenticated and authorized the original sender, so this
        // internal relay hop doesn't re-authenticate.
        ignoreTLS: this.config.get<string>('MAIL_RELAY_SECURE') !== 'true',
      });
    }
    return this.transport;
  }

  async send(params: OutboundMailParams): Promise<OutboundMailResult> {
    const transport = this.getTransport();
    type SendMailInfo = {
      accepted: unknown[];
      rejected: unknown[];
      response: string;
    };
    const info = (await transport.sendMail({
      from: params.from,
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
      subject: params.subject,
      html: params.html,
      text: params.text ?? (params.html ? undefined : ' '),
      messageId: params.messageId,
      attachments: params.attachments,
      envelope: params.envelopeFrom
        ? {
            from: params.envelopeFrom,
            to: [...params.to, ...(params.cc ?? []), ...(params.bcc ?? [])],
          }
        : undefined,
      dkim: {
        domainName: params.dkim.domainName,
        keySelector: params.dkim.keySelector,
        privateKey: params.dkim.privateKey,
      },
    })) as SendMailInfo;
    this.logger.log(
      `Handed off ${params.messageId} to relay: ${info.response}`,
    );
    return {
      accepted: (info.accepted ?? []).map(String),
      rejected: (info.rejected ?? []).map(String),
      response: info.response ?? '',
    };
  }
}
