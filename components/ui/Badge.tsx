import { VerificationStatus } from "@/lib/sales";

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

