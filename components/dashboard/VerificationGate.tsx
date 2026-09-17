"use client";

import { useEffect, useState } from "react";
import { Clock, FileUp, ShieldCheck, XCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  BusinessVerification,
  VerificationFormField,
  devReviewVerification,
  fetchVerificationFormFields,
  submitVerification,
} from "@/lib/verification";
import { trackFunnelStep } from "@/lib/analytics";

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_PHONE_BYPASS === "true";

export function VerificationGate({
  record,
  onUpdated,
}: {
  record: BusinessVerification;
  onUpdated: (record: BusinessVerification) => void;
}) {
  const [fields, setFields] = useState<VerificationFormField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [businessProof, setBusinessProof] = useState<File | null>(null);
  const [addressProof, setAddressProof] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVerificationFormFields()
      .then((defs) => {
        setFields(defs);
        setFieldValues((prev) => {
          const next = { ...prev };
          for (const f of defs) {
            if (next[f.key] === undefined) next[f.key] = record.fieldValues?.[f.key] ?? "";
          }
          return next;
        });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setValue(key: string, value: string) {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    setError(null);
    for (const f of fields) {
      if (f.required && !fieldValues[f.key]?.trim()) {
        setError(`Enter ${f.label.toLowerCase()}.`);
        return;
      }
    }
    setLoading(true);
    try {
      const updated = await submitVerification({
        fieldValues,
        businessProof: businessProof ?? undefined,
        addressProof: addressProof ?? undefined,
      });
      trackFunnelStep("verification_submitted");
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit verification.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDevReview(status: "verified" | "rejected") {
    const updated = await devReviewVerification(
      status,
      status === "rejected" ? "Documents unclear — please resubmit." : undefined,
    );
    onUpdated(updated);
  }

  const status = record.status;
  const businessNameValue = record.fieldValues?.business_name;

  return (
    <Modal open onClose={() => {}} dismissable={false} size="lg" title="Verify your business to continue">
      <p className="-mt-3 mb-5 text-sm text-ink-soft">
        Complete verification to unlock your dashboard and start sending WhatsApp, Email, and
        SMS messages.
      </p>

      {status === "pending" && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-line bg-cream-secondary p-5">
          <Clock size={20} className="mt-0.5 shrink-0 text-[#fab219]" />
          <div>
            <p className="text-sm font-semibold text-ink">Under review</p>
            <p className="mt-1 text-sm text-ink-soft">
              We&apos;re reviewing {businessNameValue ? `${businessNameValue}'s` : "your"} documents. This
              usually takes 1-2 business days — you can come back once it&apos;s done.
            </p>
            {DEV_BYPASS && (
              <div className="mt-3 flex gap-2 border-t border-line pt-3">
                <p className="mr-1 self-center text-xs text-ink-muted">Dev tools:</p>
                <button
                  onClick={() => handleDevReview("verified")}
                  className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-soft hover:border-accent hover:text-accent"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleDevReview("rejected")}
                  className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-soft hover:border-accent hover:text-accent"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {status === "rejected" && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-line bg-cream-secondary p-5">
          <XCircle size={20} className="mt-0.5 shrink-0 text-[#d03b3b]" />
          <div>
            <p className="text-sm font-semibold text-ink">Verification rejected</p>
            {record.reviewNote && <p className="mt-1 text-sm text-ink-soft">{record.reviewNote}</p>}
            <p className="mt-1 text-sm text-ink-soft">Update your details below and resubmit.</p>
          </div>
        </div>
      )}

      {(status === "not_submitted" || status === "rejected") && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck size={18} className="text-accent" />
            <h2 className="text-sm font-semibold text-ink">Business details</h2>
          </div>

          {error && (
            <p
              data-testid="verification-error"
              className="mb-4 rounded-lg bg-accent-soft/60 px-3 py-2 text-sm text-accent"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col gap-4">
            {fields.map((f) => (
              <FieldInput key={f.key} field={f} value={fieldValues[f.key] ?? ""} onChange={setValue} />
            ))}

            <div className="grid gap-3 sm:grid-cols-2">
              <FileField label="Business proof" file={businessProof} onChange={setBusinessProof} />
              <FileField label="Address proof" file={addressProof} onChange={setAddressProof} />
            </div>

            <Button onClick={handleSubmit} disabled={loading} className="w-full">
              {loading ? "Submitting…" : "Submit for verification"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: VerificationFormField;
  value: string;
  onChange: (key: string, value: string) => void;
}) {
  const className =
    "h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent";
  const placeholder = field.placeholder ?? `${field.label}${field.required ? "" : " (optional)"}`;

  if (field.type === "select") {
    return (
      <select value={value} onChange={(e) => onChange(field.key, e.target.value)} className={className}>
        <option value="">{placeholder}</option>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(field.key, e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
      />
    );
  }

  return (
    <input
      type={field.type === "number" ? "number" : "text"}
      value={value}
      onChange={(e) => onChange(field.key, e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
}

function FileField({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line bg-cream text-center transition-colors hover:border-accent">
      <FileUp size={16} className="text-ink-muted" />
      <span className="px-2 text-xs text-ink-soft">{file ? file.name : label}</span>
      <input
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
