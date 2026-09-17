"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Channel, channelLabel } from "@/lib/channels";
import {
  CreateTemplatePayload,
  Template,
  WHATSAPP_CATEGORIES,
  WhatsappCategory,
  createTemplate,
  deleteTemplate,
  listTemplates,
  updateTemplate,
} from "@/lib/templates";
import { TemplateBuilder } from "./TemplateBuilder";
import { TemplateViewDialog } from "./TemplateViewDialog";

type CategoryFilter = WhatsappCategory | "all";

export function ChannelTemplatesView({ channel }: { channel: Channel }) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [viewingTemplate, setViewingTemplate] = useState<Template | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);

  function loadTemplates() {
    listTemplates(channel, categoryFilter === "all" ? undefined : categoryFilter)
      .then(setTemplates)
      .catch(() => {});
  }

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, categoryFilter]);

  async function handleSaveTemplate(payload: CreateTemplatePayload) {
    if (editingTemplate) {
      await updateTemplate(editingTemplate._id, payload);
      setEditingTemplate(null);
    } else {
      await createTemplate(payload);
    }
    loadTemplates();
  }

  async function handleDeleteTemplate() {
    if (!deletingTemplate) return;
    await deleteTemplate(deletingTemplate._id);
    setViewingTemplate(null);
    loadTemplates();
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        {channel === "whatsapp" ? (
          <div className="flex gap-1.5">
            {(["all", ...WHATSAPP_CATEGORIES.map((c) => c.value)] as CategoryFilter[]).map((c) => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  categoryFilter === c
                    ? "border-accent bg-accent-soft/40 text-accent"
                    : "border-line text-ink-soft hover:text-ink"
                }`}
              >
                {c === "all" ? "All" : c}
              </button>
            ))}
          </div>
        ) : (
          <div />
        )}
        <Button
          onClick={() => {
            setEditingTemplate(null);
            setBuilderOpen(true);
          }}
          className="gap-1.5"
        >
          <Plus size={15} /> New template
        </Button>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="No templates yet"
          description={`Create your first ${channelLabel(channel)} template to start sending.`}
          action={
            <Button onClick={() => setBuilderOpen(true)} variant="primary">
              New template
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <button
              key={t._id}
              onClick={() => setViewingTemplate(t)}
              className="rounded-2xl border border-line bg-surface-2 p-4 text-left transition-colors hover:border-ink-muted"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">{t.name}</p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                    t.isSystem ? "bg-accent-soft/40 text-accent" : "bg-cream-secondary text-ink-soft"
                  }`}
                >
                  {t.isSystem ? "Shared" : t.status}
                </span>
              </div>
              {t.category && <p className="mb-1 text-xs capitalize text-ink-muted">{t.category}</p>}
              <p className="line-clamp-3 text-sm text-ink-soft">{t.body}</p>
            </button>
          ))}
        </div>
      )}

      <TemplateBuilder
        channel={channel}
        open={builderOpen}
        editingTemplate={editingTemplate}
        onClose={() => {
          setBuilderOpen(false);
          setEditingTemplate(null);
        }}
        onSave={handleSaveTemplate}
      />

      <TemplateViewDialog
        template={viewingTemplate}
        open={!!viewingTemplate}
        onClose={() => setViewingTemplate(null)}
        onEdit={() => {
          setEditingTemplate(viewingTemplate);
          setViewingTemplate(null);
          setBuilderOpen(true);
        }}
        onDelete={() => setDeletingTemplate(viewingTemplate)}
      />

      <ConfirmDialog
        open={!!deletingTemplate}
        onClose={() => setDeletingTemplate(null)}
        onConfirm={handleDeleteTemplate}
        title="Delete this template?"
        description={`"${deletingTemplate?.name}" will be permanently removed.`}
      />
    </>
  );
}
