import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WhatsAppCredential, WhatsAppCredentialSchema } from './schemas/whatsapp-credential.schema';
import {
  WhatsAppTemplateMapping,
  WhatsAppTemplateMappingSchema,
} from './schemas/whatsapp-template-mapping.schema';
import { WhatsAppCredentialsService } from './whatsapp-credentials.service';
import { WhatsAppTemplateMappingService } from './whatsapp-template-mapping.service';
import { WhatsAppTemplateSubmissionService } from './whatsapp-template-submission.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WhatsAppCredential.name, schema: WhatsAppCredentialSchema },
      { name: WhatsAppTemplateMapping.name, schema: WhatsAppTemplateMappingSchema },
    ]),
  ],
  providers: [WhatsAppCredentialsService, WhatsAppTemplateMappingService, WhatsAppTemplateSubmissionService],
  exports: [WhatsAppCredentialsService, WhatsAppTemplateMappingService, WhatsAppTemplateSubmissionService],
})
export class WhatsAppCredentialsModule {}
