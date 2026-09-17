"use client";

import { useEffect, useMemo, useState } from "react";
import { Database, File, FileText, Link2, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { StatTile } from "@/components/dashboard/StatTile";
import {
  AiConfig,
  DataSource,
  DataSourceType,
  addDataSource,
  fetchAiConfig,
  removeDataSource,
} from "@/lib/ai";

const TYPE_META: Record<DataSourceType, { label: string; icon: typeof FileText }> = {
  text: { label: "Text", icon: FileText },
  file: { label: "File", icon: File },
  url: { label: "URL", icon: Link2 },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function AiKnowledgeBaseView() {
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [sourceType, setSourceType] = useState<DataSourceType>("text");
  const [addingSource, setAddingSource] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAiConfig().then(setConfig).catch(() => {});
  }, []);

  async function handleAddSource() {
    if (!sourceName.trim()) return;
    setAddingSource(true);
    try {
      const updated = await addDataSource(sourceName.trim(), sourceType);
      setConfig(updated);
      setSourceName("");
    } finally {
      setAddingSource(false);
    }
  }

  async function handleRemoveSource(id: string) {
    const updated = await removeDataSource(id);
    setConfig(updated);
  }

  const sources = useMemo(() => config?.dataSources ?? [], [config]);
  const readyCount = sources.filter((s) => s.status === "ready").length;
  const processingCount = sources.length - readyCount;

  const visibleSources = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sources;
    return sources.filter((s) => s.name.toLowerCase().includes(q));
  }, [sources, search]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-1 text-sm font-semibold text-ink">Knowledge base</h2>
        <p className="text-xs text-ink-soft">
          Add text, files, or URLs — the assistant retrieves from these before every reply (RAG), so
          answers stay grounded in your own information instead of guesswork.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Sources" value={String(sources.length)} icon={Database} />
        <StatTile label="Ready" value={String(readyCount)} icon={FileText} />
        <StatTile label="Processing" value={String(processingCount)} icon={Link2} />
      </div>

      <div className="rounded-2xl border border-line bg-surface-2 p-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">Add a source</p>
        <div className="flex flex-wrap gap-2">
          <input
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="Data source name"
            className="h-10 min-w-[200px] flex-1 rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
          />
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as DataSourceType)}
            className="h-10 rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="text">Text</option>
            <option value="file">File</option>
            <option value="url">URL</option>
          </select>
          <Button onClick={handleAddSource} disabled={addingSource}>
            {addingSource ? "Adding…" : "Add"}
          </Button>
        </div>
      </div>

      {sources.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-line bg-cream px-3">
          <Search size={13} className="text-ink-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search knowledge base…"
            className="h-10 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
          />
        </div>
      )}

      {sources.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No knowledge base connected yet"
          description="Add text, files, or a URL so the assistant can answer using your own information."
        />
      ) : visibleSources.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">No sources match “{search}”.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface-2">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-ink-muted">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium">Type</th>
                <th className="px-3 py-3 font-medium">Added</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="w-10 px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {visibleSources.map((ds: DataSource) => {
                const meta = TYPE_META[ds.type];
                const Icon = meta.icon;
                return (
                  <tr key={ds._id} className="border-b border-line/60 last:border-0 hover:bg-cream-secondary">
                    <td className="px-5 py-3 font-medium text-ink">{ds.name}</td>
                    <td className="px-3 py-3 text-ink-soft">
                      <span className="flex items-center gap-1.5">
                        <Icon size={13} className="text-ink-muted" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-ink-soft">{formatDate(ds.addedAt)}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          ds.status === "ready"
                            ? "bg-[#0ca30c]/10 text-[#0ca30c]"
                            : "bg-cream-secondary text-ink-muted"
                        }`}
                      >
                        {ds.status === "ready" ? "Ready" : "Processing…"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleRemoveSource(ds._id)}
                        className="text-ink-muted hover:text-accent"
                        aria-label={`Remove ${ds.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
