import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import {
  DocumentRequest,
  DocumentRequestSchema,
} from './schemas/document-request.schema';
import { DocumentRequestsService } from './document-requests.service';
import { DocumentRequestsController } from './document-requests.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: DocumentRequest.name, schema: DocumentRequestSchema },
    ]),
  ],
  controllers: [DocumentRequestsController],
  providers: [DocumentRequestsService],
  exports: [DocumentRequestsService],
})
export class DocumentRequestsModule {}
