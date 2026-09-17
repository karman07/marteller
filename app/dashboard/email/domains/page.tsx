"use client";

import { useEffect, useState } from "react";
import { Check, CheckCircle2, Clock, Copy, Globe, Plus, RefreshCw, Star, Trash2, XCircle } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  DnsRecord,
  DomainDnsRecords,
  MailDomain,
  MailDomainStatus,
  createMailDomain,
  deleteMailDomain,
  fetchDomainDns,
  listMailDomains,
  setDefaultMailDomain,
  verifyMailDomain,
} from "@/lib/mail";

const STATUS_META: Record<
  MailDomainStatus,
  { label: string; icon: typeof Clock; className: string }
> = {
  pending: { label: "Pending", icon: Clock, className: "text-amber-600 bg-amber-500/10" },
  verified: { label: "Verified", icon: CheckCircle2, className: "text-[#0ca30c] bg-[#0ca30c]/10" },
  failed: { label: "Failed", icon: XCircle, className: "text-[#d03b3b] bg-[#d03b3b]/10" },
};

function StatusBadge({ status }: { status: MailDomainStatus }) {
  const { label, icon: Icon, className } = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function EmailDomainsPage() {
  const [domains, setDomains] = useState<MailDomain[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [domainInput, setDomainInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [defaultingId, setDefaultingId] = useState<string | null>(null);
  const [deletingDomain, setDeletingDomain] = useState<MailDomain | null>(null);
  const [dnsDomain, setDnsDomain] = useState<MailDomain | null>(null);
  const [dnsRecords, setDnsRecords] = useState<DomainDnsRecords | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function load() {
    listMailDomains()
      .then((items) => {
        setDomains(items);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    if (!domainInput.trim()) return;
    setError(null);
    setSaving(true);
    try {
      await createMailDomain(domainInput.trim());
      setDomainInput("");
      setAddOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add domain.");
    } finally {
      setSaving(false);
    }
  }

  async function handleVerify(domain: MailDomain) {
    setVerifyingId(domain._id);
    try {
      const updated = await verifyMailDomain(domain._id);
      setDomains((prev) => prev.map((d) => (d._id === updated._id ? updated : d)));
    } catch {
      // Leave interactive so the user can retry once DNS has propagated.
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleSetDefault(domain: MailDomain) {
    setDefaultingId(domain._id);
    try {
      const updated = await setDefaultMailDomain(domain._id);
      setDomains((prev) => prev.map((d) => (d._id === updated._id ? updated : { ...d, isDefault: false })));
    } catch {
      // Leave interactive.
    } finally {
      setDefaultingId(null);
    }
  }

  async function handleDelete() {
    if (!deletingDomain) return;
    await deleteMailDomain(deletingDomain._id);
    setDomains((prev) => prev.filter((d) => d._id !== deletingDomain._id));
  }

  function openDns(domain: MailDomain) {
    setDnsDomain(domain);
    setDnsRecords(null);
    setCopiedKey(null);
    fetchDomainDns(domain._id)
      .then(setDnsRecords)
      .catch(() => setDnsRecords(null));
  }

  function handleCopy(value: string, key: string) {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((cur) => (cur === key ? null : cur)), 2000);
  }

  const dnsRows: { key: string; label: string; record: DnsRecord }[] = dnsRecords
    ? [
        { key: "verification", label: "Verification", record: dnsRecords.verification },
        { key: "dkim", label: "DKIM", record: dnsRecords.dkim },
        { key: "spf", label: "SPF", record: dnsRecords.spf },
        { key: "dmarc", label: "DMARC", record: dnsRecords.dmarc },
      ]
    : [];

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-soft">Domains you can send email from, once verified.</p>
        <Button onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus size={15} /> Add domain
        </Button>
      </div>

      {!loaded ? null : domains.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No sending domains yet"
          description="Add a domain you own, then add the DNS records we give you to verify it."
          action={
            <Button onClick={() => setAddOpen(true)} variant="primary">
              Add domain
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-ink-muted">
                  <th className="px-4 py-3 font-medium">Domain</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Default</th>
                  <th className="px-4 py-3 font-medium">Added</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {domains.map((d) => (
                  <tr key={d._id} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-3 text-ink">{d.domain}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3">
                      {d.isDefault ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-accent">
                          <Star size={12} /> Default
                        </span>
                      ) : (
                        <span className="text-xs text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{formatDate(d.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openDns(d)}
                          className="rounded-full border border-line px-2.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent"
                        >
                          DNS records
                        </button>
                        {d.status !== "verified" && (
                          <button
                            onClick={() => handleVerify(d)}
                            disabled={verifyingId === d._id}
                            className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-50"
                          >
                            <RefreshCw size={11} className={verifyingId === d._id ? "animate-spin" : ""} />
                            Verify
                          </button>
                        )}
                        {d.status === "verified" && !d.isDefault && (
                          <button
                            onClick={() => handleSetDefault(d)}
                            disabled={defaultingId === d._id}
                            className="rounded-full border border-line px-2.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-50"
                          >
                            Set as default
                          </button>
                        )}
                        <button
                          onClick={() => setDeletingDomain(d)}
                          className="text-ink-muted hover:text-accent"
                          aria-label="Delete domain"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setDomainInput("");
          setError(null);
        }}
        title="Add a sending domain"
      >
        <div className="flex flex-col gap-4">
          {error && <p className="rounded-lg bg-accent-soft/60 px-3 py-2 text-sm text-accent">{error}</p>}
          <input
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            placeholder="mail.yourcompany.com"
            className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
          />
          <p className="text-xs text-ink-muted">
            You&apos;ll get DNS records to add right after — the domain stays &quot;Pending&quot; until you verify it.
          </p>
          <Button onClick={handleAdd} disabled={saving || !domainInput.trim()} className="w-full">
            {saving ? "Adding…" : "Add domain"}
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!dnsDomain}
        onClose={() => {
          setDnsDomain(null);
          setDnsRecords(null);
        }}
        title={dnsDomain ? `DNS records for ${dnsDomain.domain}` : undefined}
        size="xl"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            Add these as TXT records at your DNS provider, then come back and hit Verify.
          </p>
          {!dnsRecords ? (
            <p className="text-sm text-ink-muted">Loading…</p>
          ) : (
            <div className="flex flex-col gap-3">
              {dnsRows.map(({ key, label, record }) => (
                <div key={key} className="rounded-xl border border-line bg-cream/60 p-4">
                  <div className="mb-2.5 flex items-center gap-2">
                    <span className="text-sm font-medium text-ink">{label}</span>
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink-muted">
                      {record.type}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <CopyableField
                      fieldKey={`${key}-host`}
                      label="Host"
                      value={record.host}
                      copied={copiedKey === `${key}-host`}
                      onCopy={handleCopy}
                    />
                    <CopyableField
                      fieldKey={`${key}-value`}
                      label="Value"
                      value={record.value}
                      copied={copiedKey === `${key}-value`}
                      onCopy={handleCopy}
                    />
                  </div>
                  {record.note && <p className="mt-2 text-xs text-ink-muted">{record.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deletingDomain}
        onClose={() => setDeletingDomain(null)}
        onConfirm={handleDelete}
        title="Delete this domain?"
        description={`"${deletingDomain?.domain}" will stop working as a sending domain. This can't be undone.`}
      />
    </>
  );
}

// A label + full, unclipped value with its own copy button — used for the
// Host/Value rows in the DNS records modal, where values (DKIM public keys
// especially) can run to 200+ characters and must stay fully readable and
// selectable rather than being truncated behind a hover tooltip.
function CopyableField({
  fieldKey,
  label,
  value,
  copied,
  onCopy,
}: {
  fieldKey: string;
  label: string;
  value: string;
  copied: boolean;
  onCopy: (value: string, key: string) => void;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</span>
        <span className="select-all break-all font-mono text-xs text-ink">{value}</span>
      </div>
      <button
        onClick={() => onCopy(value, fieldKey)}
        className="mt-3.5 flex shrink-0 items-center gap-1 text-ink-muted hover:text-accent"
        aria-label={`Copy ${label.toLowerCase()}`}
      >
        {copied ? (
          <>
            <Check size={13} className="text-[#0ca30c]" />
            <span className="text-[11px] text-[#0ca30c]">Copied</span>
          </>
        ) : (
          <Copy size={13} />
        )}
      </button>
    </div>
  );
}
