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

// Admin sending on an applicant's behalf has no per-tenant contact list to
// draw from (unlike the tenant's own Send tab) — there's also no separate
// "list templates for this applicant" endpoint, so this reuses the shared
// system template library (GET /admin/templates) that every tenant can
// already send from. Recipients are typed in manually.
export function ChannelSendView({ channel, userId }: { channel: Channel; userId: string }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [rateCard, setRateCard] = useState<RateCard | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [recipientsText, setRecipientsText] = useState("");
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

  useEffect(() => {
    listTemplates(channel).then(setTemplates).catch(() => {});
    fetchRateCard().then(setRateCard).catch(() => {});
  }, [channel]);

  const selectedTemplate = templates.find((t) => t._id === selectedTemplateId) ?? null;

  const recipients = useMemo(
    () =>
      Array.from(
        new Set(
          recipientsText
            .split(/[\n,]/)
            .map((r) => r.trim())
            .filter(Boolean),
        ),
      ),
    [recipientsText],
  );

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
      });
      setSendResult(res);
      setResultsPage(1);
      setRecipientsText("");
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
            <textarea
              value={recipientsText}
              onChange={(e) => setRecipientsText(e.target.value)}
              placeholder={
                channel === "email"
                  ? "Emails, one per line or comma separated"
                  : "Phone numbers (+91…), one per line or comma separated"
              }
              rows={4}
              className="w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
            />
          </div>

          {selectedTemplate && selectedTemplate.variables.length > 0 && (
            <div className="flex flex-col gap-3 rounded-xl border border-line bg-cream-secondary/40 p-3">
              <p className="text-xs font-medium text-ink-soft">Personalize — sent to everyone</p>
              {selectedTemplate.variables.map((v) => (
                <input
                  key={v}
                  value={variableValues[v] ?? ""}
                  onChange={(e) => setVariableValues({ ...variableValues, [v]: e.target.value })}
                  placeholder={`Value for {{${v}}}`}
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
              sampleValues={variableValues}
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
