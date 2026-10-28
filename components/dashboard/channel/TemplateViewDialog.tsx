"use client";

import { Modal } from "@/components/ui/Modal";
import { Template } from "@/lib/templates";
import { TemplatePreview } from "./TemplatePreview";

// Read-only — sales never edits or deletes templates (only admin manages
// the shared system library), so unlike frontend's version this dialog has
// no edit/delete actions.
export function TemplateViewDialog({
  template,
  open,
  onClose,
}: {
  template: Template | null;
  open: boolean;
  onClose: () => void;
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
        </div>
      </div>
    </Modal>
  );
}
