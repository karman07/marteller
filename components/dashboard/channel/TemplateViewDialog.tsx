"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Template } from "@/lib/templates";
import { TemplatePreview } from "./TemplatePreview";

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
