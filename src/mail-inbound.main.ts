import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import { AppModule } from './app.module';
import {
  MailInboundService,
  ParsedInboundEmail,
} from './mail/mail-inbound.service';

// The local hop Postfix's inbound MTA (port 25, internet-facing, behind
// rspamd) delivers accepted mail to — see the approved architecture's
// "inbound receiving" section. This process itself never talks to the
// internet; it only trusts connections from the loopback/local network
// Postfix runs on, which is why it accepts mail unauthenticated.
function toAddressList(value: unknown): string[] {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr.flatMap((v) => {
    const addrObj = v as { value?: { address?: string }[] };
    return (addrObj.value ?? [])
      .map((a) => a.address)
      .filter((a): a is string => !!a);
  });
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

async function bootstrap() {
  const logger = new Logger('MailInbound');
  const app = await NestFactory.createApplicationContext(AppModule);
  const mailInboundService = app.get(MailInboundService);

  const server = new SMTPServer({
    authOptional: true,
    disabledCommands: ['AUTH', 'STARTTLS'],
    size: 35 * 1024 * 1024,

    onData(stream, session, callback) {
      // smtp-server's onData is typed to return void — the real work is
      // async, so it runs in a detached IIFE that always resolves the
      // callback itself rather than via a returned promise.
      void (async () => {
        try {
          const raw = await streamToBuffer(stream);
          const parsed = await simpleParser(raw);

          const envelopeFrom = session.envelope.mailFrom
            ? session.envelope.mailFrom.address
            : undefined;
          const from = parsed.from?.value[0]?.address ?? envelopeFrom;
          const to =
            toAddressList(parsed.to).length > 0
              ? toAddressList(parsed.to)
              : (session.envelope.rcptTo ?? []).map((r) => r.address);

          if (!from || !parsed.messageId || to.length === 0) {
            logger.warn('Skipping inbound message missing From/Message-ID/To');
            return callback();
          }

          const email: ParsedInboundEmail = {
            messageId: parsed.messageId,
            from,
            to,
            subject: parsed.subject,
            text: parsed.text,
            html: typeof parsed.html === 'string' ? parsed.html : undefined,
            inReplyTo: parsed.inReplyTo,
            references: Array.isArray(parsed.references)
              ? parsed.references
              : parsed.references
                ? [parsed.references]
                : [],
            attachments: parsed.attachments.map((a) => ({
              filename: a.filename ?? 'attachment',
              contentType: a.contentType,
              content: a.content,
            })),
            raw,
          };

          await mailInboundService.processInbound(email);
          callback();
        } catch (err) {
          logger.error(
            `Failed to process inbound message: ${err instanceof Error ? err.message : err}`,
          );
          // Ack anyway — a parsing bug on our side shouldn't cause Postfix to
          // keep retrying/bouncing a message that was already accepted from
          // the internet at the MX hop.
          callback();
        }
      })();
    },
  });

  const port = Number(process.env.MAIL_INBOUND_LOCAL_PORT ?? 2525);
  server.listen(port, '127.0.0.1', () =>
    logger.log(`Mail inbound listener on 127.0.0.1:${port}`),
  );
}
void bootstrap();
