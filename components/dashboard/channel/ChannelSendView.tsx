"use client";

import { useEffect, useMemo, useState } from "react";
import { Send as SendIcon } from "lucide-react";
import { MessageStatusBadge } from "@/components/dashboard/MessageStatusBadge";
import { Pagination } from "@/components/dashboard/Pagination";
import { Button } from "@/components/ui/Button";
import { Channel } from "@/lib/channels";
import { Template, listTemplates } from "@/lib/templates";
import { MessageLog, RateCard, fetchRateCard, sendApplicantMessage } from "@/lib/messaging";
import { formatINR } from "@/lib/currency";
import { TemplatePreview } from "./TemplatePreview";

const RESULTS_PAGE_SIZE = 10;

export type ApplicantContact = {
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  countryDialCode: string | null;
};

// A template variable named one of these (case-insensitive) is filled
// straight from the matching field on the applicant instead of asking for
// one value typed in by hand.
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

// Per-applicant send — unlike frontend's version (which picks recipients
// from the tenant's own marketing contact lists), there's only ever one
// natural recipient here: this applicant. Defaults to their phone/email for
// the selected channel, with a fallback box for extra manually-typed
// recipients.
export function ChannelSendView({
  userId,
  channel,
  applicant,
}: {
  userId: string;
  channel: Channel;
  applicant: ApplicantContact;
}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [rateCard, setRateCard] = useState<RateCard | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [includeApplicant, setIncludeApplicant] = useState(true);
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

  const applicantValues = useMemo(
    () => ({
      name: applicant.name ?? "",
      phone: applicant.phoneNumber ? `${applicant.countryDialCode ?? ""}${applicant.phoneNumber}` : "",
      email: applicant.email ?? "",
    }),
    [applicant],
  );
  const applicantRecipient = applicantValues[field] || null;

  useEffect(() => {
    setIncludeApplicant(!!applicantRecipient);
  }, [applicantRecipient]);

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

  const manualRecipients = manualRecipientsText
    .split(/[\n,]/)
    .map((r) => r.trim())
    .filter(Boolean);
  const recipients = Array.from(
    new Set([...(includeApplicant && applicantRecipient ? [applicantRecipient] : []), ...manualRecipients]),
  );

  const recipientVariables = useMemo(() => {
    if (!includeApplicant || !applicantRecipient || autoMappedVars.length === 0) return undefined;
    const vars: Record<string, string> = {};
    for (const v of autoMappedVars) {
      const value = applicantValues[contactFieldFor(v)!];
      if (value) vars[v] = value;
    }
    return Object.keys(vars).length > 0 ? { [applicantRecipient]: vars } : undefined;
  }, [includeApplicant, applicantRecipient, autoMappedVars, applicantValues]);

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
      const res = await sendApplicantMessage(userId, {
        templateId: selectedTemplate._id,
        recipients,
        variables: variableValues,
        recipientVariables,
      });
      setSendResult(res);
      setResultsPage(1);
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
            <p className="mb-1.5 text-xs text-ink-muted">Recipients</p>

            {applicantRecipient ? (
              <button
                type="button"
                onClick={() => setIncludeApplicant((v) => !v)}
                className={`mb-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  includeApplicant
                    ? "border-accent bg-accent-soft/40 text-accent"
                    : "border-line text-ink-muted line-through"
                }`}
              >
                This applicant · {applicantRecipient}
              </button>
            ) : (
              <p className="mb-2 text-xs text-ink-muted">
                This applicant has no {channel === "email" ? "email address" : "phone number"} on file — add one
                manually below.
              </p>
            )}

            <textarea
              value={manualRecipientsText}
              onChange={(e) => setManualRecipientsText(e.target.value)}
              placeholder={
                channel === "email"
                  ? "Additional emails, one per line or comma separated (optional)"
                  : "Additional phone numbers (+91…), one per line or comma separated (optional)"
              }
              rows={2}
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
                        {`{{${v}}}`} ← applicant&apos;s {cf}
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
              sampleValues={{
                ...variableValues,
                ...Object.fromEntries(
                  autoMappedVars.map((v) => [v, applicantValues[contactFieldFor(v)!] ?? ""]).filter(([, value]) => value),
                ),
              }}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-muted">
              Choose a template to preview it
            </div>
          )}
        </div>
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
