"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Pencil, Trash2, XCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Template, WhatsappApprovalStatus, fetchWhatsappApprovalStatuses } from "@/lib/templates";
import { TemplatePreview } from "./TemplatePreview";

const STATUS_META: Record<WhatsappApprovalStatus["status"], { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: "Pending approval", icon: Clock, className: "text-ink-muted" },
  approved: { label: "Approved — ready to send", icon: CheckCircle2, className: "text-emerald-600" },
  rejected: { label: "Not approved", icon: XCircle, className: "text-accent" },
};

// Read-only — approval is staff-handled on the tenant's behalf, nothing
// for the tenant to configure (see the backend WhatsAppTemplateMapping
// schema comment). Shown regardless of isSystem, since even a shared
// template needs this tenant's own approval record.
function WhatsappApprovalStatusField({ templateId }: { templateId: string }) {
  const [entry, setEntry] = useState<WhatsappApprovalStatus | null | undefined>(undefined);

  useEffect(() => {
    setEntry(undefined);
    fetchWhatsappApprovalStatuses()
      .then((map) => setEntry(map[templateId] ?? null))
      .catch(() => setEntry(null));
  }, [templateId]);

  if (entry === undefined) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-muted">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-muted/25 border-t-ink-muted" />
        Checking status…
      </p>
    );
  }

  const meta = STATUS_META[entry?.status ?? "pending"];
  const Icon = meta.icon;

  return (
    <div>
      <p className="text-xs text-ink-muted">WhatsApp approval</p>
      <p className={`mt-1 flex items-center gap-1.5 text-sm font-medium ${meta.className}`}>
        <Icon size={14} /> {meta.label}
      </p>
      {entry?.status === "rejected" && entry.rejectionReason && (
        <p className="mt-0.5 text-[11px] text-ink-muted">{entry.rejectionReason}</p>
      )}
    </div>
  );
}

export function TemplateViewDialog({
  template,
  open,
  onClose,
  onEdit,
  onDelete,
}: {
  template: Template | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!template) return null;

  return (
    <Modal open={open} onClose={onClose} title={template.name} size="lg">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <TemplatePreview
            channel={template.channel}
            headerType={template.headerType}
            header={template.header}
            headerImageUrl={template.headerImageUrl}
            body={template.body}
            footer={template.footer}
            subject={template.subject}
            bannerImageUrl={template.bannerImageUrl}
            buttons={template.buttons}
            sampleValues={{}}
          />
        </div>

        <div className="flex flex-col gap-3 text-sm">
          {template.category && (
            <div>
              <p className="text-xs text-ink-muted">Category</p>
              <p className="capitalize text-ink">{template.category}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-ink-muted">Status</p>
            <p className="text-ink">{template.isSystem ? "Shared template" : template.status}</p>
          </div>
          {template.variables.length > 0 && (
            <div>
              <p className="text-xs text-ink-muted">Variables</p>
              <p className="text-ink">{template.variables.map((v) => `{{${v}}}`).join(", ")}</p>
            </div>
          )}

          {template.channel === "whatsapp" && <WhatsappApprovalStatusField templateId={template._id} />}

          {!template.isSystem && (
            <div className="mt-auto flex gap-2 pt-4">
              <Button onClick={onEdit} variant="outline" className="flex-1 gap-1.5">
                <Pencil size={14} /> Edit
              </Button>
              <Button onClick={onDelete} variant="outline" className="flex-1 gap-1.5">
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
