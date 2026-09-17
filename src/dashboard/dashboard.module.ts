import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { VerificationModule } from '../verification/verification.module';
import { MessagesModule } from '../messages/messages.module';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [AuthModule, UsersModule, VerificationModule, MessagesModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
