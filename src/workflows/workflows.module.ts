import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { MessagesModule } from '../messages/messages.module';
import { TemplatesModule } from '../templates/templates.module';
import { Workflow, WorkflowSchema } from './schemas/workflow.schema';
import { WorkflowRun, WorkflowRunSchema } from './schemas/workflow-run.schema';
import { Lead, LeadSchema } from '../leads/schemas/lead.schema';
import {
  InboundMessage,
  InboundMessageSchema,
} from '../inbox/schemas/inbound-message.schema';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';

@Module({
  imports: [
    AuthModule,
    MessagesModule,
    TemplatesModule,
    MongooseModule.forFeature([
      { name: Workflow.name, schema: WorkflowSchema },
      { name: WorkflowRun.name, schema: WorkflowRunSchema },
      { name: Lead.name, schema: LeadSchema },
      { name: InboundMessage.name, schema: InboundMessageSchema },
    ]),
  ],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
