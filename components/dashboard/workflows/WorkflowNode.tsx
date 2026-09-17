import { ComponentType } from "react";
import { Handle, NodeProps, Position, useReactFlow } from "@xyflow/react";
import { X } from "lucide-react";
import { WorkflowNodeType } from "@/lib/workflows";
import { LEAD_STATUSES } from "@/lib/leads";
import { AI_SENTIMENTS } from "@/lib/inbox";
import { kindClasses, NODE_META } from "./nodeMeta";

const HANDLE_CLASS =
  "!h-2.5 !w-2.5 !border-2 !border-surface-2 !bg-ink-muted transition-colors";

function subtitle(nodeType: WorkflowNodeType, data: Record<string, unknown>): string {
  switch (nodeType) {
    case "action_send_whatsapp": {
      const name = data.templateName as string | undefined;
      return name ? `Template: ${name}` : "No template selected";
    }
    case "action_update_lead_status":
    case "condition_lead_status": {
      const status = data.status as string | undefined;
      const label = LEAD_STATUSES.find((s) => s.value === status)?.label;
      return label ? `Status: ${label}` : "No status selected";
    }
    case "action_wait": {
      const seconds = data.seconds as number | undefined;
      return seconds ? `Wait ${seconds}s` : "No duration set";
    }
    case "action_add_lead":
      return "From the customer who sent the message";
    case "action_notify_admin": {
      const phone = data.phoneNumber as string | undefined;
      return phone ? `To: ${phone}` : "No phone number set";
    }
    case "action_call_api": {
      const url = data.url as string | undefined;
      const method = (data.method as string | undefined) ?? "GET";
      return url ? `${method} ${url}` : "No URL configured";
    }
    case "condition_ai_sentiment": {
      const sentiment = data.sentiment as string | undefined;
      const label = AI_SENTIMENTS.find((s) => s.value === sentiment)?.label;
      return label ? `Sentiment: ${label}` : "No sentiment selected";
    }
    case "condition_ai_in_domain":
      return "Yes → in-domain, No → off-topic";
    case "trigger_lead_created":
      return "Whenever a new lead appears";
    case "trigger_manual":
      return "Only when you click Run";
    case "trigger_ai_replied":
      return "Whenever the AI processes a message";
    default:
      return "";
  }
}

function WorkflowNodeCard({
  id,
  nodeType,
  data,
  selected,
}: {
  id: string;
  nodeType: WorkflowNodeType;
  data: Record<string, unknown>;
  selected: boolean;
}) {
  const meta = NODE_META[nodeType];
  const Icon = meta.icon;
  const { deleteElements } = useReactFlow();

  return (
    <div
      className={`group relative w-56 rounded-xl border bg-surface-2 px-3 py-2.5 shadow-sm transition-colors ${
        selected ? "border-accent ring-2 ring-accent-soft/50" : "border-line"
      }`}
    >
      {meta.kind !== "trigger" && (
        <Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          void deleteElements({ nodes: [{ id }] });
        }}
        aria-label="Delete this block"
        className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface-2 text-ink-muted opacity-0 shadow-sm transition-opacity hover:border-accent hover:text-accent group-hover:opacity-100"
      >
        <X size={11} />
      </button>

      <div className="flex items-center gap-2">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${kindClasses(meta.kind)}`}
        >
          <Icon size={12} />
        </span>
        <p className="truncate text-xs font-semibold text-ink">{meta.label}</p>
      </div>
      <p className="mt-1 truncate pl-8 text-[11px] text-ink-muted">
        {subtitle(nodeType, data)}
      </p>

      {meta.kind === "condition" ? (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            style={{ top: "38%" }}
            className={`${HANDLE_CLASS} !bg-emerald-500`}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            style={{ top: "68%" }}
            className={`${HANDLE_CLASS} !bg-accent`}
          />
          <span className="pointer-events-none absolute right-1 top-[30%] text-[9px] font-medium text-ink-muted">
            yes
          </span>
          <span className="pointer-events-none absolute right-1 top-[60%] text-[9px] font-medium text-ink-muted">
            no
          </span>
        </>
      ) : (
        <Handle type="source" position={Position.Right} className={HANDLE_CLASS} />
      )}
    </div>
  );
}

function makeNode(nodeType: WorkflowNodeType) {
  function Node({ id, data, selected }: NodeProps) {
    return (
      <WorkflowNodeCard
        id={id}
        nodeType={nodeType}
        data={data as Record<string, unknown>}
        selected={!!selected}
      />
    );
  }
  Node.displayName = `WorkflowNode(${nodeType})`;
  return Node;
}

export const workflowNodeTypes: Record<WorkflowNodeType, ComponentType<NodeProps>> = {
  trigger_lead_created: makeNode("trigger_lead_created"),
  trigger_manual: makeNode("trigger_manual"),
  trigger_ai_replied: makeNode("trigger_ai_replied"),
  action_send_whatsapp: makeNode("action_send_whatsapp"),
  action_update_lead_status: makeNode("action_update_lead_status"),
  action_add_lead: makeNode("action_add_lead"),
  action_notify_admin: makeNode("action_notify_admin"),
  action_wait: makeNode("action_wait"),
  action_call_api: makeNode("action_call_api"),
  condition_lead_status: makeNode("condition_lead_status"),
  condition_ai_sentiment: makeNode("condition_ai_sentiment"),
  condition_ai_in_domain: makeNode("condition_ai_in_domain"),
};
