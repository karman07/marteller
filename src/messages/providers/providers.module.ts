import { Module } from '@nestjs/common';
import { MailCoreModule } from '../../mail-core/mail-core.module';
import { SmsCredentialsModule } from '../../sms-credentials/sms-credentials.module';
import { WhatsAppCredentialsModule } from '../../whatsapp-credentials/whatsapp-credentials.module';
import { TemplatesModule } from '../../templates/templates.module';
import {
  WHATSAPP_PROVIDER,
  EMAIL_PROVIDER,
  SMS_PROVIDER,
} from './provider.interface';
import { Fast2SmsWhatsAppProvider } from './fast2sms-whatsapp.provider';
import { SmtpRelayEmailProvider } from './smtp-relay-email.provider';
import { Fast2SmsProvider } from './fast2sms.provider';

@Module({
  imports: [MailCoreModule, SmsCredentialsModule, WhatsAppCredentialsModule, TemplatesModule],
  providers: [
    { provide: WHATSAPP_PROVIDER, useClass: Fast2SmsWhatsAppProvider },
    { provide: EMAIL_PROVIDER, useClass: SmtpRelayEmailProvider },
    { provide: SMS_PROVIDER, useClass: Fast2SmsProvider },
  ],
  exports: [WHATSAPP_PROVIDER, EMAIL_PROVIDER, SMS_PROVIDER],
})
export class ProvidersModule {}
