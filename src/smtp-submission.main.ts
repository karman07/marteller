import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import { AppModule } from './app.module';
import { MailCredentialsService } from './mail/mail-credentials.service';
import { MailService } from './mail/mail.service';
import { MailDomainsService } from './mail-core/mail-domains.service';

// The authenticated front door for smtp.<platform-domain>:587 — see the
// approved architecture: this process owns AUTH + per-user authorization
// only. Once a message is accepted it's handed to MailService.send, the
// exact same queued/tracked path the dashboard and REST API use. It never
// talks to the internet directly — that's the local Postfix relay's job
// (MailTransportService), reached only after MailService has queued the
// send.
async function bootstrap() {
  const logger = new Logger('SmtpSubmission');
  const app = await NestFactory.createApplicationContext(AppModule);

  const mailCredentialsService = app.get(MailCredentialsService);
  const mailDomainsService = app.get(MailDomainsService);
  const mailService = app.get(MailService);

  const tlsKeyPath = process.env.SMTP_TLS_KEY_PATH;
  const tlsCertPath = process.env.SMTP_TLS_CERT_PATH;
  const tls =
    tlsKeyPath && tlsCertPath
      ? { key: readFileSync(tlsKeyPath), cert: readFileSync(tlsCertPath) }
      : undefined;
  if (!tls) {
    logger.warn(
      'SMTP_TLS_KEY_PATH/SMTP_TLS_CERT_PATH not set — starting WITHOUT STARTTLS. Do not expose this port to untrusted networks like this.',
    );
  }

  const server = new SMTPServer({
    ...tls,
    authOptional: false,
    disabledCommands: tls ? [] : ['STARTTLS'],
    size: 25 * 1024 * 1024,

    // Both handlers below are typed by smtp-server to return void — the
    // real (async) work runs in a detached IIFE that resolves `callback`
    // itself, matching the pattern in mail-inbound.main.ts.
    onAuth(auth, _session, callback) {
      void (async () => {
        try {
          const result = await mailCredentialsService.verifyCredential(
            auth.username ?? '',
            auth.password ?? '',
          );
          if (!result)
            return callback(new Error('Invalid username or password'));
          callback(null, { user: result });
        } catch (err) {
          callback(err instanceof Error ? err : new Error('Auth failed'));
        }
      })();
    },

    onData(stream, session, callback) {
      void (async () => {
        try {
          const user = session.user as
            { userId: string; domainId?: string } | undefined;
          if (!user) return callback(new Error('Not authenticated'));

          const parsed = await simpleParser(stream);
          const fromAddress = parsed.from?.value[0]?.address;
          if (!fromAddress) return callback(new Error('Missing From address'));

          if (user.domainId) {
            const allowedDomains = await mailDomainsService.list(user.userId);
            const restricted = allowedDomains.find(
              (d) =>
                (d._id as { toString(): string }).toString() === user.domainId,
            );
            const fromDomain = fromAddress.split('@')[1]?.toLowerCase();
            if (!restricted || restricted.domain !== fromDomain) {
              return callback(
                new Error(
                  `This credential can only send from ${restricted?.domain ?? 'a specific domain'}`,
                ),
              );
            }
          }

          const to = (session.envelope.rcptTo ?? []).map((r) => r.address);
          await mailService.send(user.userId, {
            from: fromAddress,
            to,
            subject: parsed.subject ?? '(no subject)',
            html: typeof parsed.html === 'string' ? parsed.html : undefined,
            text: parsed.text,
          });
          callback();
        } catch (err) {
          callback(err instanceof Error ? err : new Error('Send failed'));
        }
      })();
    },
  });

  const port = Number(process.env.SMTP_SUBMISSION_PORT ?? 587);
  server.listen(port, () =>
    logger.log(`SMTP submission gateway listening on :${port}`),
  );
}
void bootstrap();
