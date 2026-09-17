"use client";

import { useEffect, useMemo, useState } from "react";
import { Send as SendIcon, X } from "lucide-react";
import { MessageStatusBadge } from "@/components/dashboard/MessageStatusBadge";
import { Pagination } from "@/components/dashboard/Pagination";
import { Button } from "@/components/ui/Button";
import { Channel } from "@/lib/channels";
import { Template, listTemplates } from "@/lib/templates";
import { MessageLog, RateCard, fetchRateCard, sendMessage } from "@/lib/messages";
import { Contact } from "@/lib/contacts";
import { formatINR } from "@/lib/currency";
import { TemplatePreview } from "./TemplatePreview";
import { ContactListsPanel } from "./ContactListsPanel";

const RESULTS_PAGE_SIZE = 10;

// A template variable named one of these (case-insensitive) is filled
// straight from the matching field on each selected contact instead of
// asking for one value that gets sent to everyone.
const CONTACT_FIELD_ALIASES: Record<"name" | "phone" | "email", string[]> = {
  name: ["name", "customer_name", "contact_name", "client_name", "full_name"],
  phone: ["phone", "phone_number", "mobile", "mobile_number"],
  email: ["email", "email_address"],
};

function contactFieldFor(variable: string): "name" | "phone" | "email" | null {
  const v = variable.toLowerCase();
  for (const [field, aliases] of Object.entries(CONTACT_FIELD_ALIASES) as [
    "name" | "phone" | "email",
    string[],
  ][]) {
    if (aliases.includes(v)) return field;
  }
  return null;
}

