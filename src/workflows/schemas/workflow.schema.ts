import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// Trigger nodes start a run; action/condition nodes do work as the run walks
// the graph. Kept to a small, real set rather than a large fake catalog.
export type WorkflowNodeType =
  | 'trigger_lead_created'
  | 'trigger_manual'
  | 'trigger_ai_replied'
  | 'action_send_whatsapp'
  | 'action_update_lead_status'
  | 'action_add_lead'
  | 'action_notify_admin'
  | 'action_wait'
  | 'action_call_api'
  | 'condition_lead_status'
  | 'condition_ai_sentiment'
  | 'condition_ai_in_domain';

export const WORKFLOW_NODE_TYPES: WorkflowNodeType[] = [
  'trigger_lead_created',
  'trigger_manual',
  'trigger_ai_replied',
  'action_send_whatsapp',
  'action_update_lead_status',
  'action_add_lead',
  'action_notify_admin',
  'action_wait',
  'action_call_api',
  'condition_lead_status',
  'condition_ai_sentiment',
  'condition_ai_in_domain',
];

export const TRIGGER_NODE_TYPES: WorkflowNodeType[] = [
  'trigger_lead_created',
  'trigger_manual',
  'trigger_ai_replied',
];

@Schema({ _id: false })
export class WorkflowNodePosition {
  @Prop({ required: true })
  x: number;

  @Prop({ required: true })
  y: number;
}
const WorkflowNodePositionSchema =
  SchemaFactory.createForClass(WorkflowNodePosition);

@Schema({ _id: false })
export class WorkflowNode {
  // Client-generated id (e.g. "node_3") — stable across saves so edges can
  // reference it and the canvas can re-render node positions.
  @Prop({ required: true })
  id: string;

  @Prop({ enum: WORKFLOW_NODE_TYPES, required: true })
  type: WorkflowNodeType;

  @Prop({ type: WorkflowNodePositionSchema, required: true })
  position: WorkflowNodePosition;

  // Per-type config — e.g. { templateId } for action_send_whatsapp,
  // { status } for action_update_lead_status / condition_lead_status,
  // { seconds } for action_wait. Untyped on purpose: node types (and their
  // config shape) are expected to grow without a schema migration each time.
  @Prop({ type: Object, default: {} })
  data: Record<string, unknown>;
}
const WorkflowNodeSchema = SchemaFactory.createForClass(WorkflowNode);

@Schema({ _id: false })
export class WorkflowEdge {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  source: string;

  @Prop({ required: true })
  target: string;

  // Set on edges leaving a condition node ("true" / "false") so the runner
  // knows which branch to follow.
  @Prop()
  sourceHandle?: string;
}
const WorkflowEdgeSchema = SchemaFactory.createForClass(WorkflowEdge);

export type WorkflowDocument = HydratedDocument<Workflow>;

@Schema({ timestamps: true })
export class Workflow {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: true })
  active: boolean;

  @Prop({ type: [WorkflowNodeSchema], default: [] })
  nodes: WorkflowNode[];

  @Prop({ type: [WorkflowEdgeSchema], default: [] })
  edges: WorkflowEdge[];
}

export const WorkflowSchema = SchemaFactory.createForClass(Workflow);
