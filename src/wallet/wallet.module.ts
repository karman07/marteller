import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { WalletTransaction, WalletTransactionSchema } from './schemas/wallet-transaction.schema';
import { WalletTopupOrder, WalletTopupOrderSchema } from './schemas/wallet-topup-order.schema';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';

@Module({
  imports: [
    AuthModule,
    BillingModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: WalletTopupOrder.name, schema: WalletTopupOrderSchema },
    ]),
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
