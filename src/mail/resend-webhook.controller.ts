import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';
import {
  EmailMessage,
  EmailMessageDocument,
} from './schemas/email-message.schema';
import { SuppressionService } from '../mail-core/suppression.service';
import { MailService } from './mail.service';

type ResendEvent = {
  type: string;
  data: {
    email_id?: string;
    to?: string[];
    bounce?: { type?: string; message?: string };
  };
};

// Delivery feedback for MAIL_PROVIDER=resend — the replacement for the
// VERP/DSN bounce path (MailInboundService.tryProcessBounce), which only
// exists when we run our own MTA. Point a Resend webhook at
// POST /mail/webhooks/resend and set RESEND_WEBHOOK_SECRET (the "whsec_…"
// signing secret). Unauthenticated by design; the Svix signature is the auth.
@Controller('mail/webhooks')
export class ResendWebhookController {
  private readonly logger = new Logger(ResendWebhookController.name);

  constructor(
    private readonly config: ConfigService,
    @InjectModel(EmailMessage.name)
    private readonly model: Model<EmailMessageDocument>,
    private readonly suppressionService: SuppressionService,
    private readonly mailService: MailService,
  ) {}

  private verifySignature(
    raw: Buffer,
    id: string,
    timestamp: string,
    signatureHeader: string,
  ) {
    const secret = this.config.get<string>('RESEND_WEBHOOK_SECRET');
    if (!secret) throw new UnauthorizedException('Webhook secret not configured');
    // Reject replays older than 5 minutes.
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
      throw new UnauthorizedException('Stale webhook timestamp');
    }
    const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
    const expected = createHmac('sha256', key)
      .update(`${id}.${timestamp}.${raw.toString('utf8')}`)
      .digest();
    const ok = signatureHeader
      .split(' ')
      .map((part) => part.split(',')[1] ?? '')
      .some((sig) => {
        const given = Buffer.from(sig, 'base64');
        return given.length === expected.length && timingSafeEqual(given, expected);
      });
    if (!ok) throw new UnauthorizedException('Invalid webhook signature');
  }

  @Post('resend')
  @HttpCode(200)
  async handle(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('svix-id') id = '',
    @Headers('svix-timestamp') timestamp = '',
    @Headers('svix-signature') signature = '',
  ) {
    if (!req.rawBody) throw new BadRequestException('Missing raw body');
    this.verifySignature(req.rawBody, id, timestamp, signature);

    const event = JSON.parse(req.rawBody.toString('utf8')) as ResendEvent;
    const emailId = event.data?.email_id;
    if (!emailId) return { ok: true };

    const email = await this.model.findOne({ providerMessageId: emailId }).exec();
    if (!email) return { ok: true }; // not one of ours (or not recorded yet)

    switch (event.type) {
      case 'email.delivered':
        email.status = 'delivered';
        await email.save();
        await this.mailService.recordEvent(email.userId, email.id, 'delivered');
        break;
      case 'email.delivery_delayed':
        await this.mailService.recordEvent(email.userId, email.id, 'deferred');
        break;
      case 'email.bounced': {
        const hard = event.data.bounce?.type?.toLowerCase() === 'permanent';
        email.status = 'bounced';
        await email.save();
        await this.mailService.recordEvent(email.userId, email.id, 'bounced', {
          bounceType: hard ? 'hard' : 'soft',
          diagnosticCode: event.data.bounce?.message,
        });
        if (hard) {
          for (const addr of event.data.to ?? email.to) {
            await this.suppressionService.add(
              email.userId,
              addr,
              'hard_bounce',
              'Automatic — Resend permanent bounce',
            );
          }
        }
        break;
      }
      case 'email.complained':
        await this.mailService.recordEvent(email.userId, email.id, 'complained');
        for (const addr of event.data.to ?? email.to) {
          await this.suppressionService.add(
            email.userId,
            addr,
            'complaint',
            'Automatic — Resend spam complaint',
          );
        }
        break;
      case 'email.opened':
        await this.mailService.recordEvent(email.userId, email.id, 'opened');
        break;
      case 'email.clicked':
        await this.mailService.recordEvent(email.userId, email.id, 'clicked');
        break;
      default:
        this.logger.debug(`Ignoring Resend event ${event.type}`);
    }
    return { ok: true };
  }
}
