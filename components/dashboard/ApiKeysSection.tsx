"use client";

import { useEffect, useState } from "react";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ApiKey, CreatedApiKey, createApiKey, listApiKeys, revokeApiKey } from "@/lib/apiKeys";

export function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokingKey, setRevokingKey] = useState<ApiKey | null>(null);

  useEffect(() => {
    listApiKeys().then(setKeys).catch(() => {});
  }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const key = await createApiKey(name.trim());
      setCreated(key);
      setName("");
      listApiKeys().then(setKeys).catch(() => {});
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke() {
    if (!revokingKey) return;
    await revokeApiKey(revokingKey._id);
    setKeys((prev) => prev.filter((k) => k._id !== revokingKey._id));
  }

  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink">API keys</h2>
          <p className="text-xs text-ink-muted">Integrate sending into your own systems.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} variant="outline" className="gap-1.5 px-4 py-2 text-xs">
          <Plus size={13} /> New key
        </Button>
      </div>

      {keys.length === 0 ? (
        <EmptyState icon={KeyRound} title="No API keys yet" />
      ) : (
        <div className="max-h-52 overflow-y-auto rounded-xl border border-line">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-ink-muted">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Key</th>
                <th className="px-3 py-2 font-medium">Last used</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k._id} className="border-b border-line/60 last:border-0">
                  <td className="px-3 py-2 text-ink">{k.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-ink-soft">{k.keyPrefix}••••</td>
                  <td className="px-3 py-2 text-ink-soft">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString("en-IN") : "Never"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => setRevokingKey(k)}
                      className="text-ink-muted hover:text-accent"
                      aria-label="Revoke key"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreated(null);
          setCopied(false);
        }}
        title={created ? "API key created" : "New API key"}
      >
        {created ? (
          <div className="flex flex-col gap-4">
            <p className="rounded-lg bg-accent-soft/60 px-3 py-2 text-sm text-accent">
              Copy this key now — you won&apos;t be able to see it again.
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-line bg-cream px-3 py-2.5">
              <code className="flex-1 truncate text-sm text-ink">{created.key}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(created.key);
                  setCopied(true);
                }}
                className="text-ink-muted hover:text-accent"
              >
                <Copy size={15} />
              </button>
            </div>
            {copied && <p className="text-xs text-[#0ca30c]">Copied to clipboard.</p>}
            <Button
              onClick={() => {
                setCreateOpen(false);
                setCreated(null);
                setCopied(false);
              }}
              className="w-full"
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Key name (e.g. Production server)"
              className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
            />
            <Button onClick={handleCreate} disabled={creating} className="w-full">
              {creating ? "Creating…" : "Create key"}
            </Button>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!revokingKey}
        onClose={() => setRevokingKey(null)}
        onConfirm={handleRevoke}
        title="Revoke this API key?"
        description={`"${revokingKey?.name}" will stop working immediately. This can't be undone.`}
        confirmLabel="Revoke"
      />
    </div>
  );
}
