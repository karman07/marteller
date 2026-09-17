import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WorkflowRunStatus = 'success' | 'error';
export type WorkflowStepStatus = 'success' | 'error' | 'skipped';

@Schema({ _id: false })
export class WorkflowRunStep {
  @Prop({ required: true })
  nodeId: string;

  @Prop({ required: true })
  type: string;

  @Prop({ enum: ['success', 'error', 'skipped'], required: true })
  status: WorkflowStepStatus;

  @Prop()
  message?: string;

  @Prop({ default: () => new Date() })
  at: Date;
}
const WorkflowRunStepSchema = SchemaFactory.createForClass(WorkflowRunStep);

export type WorkflowRunDocument = HydratedDocument<WorkflowRun>;

@Schema({ timestamps: true })
export class WorkflowRun {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  workflowId: string;

  // What kicked this run off — 'manual' (Run button) or 'lead_created'.
  @Prop({ required: true })
  trigger: string;

  @Prop({ enum: ['success', 'error'], required: true })
  status: WorkflowRunStatus;

  @Prop({ type: [WorkflowRunStepSchema], default: [] })
  steps: WorkflowRunStep[];
}

export const WorkflowRunSchema = SchemaFactory.createForClass(WorkflowRun);
