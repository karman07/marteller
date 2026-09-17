"use client";

import { useEffect, useState } from "react";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  CreatedMailCredential,
  MailCredential,
  MailDomain,
  createMailCredential,
  listMailCredentials,
  listMailDomains,
  revokeMailCredential,
} from "@/lib/mail";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function EmailCredentialsPage() {
  const [credentials, setCredentials] = useState<MailCredential[]>([]);
  const [domains, setDomains] = useState<MailDomain[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [domainId, setDomainId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedMailCredential | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [revokingCredential, setRevokingCredential] = useState<MailCredential | null>(null);

  function load() {
    listMailCredentials()
      .then((items) => {
        setCredentials(items);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }

  useEffect(() => {
    load();
    listMailDomains().then(setDomains).catch(() => {});
  }, []);

  function resetForm() {
    setLabel("");
    setDomainId("");
    setError(null);
  }

  async function handleCreate() {
    if (!label.trim()) return;
    setError(null);
    setSaving(true);
    try {
      const cred = await createMailCredential(label.trim(), domainId || undefined);
      setCreated(cred);
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create credential.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke() {
    if (!revokingCredential) return;
    await revokeMailCredential(revokingCredential._id);
    setCredentials((prev) => prev.filter((c) => c._id !== revokingCredential._id));
  }

  function handleCopy(value: string, field: string) {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
  }

  function domainName(id?: string) {
    if (!id) return "Any verified domain";
    return domains.find((d) => d._id === id)?.domain ?? "—";
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-soft">SMTP AUTH credentials for sending through your own tools.</p>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus size={15} /> Create credential
        </Button>
      </div>

      {!loaded ? null : credentials.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No SMTP credentials yet"
          description="Create one to send mail from your own apps or mail client via SMTP AUTH."
          action={
            <Button onClick={() => setCreateOpen(true)} variant="primary">
              Create credential
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-ink-muted">
                  <th className="px-4 py-3 font-medium">Label</th>
                  <th className="px-4 py-3 font-medium">Username</th>
                  <th className="px-4 py-3 font-medium">Domain</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last used</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {credentials.map((c) => (
                  <tr key={c._id} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-3 text-ink">{c.label}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-soft">{c.username}</td>
                    <td className="px-4 py-3 text-ink-soft">{domainName(c.domainId)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          c.status === "active"
                            ? "bg-[#0ca30c]/10 text-[#0ca30c]"
                            : "bg-cream-secondary text-ink-muted"
                        }`}
                      >
                        {c.status === "active" ? "Active" : "Revoked"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {c.lastUsedAt ? formatDate(c.lastUsedAt) : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.status === "active" && (
                        <button
                          onClick={() => setRevokingCredential(c)}
                          className="text-ink-muted hover:text-accent"
                          aria-label="Revoke credential"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreated(null);
          setCopiedField(null);
          resetForm();
        }}
        title={created ? "Credential created" : "Create SMTP credential"}
        dismissable={!created}
      >
        {created ? (
          <div className="flex flex-col gap-4">
            <p className="rounded-lg bg-accent-soft/60 px-3 py-2 text-sm text-accent">
              Copy this now — the password won&apos;t be shown again.
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-line bg-cream px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wide text-ink-muted">Host : Port</p>
                  <code className="text-sm text-ink">
                    {created.host}:{created.port}
                  </code>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-line bg-cream px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wide text-ink-muted">Username</p>
                  <code className="block truncate text-sm text-ink">{created.username}</code>
                </div>
                <button
                  onClick={() => handleCopy(created.username, "username")}
                  className="text-ink-muted hover:text-accent"
                  aria-label="Copy username"
                >
                  <Copy size={15} />
                </button>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-line bg-cream px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wide text-ink-muted">Password</p>
                  <code className="block truncate text-sm text-ink">{created.password}</code>
                </div>
                <button
                  onClick={() => handleCopy(created.password, "password")}
                  className="text-ink-muted hover:text-accent"
                  aria-label="Copy password"
                >
                  <Copy size={15} />
                </button>
              </div>
            </div>
            {copiedField && <p className="text-xs text-[#0ca30c]">Copied {copiedField} to clipboard.</p>}
            <Button
              onClick={() => {
                setCreateOpen(false);
                setCreated(null);
                setCopiedField(null);
              }}
              className="w-full"
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {error && <p className="rounded-lg bg-accent-soft/60 px-3 py-2 text-sm text-accent">{error}</p>}
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (e.g. Marketing tool)"
              className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
            />
            {domains.length > 0 && (
              <select
                value={domainId}
                onChange={(e) => setDomainId(e.target.value)}
                className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
              >
                <option value="">Any verified domain</option>
                {domains.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.domain}
                  </option>
                ))}
              </select>
            )}
            <Button onClick={handleCreate} disabled={saving || !label.trim()} className="w-full">
              {saving ? "Creating…" : "Create credential"}
            </Button>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!revokingCredential}
        onClose={() => setRevokingCredential(null)}
        onConfirm={handleRevoke}
        title="Revoke this credential?"
        description={`"${revokingCredential?.label}" will stop being able to authenticate immediately. This can't be undone.`}
        confirmLabel="Revoke"
      />
    </>
  );
}
