import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { BillingModule } from '../billing/billing.module';
import { TemplatesModule } from '../templates/templates.module';
import { MessagesModule } from '../messages/messages.module';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';

@Module({
  imports: [AuthModule, AiModule, BillingModule, TemplatesModule, MessagesModule],
  controllers: [AiChatController],
  providers: [AiChatService],
})
export class AiChatModule {}
