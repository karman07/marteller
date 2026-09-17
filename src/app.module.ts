import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseModule } from './firebase/firebase.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { VerificationModule } from './verification/verification.module';
import { TemplatesModule } from './templates/templates.module';
import { MessagesModule } from './messages/messages.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AiModule } from './ai/ai.module';
import { WalletModule } from './wallet/wallet.module';
import { ContactsModule } from './contacts/contacts.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { LeadsModule } from './leads/leads.module';
import { InboxModule } from './inbox/inbox.module';
import { SalesModule } from './sales/sales.module';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DocumentRequestsModule } from './document-requests/document-requests.module';
import { MailCoreModule } from './mail-core/mail-core.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    FirebaseModule,
    UsersModule,
    AuthModule,
    DashboardModule,
    VerificationModule,
    TemplatesModule,
    MessagesModule,
    ApiKeysModule,
    AiModule,
    WalletModule,
    ContactsModule,
    WorkflowsModule,
    LeadsModule,
    InboxModule,
    SalesModule,
    AdminModule,
    AnalyticsModule,
    DocumentRequestsModule,
    MailCoreModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
