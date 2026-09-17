import { ReactNode } from "react";
import { SalesStage, VerificationStatus } from "@/lib/admin";

type BadgeVariant = "success" | "muted" | "warning" | "accent";

const BADGE_CLASSES: Record<BadgeVariant, string> = {
  success: "bg-emerald-500/15 text-emerald-600",
  muted: "bg-cream-secondary text-ink-muted",
  warning: "bg-amber-500/15 text-amber-700",
  accent: "bg-accent-soft/60 text-accent",
};

export function Badge({ children, variant = "muted" }: { children: ReactNode; variant?: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${BADGE_CLASSES[variant]}`}>
      {children}
    </span>
  );
}

const VERIFICATION_CLASSES: Record<VerificationStatus, string> = {
  not_submitted: "bg-cream-secondary text-ink-muted",
  pending: "bg-amber-500/15 text-amber-700",
  verified: "bg-emerald-500/15 text-emerald-600",
  rejected: "bg-accent-soft/60 text-accent",
};

const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  not_submitted: "Not submitted",
  pending: "Pending review",
  verified: "Verified",
  rejected: "Rejected",
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${VERIFICATION_CLASSES[status]}`}
    >
      {VERIFICATION_LABELS[status]}
    </span>
  );
}

const STAGE_CLASSES: Record<SalesStage, string> = {
  new: "bg-cream-secondary text-ink-muted",
  contacted: "bg-[#2a78d6]/15 text-[#2a78d6]",
  qualified: "bg-[#8b6cf0]/15 text-[#8b6cf0]",
  converted: "bg-emerald-500/15 text-emerald-600",
  lost: "bg-accent-soft/60 text-accent",
};

const STAGE_LABELS: Record<SalesStage, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Converted",
  lost: "Lost",
};

export function StageBadge({ stage }: { stage: SalesStage }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STAGE_CLASSES[stage]}`}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}
