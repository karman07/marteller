import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import {
  BusinessVerification,
  BusinessVerificationSchema,
} from './schemas/business-verification.schema';
import {
  VerificationFieldDef,
  VerificationFieldDefSchema,
} from './schemas/verification-field.schema';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: BusinessVerification.name, schema: BusinessVerificationSchema },
      { name: VerificationFieldDef.name, schema: VerificationFieldDefSchema },
    ]),
  ],
  controllers: [VerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
