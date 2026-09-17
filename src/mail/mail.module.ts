import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { MailCoreModule } from '../mail-core/mail-core.module';
import { WalletModule } from '../wallet/wallet.module';
import { AiModule } from '../ai/ai.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { LeadsModule } from '../leads/leads.module';
import { MessagesModule } from '../messages/messages.module';
import { MailQueueModule } from './mail-queue.module';
import {
  MailCredential,
  MailCredentialSchema,
} from './schemas/mail-credential.schema';
import {
  EmailMessage,
  EmailMessageSchema,
} from './schemas/email-message.schema';
import {
  InboundEmail,
  InboundEmailSchema,
} from './schemas/inbound-email.schema';
import { EmailEvent, EmailEventSchema } from './schemas/email-event.schema';
import {
  MailUsageCounter,
  MailUsageCounterSchema,
} from './schemas/mail-usage-counter.schema';
import { Message, MessageSchema } from '../messages/schemas/message.schema';
import {
  InboundMessage,
  InboundMessageSchema,
} from '../inbox/schemas/inbound-message.schema';
import { MailCredentialsService } from './mail-credentials.service';
import { MailUsageService } from './mail-usage.service';
import { MailService } from './mail.service';
import { MailInboundService } from './mail-inbound.service';
import { MailQueueProcessor } from './mail-queue.processor';
import { MailController } from './mail.controller';

// Deliberately does not import InboxModule or MessagesModule — writes to
// their models directly (Message, InboundMessage), the same "direct model
// access" pattern InboxModule/WorkflowsService/LeadsService already use, to
// keep the module graph acyclic. InboxModule imports MailModule (for
// approving a pending AI reply), so the dependency can only run one way.
@Module({
  imports: [
    AuthModule,
    ApiKeysModule,
    MailCoreModule,
    MailQueueModule,
    WalletModule,
    AiModule,
    WorkflowsModule,
    LeadsModule,
    MessagesModule,
    MongooseModule.forFeature([
      { name: MailCredential.name, schema: MailCredentialSchema },
      { name: EmailMessage.name, schema: EmailMessageSchema },
      { name: InboundEmail.name, schema: InboundEmailSchema },
      { name: EmailEvent.name, schema: EmailEventSchema },
      { name: MailUsageCounter.name, schema: MailUsageCounterSchema },
      { name: Message.name, schema: MessageSchema },
      { name: InboundMessage.name, schema: InboundMessageSchema },
    ]),
  ],
  controllers: [MailController],
  providers: [
    MailCredentialsService,
    MailUsageService,
    MailService,
    MailInboundService,
    MailQueueProcessor,
  ],
  exports: [MailService, MailCredentialsService, MailInboundService],
})
export class MailModule {}
