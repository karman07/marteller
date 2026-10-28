import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { SalesModule } from '../sales/sales.module';
import { DocumentRequestsModule } from '../document-requests/document-requests.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { BillingModule } from '../billing/billing.module';
import { SmsCredentialsModule } from '../sms-credentials/sms-credentials.module';
import { WhatsAppCredentialsModule } from '../whatsapp-credentials/whatsapp-credentials.module';
import { MessagesModule } from '../messages/messages.module';
import { TemplatesModule } from '../templates/templates.module';
import { InboxModule } from '../inbox/inbox.module';
import { AiModule } from '../ai/ai.module';
import { WalletModule } from '../wallet/wallet.module';
import { StaffActivityModule } from '../staff-activity/staff-activity.module';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    SalesModule,
    DocumentRequestsModule,
    AnalyticsModule,
    BillingModule,
    SmsCredentialsModule,
    WhatsAppCredentialsModule,
    MessagesModule,
    TemplatesModule,
    InboxModule,
    AiModule,
    WalletModule,
    StaffActivityModule,
  ],
  controllers: [AdminController],
  providers: [AdminGuard],
})
export class AdminModule {}
