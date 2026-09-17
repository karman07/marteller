import {
  Bot,
  Clock,
  Globe,
  GitBranch,
  LucideIcon,
  Megaphone,
  Send,
  Smile,
  Sparkles,
  Tag,
  UserPlus,
} from "lucide-react";
import { WorkflowNodeType } from "@/lib/workflows";

export type NodeKind = "trigger" | "action" | "condition";

export const NODE_META: Record<
  WorkflowNodeType,
  { label: string; icon: LucideIcon; kind: NodeKind; description: string }
> = {
  trigger_lead_created: {
    label: "New lead created",
    icon: UserPlus,
    kind: "trigger",
    description: "Starts the workflow whenever a lead is added or promoted from a message.",
  },
  trigger_manual: {
    label: "Manual trigger",
    icon: Sparkles,
    kind: "trigger",
    description: "Starts only when you press Run on this workflow.",
  },
  trigger_ai_replied: {
    label: "AI replied to a message",
    icon: Bot,
    kind: "trigger",
    description: "Starts whenever the AI assistant replies to an inbound WhatsApp, Email, or SMS message.",
  },
  action_send_whatsapp: {
    label: "Send WhatsApp template",
    icon: Send,
    kind: "action",
    description: "Sends an approved WhatsApp template to the lead's phone number.",
  },
  action_update_lead_status: {
    label: "Update lead status",
    icon: Tag,
    kind: "action",
    description: "Moves the lead to a new pipeline stage.",
  },
  action_add_lead: {
    label: "Add as lead",
    icon: UserPlus,
    kind: "action",
    description: "Records the customer who sent this message as a lead.",
  },
  action_notify_admin: {
    label: "Notify admin",
    icon: Megaphone,
    kind: "action",
    description: "Sends a WhatsApp template to a phone number you configure — for human follow-up.",
  },
  action_wait: {
    label: "Wait",
    icon: Clock,
    kind: "action",
    description: "Pauses before continuing (simulated in test runs).",
  },
  action_call_api: {
    label: "Call external API",
    icon: Globe,
    kind: "action",
    description: "Sends a real HTTP request to any URL you configure — for connecting to other tools.",
  },
  condition_lead_status: {
    label: "If lead status is…",
    icon: GitBranch,
    kind: "condition",
    description: "Branches the workflow based on the lead's current status.",
  },
  condition_ai_sentiment: {
    label: "If AI sentiment is…",
    icon: Smile,
    kind: "condition",
    description: "Branches based on whether the AI judged the customer's tone positive, negative, or neutral.",
  },
  condition_ai_in_domain: {
    label: "If question is in-domain",
    icon: GitBranch,
    kind: "condition",
    description: "Branches on whether the AI thought the question was actually about this business.",
  },
};

export const PALETTE_GROUPS: { title: string; types: WorkflowNodeType[] }[] = [
  { title: "Triggers", types: ["trigger_lead_created", "trigger_ai_replied", "trigger_manual"] },
  {
    title: "Actions",
    types: [
      "action_send_whatsapp",
      "action_update_lead_status",
      "action_add_lead",
      "action_notify_admin",
      "action_wait",
      "action_call_api",
    ],
  },
  { title: "Logic", types: ["condition_lead_status", "condition_ai_sentiment", "condition_ai_in_domain"] },
];

export function kindClasses(kind: NodeKind) {
  if (kind === "trigger") return "bg-accent-soft/40 text-accent";
  if (kind === "condition") return "bg-[#8b6cf0]/15 text-[#8b6cf0]";
  return "bg-cream-secondary text-ink-soft";
}
