import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { Lead, LeadSchema } from './schemas/lead.schema';
import { Message, MessageSchema } from '../messages/schemas/message.schema';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';

@Module({
  imports: [
    AuthModule,
    WorkflowsModule,
    MongooseModule.forFeature([
      { name: Lead.name, schema: LeadSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
  ],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
