import { request } from "./http";

export type WorkflowNodeType =
  | "trigger_lead_created"
  | "trigger_manual"
  | "trigger_ai_replied"
  | "action_send_whatsapp"
  | "action_update_lead_status"
  | "action_add_lead"
  | "action_notify_admin"
  | "action_wait"
  | "action_call_api"
  | "condition_lead_status"
  | "condition_ai_sentiment"
  | "condition_ai_in_domain";

export type WorkflowNode = {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: Record<string, unknown>;
};

export type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
};

export type Workflow = {
  _id: string;
  userId: string;
  name: string;
  active: boolean;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
};

export type WorkflowRunStepStatus = "success" | "error" | "skipped";

export type WorkflowRunStep = {
  nodeId: string;
  type: string;
  status: WorkflowRunStepStatus;
  message?: string;
  at: string;
};

export type WorkflowRun = {
  _id: string;
  workflowId: string;
  trigger: string;
  status: "success" | "error";
  steps: WorkflowRunStep[];
  createdAt: string;
};

export function listWorkflows() {
  return request<Workflow[]>("/workflows");
}

export function fetchWorkflow(id: string) {
  return request<Workflow>(`/workflows/${id}`);
}

export function createWorkflow(name: string) {
  return request<Workflow>("/workflows", { method: "POST", body: JSON.stringify({ name }) });
}

export function updateWorkflow(
  id: string,
  payload: Partial<{ name: string; active: boolean; nodes: WorkflowNode[]; edges: WorkflowEdge[] }>,
) {
  return request<Workflow>(`/workflows/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteWorkflow(id: string) {
  return request<{ deleted: boolean }>(`/workflows/${id}`, { method: "DELETE" });
}

export function runWorkflow(id: string) {
  return request<WorkflowRun>(`/workflows/${id}/run`, { method: "POST" });
}

export function listWorkflowRuns(id: string) {
  return request<WorkflowRun[]>(`/workflows/${id}/runs`);
}
