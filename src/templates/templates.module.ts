import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { WhatsAppCredentialsModule } from '../whatsapp-credentials/whatsapp-credentials.module';
import { AiModule } from '../ai/ai.module';
import { Template, TemplateSchema } from './schemas/template.schema';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';

@Module({
  imports: [
    AuthModule,
    WhatsAppCredentialsModule,
    AiModule,
    MongooseModule.forFeature([{ name: Template.name, schema: TemplateSchema }]),
  ],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
