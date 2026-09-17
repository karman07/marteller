import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MailDomain, MailDomainSchema } from './schemas/mail-domain.schema';
import {
  SuppressionEntry,
  SuppressionEntrySchema,
} from './schemas/suppression-entry.schema';
import { MailDomainsService } from './mail-domains.service';
import { SuppressionService } from './suppression.service';
import { MailTransportService } from './mail-transport.service';

// The primitives shared by both the thin generic-channel email provider
// (src/messages/providers) and the full Mail feature module (src/mail):
// domain/DKIM management, suppression checks, and the actual SMTP handoff.
// Kept dependency-free of Wallet/Messages/Auth so ProvidersModule can import
// it without creating a cycle back through MessagesModule.
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MailDomain.name, schema: MailDomainSchema },
      { name: SuppressionEntry.name, schema: SuppressionEntrySchema },
    ]),
  ],
  providers: [MailDomainsService, SuppressionService, MailTransportService],
  exports: [MailDomainsService, SuppressionService, MailTransportService],
})
export class MailCoreModule {}
