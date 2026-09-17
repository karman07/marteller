import { Module } from '@nestjs/common';
import { MailCoreModule } from '../../mail-core/mail-core.module';
import { SmsCredentialsModule } from '../../sms-credentials/sms-credentials.module';
import {
  WHATSAPP_PROVIDER,
  EMAIL_PROVIDER,
  SMS_PROVIDER,
} from './provider.interface';
import { MockWhatsappProvider } from './mock-whatsapp.provider';
import { SmtpRelayEmailProvider } from './smtp-relay-email.provider';
import { Fast2SmsProvider } from './fast2sms.provider';

@Module({
  imports: [MailCoreModule, SmsCredentialsModule],
  providers: [
    { provide: WHATSAPP_PROVIDER, useClass: MockWhatsappProvider },
    { provide: EMAIL_PROVIDER, useClass: SmtpRelayEmailProvider },
    { provide: SMS_PROVIDER, useClass: Fast2SmsProvider },
  ],
  exports: [WHATSAPP_PROVIDER, EMAIL_PROVIDER, SMS_PROVIDER],
})
export class ProvidersModule {}
