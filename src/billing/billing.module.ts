import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Plan, PlanSchema } from './schemas/plan.schema';
import { Subscription, SubscriptionSchema } from './schemas/subscription.schema';
import { PaymentEvent, PaymentEventSchema } from './schemas/payment-event.schema';
import { WalletTransaction, WalletTransactionSchema } from '../wallet/schemas/wallet-transaction.schema';
import { PlansService } from './plans.service';
import { RazorpayService } from './razorpay.service';
import { SubscriptionsService } from './subscriptions.service';
import { PlanEnforcementService } from './plan-enforcement.service';
import { BillingController } from './billing.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Plan.name, schema: PlanSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: PaymentEvent.name, schema: PaymentEventSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
    ]),
  ],
  controllers: [BillingController],
  providers: [PlansService, RazorpayService, SubscriptionsService, PlanEnforcementService],
  exports: [PlansService, SubscriptionsService, PlanEnforcementService],
})
export class BillingModule {}
