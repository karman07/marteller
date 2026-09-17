import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SmsCredential, SmsCredentialSchema } from './schemas/sms-credential.schema';
import { SmsCredentialsService } from './sms-credentials.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SmsCredential.name, schema: SmsCredentialSchema }]),
  ],
  providers: [SmsCredentialsService],
  exports: [SmsCredentialsService],
})
export class SmsCredentialsModule {}
