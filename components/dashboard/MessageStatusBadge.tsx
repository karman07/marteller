import { CheckCircle2, Clock, XCircle, Send } from "lucide-react";
import { MessageStatus } from "@/lib/messages";

const META: Record<MessageStatus, { label: string; icon: typeof Send; className: string }> = {
  queued: { label: "Queued", icon: Clock, className: "text-ink-muted bg-cream-secondary" },
  sent: { label: "Sent", icon: Send, className: "text-[#0ca30c] bg-[#0ca30c]/10" },
  delivered: { label: "Delivered", icon: CheckCircle2, className: "text-[#0ca30c] bg-[#0ca30c]/10" },
  failed: { label: "Failed", icon: XCircle, className: "text-[#d03b3b] bg-[#d03b3b]/10" },
};

export function MessageStatusBadge({ status }: { status: MessageStatus }) {
  const { label, icon: Icon, className } = META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}
