"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Channel } from "@/lib/channels";
import { Template, WHATSAPP_CATEGORIES, WhatsappCategory, listTemplates } from "@/lib/templates";
import { TemplateViewDialog } from "./TemplateViewDialog";

type CategoryFilter = WhatsappCategory | "all";

// Read-only browse of the shared template library — sales can look at and
// preview templates but never create/edit/delete them (that's admin-only),
// so this drops frontend's TemplateBuilder/ConfirmDialog/"New template"
// entirely.
export function ChannelTemplatesView({ channel }: { channel: Channel }) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [viewingTemplate, setViewingTemplate] = useState<Template | null>(null);

  useEffect(() => {
    listTemplates(channel, categoryFilter === "all" ? undefined : categoryFilter)
      .then(setTemplates)
      .catch(() => {});
  }, [channel, categoryFilter]);

  return (
    <>
      {channel === "whatsapp" && (
        <div className="mb-4 flex gap-1.5">
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
      )}

      {templates.length === 0 ? (
        <EmptyState icon={FileText} title="No templates yet" description="Admin hasn't added any templates for this channel yet." />
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

      <TemplateViewDialog
        template={viewingTemplate}
        open={!!viewingTemplate}
        onClose={() => setViewingTemplate(null)}
      />
    </>
  );
}
