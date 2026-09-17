import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { TemplatesModule } from '../templates/templates.module';
import { VerificationModule } from '../verification/verification.module';
import { WalletModule } from '../wallet/wallet.module';
import { BillingModule } from '../billing/billing.module';
import { Message, MessageSchema } from './schemas/message.schema';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { PricingService } from './pricing.service';
import { ProvidersModule } from './providers/providers.module';

@Module({
  imports: [
    AuthModule,
    TemplatesModule,
    VerificationModule,
    WalletModule,
    BillingModule,
    ProvidersModule,
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
  ],
  controllers: [MessagesController],
  providers: [MessagesService, PricingService],
  exports: [MessagesService, PricingService],
})
export class MessagesModule {}
