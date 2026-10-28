"use client";

import { Modal } from "@/components/ui/Modal";
import { SubscriptionSection } from "./SubscriptionSection";

// Mirrors VerificationGate's pattern exactly: a non-dismissable modal
// layered over the (always-mounted) dashboard until the gate condition
// clears. Composed in DashboardShell right after the verification gate —
// a business must be verified before being asked to pay.
export function PlanGate({ onStatusChange }: { onStatusChange: (status: string | null) => void }) {
  return (
    <Modal open onClose={() => {}} dismissable={false} size="lg" title="Choose a plan to continue">
      <p className="-mt-3 mb-5 text-sm text-ink-soft">
        Pick a plan and complete payment to unlock your dashboard — this covers your monthly WhatsApp,
        Email, SMS, and AI reply allowance.
      </p>
      <SubscriptionSection onStatusChange={onStatusChange} />
    </Modal>
  );
}
