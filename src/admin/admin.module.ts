import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { SalesModule } from '../sales/sales.module';
import { DocumentRequestsModule } from '../document-requests/document-requests.module';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';

@Module({
  imports: [AuthModule, UsersModule, SalesModule, DocumentRequestsModule],
  controllers: [AdminController],
  providers: [AdminGuard],
})
export class AdminModule {}