export function ChannelSendView({ channel }: { channel: Channel }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [rateCard, setRateCard] = useState<RateCard | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [manualRecipientsText, setManualRecipientsText] = useState("");
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{
    sent: number;
    failed: number;
    totalCostPaise: number;
    messages: MessageLog[];
  } | null>(null);
  const [resultsPage, setResultsPage] = useState(1);

  const field = channel === "email" ? "email" : "phone";

  useEffect(() => {
    listTemplates(channel).then(setTemplates).catch(() => {});
    fetchRateCard().then(setRateCard).catch(() => {});
  }, [channel]);

  const selectedTemplate = templates.find((t) => t._id === selectedTemplateId) ?? null;

  const autoMappedVars = useMemo(
    () => (selectedTemplate?.variables ?? []).filter((v) => contactFieldFor(v)),
    [selectedTemplate],
  );
  const manualVars = useMemo(
    () => (selectedTemplate?.variables ?? []).filter((v) => !contactFieldFor(v)),
    [selectedTemplate],
  );

  const selectedIds = useMemo(() => new Set(selectedContacts.map((c) => c._id)), [selectedContacts]);

  function toggleContact(contact: Contact) {
    setSelectedContacts((prev) =>
      prev.some((c) => c._id === contact._id) ? prev.filter((c) => c._id !== contact._id) : [...prev, contact],
    );
  }

  function selectList(contacts: Contact[]) {
    setSelectedContacts((prev) => {
      const existingIds = new Set(prev.map((c) => c._id));
      return [...prev, ...contacts.filter((c) => !existingIds.has(c._id))];
    });
  }

  const manualRecipients = manualRecipientsText
    .split(/[\n,]/)
    .map((r) => r.trim())
    .filter(Boolean);
  const contactRecipients = selectedContacts.map((c) => c[field] as string);
  const recipients = Array.from(new Set([...contactRecipients, ...manualRecipients]));

  const recipientVariables = useMemo(() => {
    if (autoMappedVars.length === 0 || selectedContacts.length === 0) return undefined;
    const map: Record<string, Record<string, string>> = {};
    for (const c of selectedContacts) {
      const key = c[field] as string | undefined;
      if (!key) continue;
      const vars: Record<string, string> = {};
      for (const v of autoMappedVars) {
        const value = c[contactFieldFor(v)!];
        if (value) vars[v] = value;
      }
      if (Object.keys(vars).length > 0) map[key] = vars;
    }
    return Object.keys(map).length > 0 ? map : undefined;
  }, [autoMappedVars, selectedContacts, field]);

  const estimatedCostPaise = useMemo(() => {
    if (!rateCard || !selectedTemplate || recipients.length === 0) return 0;
    let perMessage = 0;
    if (channel === "whatsapp") {
      perMessage = rateCard.whatsapp[selectedTemplate.category ?? "marketing"];
    } else if (channel === "email") {
      perMessage = rateCard.email;
    } else {
      const segments = Math.max(1, Math.ceil(selectedTemplate.body.length / rateCard.sms.segmentLength));
      perMessage = segments * rateCard.sms.perSegmentPaise;
    }
    return perMessage * recipients.length;
  }, [rateCard, selectedTemplate, recipients.length, channel]);

  async function handleSend() {
    setSendError(null);
    setSendResult(null);
    if (!selectedTemplate) {
      setSendError("Choose a template.");
      return;
    }
    if (recipients.length === 0) {
      setSendError("Add at least one recipient.");
      return;
    }

    setSending(true);
    try {
      const res = await sendMessage({
        templateId: selectedTemplate._id,
        recipients,
        variables: variableValues,
        recipientVariables,
      });
      setSendResult(res);
      setResultsPage(1);
      setSelectedContacts([]);
      setManualRecipientsText("");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          {sendError && (
            <p className="rounded-lg bg-accent-soft/60 px-3 py-2 text-sm text-accent">{sendError}</p>
          )}

          <select
            value={selectedTemplateId}
            onChange={(e) => {
              setSelectedTemplateId(e.target.value);
              setVariableValues({});
            }}
            className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="">Choose a template</option>
            {templates.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>

          <div>
            <p className="mb-1.5 text-xs text-ink-muted">
              Recipients
              {autoMappedVars.length > 0 && " · pick contacts below to auto-fill their details"}
            </p>

            {selectedContacts.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {selectedContacts.map((c) => (
                  <span
                    key={c._id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-cream-secondary px-2.5 py-1 text-xs text-ink"
                  >
                    {c.name}
                    {autoMappedVars.length > 0 && (
                      <span className="text-ink-muted">
                        → {autoMappedVars.map((v) => `{{${v}}}`).join(", ")}
                      </span>
                    )}
                    <button
                      onClick={() => setSelectedContacts((prev) => prev.filter((x) => x._id !== c._id))}
                      className="text-ink-muted hover:text-accent"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <textarea
              value={manualRecipientsText}
              onChange={(e) => setManualRecipientsText(e.target.value)}
              placeholder={
                channel === "email"
                  ? "Or type emails manually, one per line or comma separated"
                  : "Or type phone numbers manually (+91…), one per line or comma separated"
              }
              rows={3}
              className="w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
            />
          </div>

          {selectedTemplate && selectedTemplate.variables.length > 0 && (
            <div className="flex flex-col gap-3 rounded-xl border border-line bg-cream-secondary/40 p-3">
              <p className="text-xs font-medium text-ink-soft">Personalize</p>

              {autoMappedVars.map((v) => {
                const cf = contactFieldFor(v)!;
                return (
                  <div key={v} className="rounded-lg border border-line bg-surface-2 p-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-ink">
                      <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 font-medium text-emerald-600">
                        Auto
                      </span>
                      <span>
                        {`{{${v}}}`} ← each contact&apos;s {cf}
                      </span>
                    </div>
                    <input
                      value={variableValues[v] ?? ""}
                      onChange={(e) => setVariableValues({ ...variableValues, [v]: e.target.value })}
                      placeholder={`Fallback for manually typed ${channel === "email" ? "emails" : "numbers"} (optional)`}
                      className="mt-2 h-9 w-full rounded-lg border border-line bg-cream px-2.5 text-xs text-ink outline-none focus:border-accent"
                    />
                  </div>
                );
              })}

              {manualVars.map((v) => (
                <input
                  key={v}
                  value={variableValues[v] ?? ""}
                  onChange={(e) => setVariableValues({ ...variableValues, [v]: e.target.value })}
                  placeholder={`Value for {{${v}}} — sent to everyone`}
                  className="h-10 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl border border-line bg-cream-secondary px-4 py-3">
            <span className="text-sm text-ink-soft">
              Estimated cost · {recipients.length} recipient{recipients.length === 1 ? "" : "s"}
            </span>
            <span className="text-sm font-semibold text-ink">{formatINR(estimatedCostPaise)}</span>
          </div>

          <Button onClick={handleSend} disabled={sending || !selectedTemplate} className="w-full gap-1.5">
            <SendIcon size={15} />
            {sending ? "Sending…" : "Send"}
          </Button>
        </div>

        <div>
          <p className="mb-2 text-xs text-ink-muted">Preview</p>
          {selectedTemplate ? (
            <TemplatePreview
              channel={channel}
              headerType={selectedTemplate.headerType}
              header={selectedTemplate.header}
              headerImageUrl={selectedTemplate.headerImageUrl}
              body={selectedTemplate.body}
              footer={selectedTemplate.footer}
              subject={selectedTemplate.subject}
              bannerImageUrl={selectedTemplate.bannerImageUrl}
              buttons={selectedTemplate.buttons}
              sampleValues={
                selectedContacts[0]
                  ? {
                      ...variableValues,
                      ...Object.fromEntries(
                        autoMappedVars
                          .map((v) => [v, selectedContacts[0][contactFieldFor(v)!] ?? ""])
                          .filter(([, value]) => value),
                      ),
                    }
                  : variableValues
              }
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-muted">
              Choose a template to preview it
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <ContactListsPanel
          channel={channel}
          selectedIds={selectedIds}
          onToggleContact={toggleContact}
          onSelectList={selectList}
        />
      </div>

      {sendResult && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface-2">
          <div className="border-b border-line p-5">
            <h2 className="text-sm font-semibold text-ink">Send results</h2>
            <p className="text-xs text-ink-muted">
              {sendResult.sent} sent
              {sendResult.failed > 0 ? `, ${sendResult.failed} failed` : ""} ·{" "}
              {formatINR(sendResult.totalCostPaise)} total
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-ink-muted">
                  <th className="px-5 py-2.5 font-medium">To</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {sendResult.messages
                  .slice((resultsPage - 1) * RESULTS_PAGE_SIZE, resultsPage * RESULTS_PAGE_SIZE)
                  .map((m) => (
                    <tr key={m._id} className="border-b border-line/60 last:border-0">
                      <td className="px-5 py-2.5 text-ink-soft">{m.to}</td>
                      <td className="px-5 py-2.5">
                        <MessageStatusBadge status={m.status} />
                      </td>
                      <td className="px-5 py-2.5 text-ink-soft">{formatINR(m.costPaise)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={resultsPage}
            limit={RESULTS_PAGE_SIZE}
            total={sendResult.messages.length}
            onPageChange={setResultsPage}
          />
        </div>
      )}
    </>
  );
}
