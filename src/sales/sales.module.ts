import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { VerificationModule } from '../verification/verification.module';
import { WalletModule } from '../wallet/wallet.module';
import { LeadsModule } from '../leads/leads.module';
import { DocumentRequestsModule } from '../document-requests/document-requests.module';
import { Message, MessageSchema } from '../messages/schemas/message.schema';
import { SalesLead, SalesLeadSchema } from './schemas/sales-lead.schema';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { SalesLeadsService } from './sales-leads.service';
import { SalesLeadsController } from './sales-leads.controller';
import { SalesGuard } from './sales.guard';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    VerificationModule,
    WalletModule,
    LeadsModule,
    DocumentRequestsModule,
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: SalesLead.name, schema: SalesLeadSchema },
    ]),
  ],
  controllers: [SalesController, SalesLeadsController],
  providers: [SalesService, SalesLeadsService, SalesGuard],
  // AdminModule reuses these services directly (same applicant/lead data,
  // different guard) rather than duplicating the query/update logic.
  exports: [SalesService, SalesLeadsService],
})
export class SalesModule {}
