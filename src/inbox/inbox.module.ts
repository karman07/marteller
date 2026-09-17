import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { LeadsModule } from '../leads/leads.module';
import { MailModule } from '../mail/mail.module';
import { MailCoreModule } from '../mail-core/mail-core.module';
import {
  InboundMessage,
  InboundMessageSchema,
} from './schemas/inbound-message.schema';
import { Message, MessageSchema } from '../messages/schemas/message.schema';
import { InboxService } from './inbox.service';
import { InboxController } from './inbox.controller';

@Module({
  imports: [
    AuthModule,
    AiModule,
    WorkflowsModule,
    LeadsModule,
    MailModule,
    MailCoreModule,
    MongooseModule.forFeature([
      { name: InboundMessage.name, schema: InboundMessageSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
  ],
  controllers: [InboxController],
  providers: [InboxService],
})
export class InboxModule {}
