"use client";

import { useEffect, useState } from "react";
import { Check, IndianRupee } from "lucide-react";
import { fetchRateCard, RateCard, updateRateCard } from "@/lib/admin";
import { Button } from "@/components/ui/Button";

// Rates are stored in paise but edited in rupees for admin usability —
// these two helpers are the only place that conversion happens.
function toRupees(paise: number) {
  return paise / 100;
}
function toPaise(rupees: number) {
  return Math.round(rupees * 100);
}

export default function PricingPage() {
  const [rateCard, setRateCard] = useState<RateCard | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [whatsappMarketing, setWhatsappMarketing] = useState("0");
  const [whatsappUtility, setWhatsappUtility] = useState("0");
  const [whatsappAuthentication, setWhatsappAuthentication] = useState("0");
  const [email, setEmail] = useState("0");
  const [smsPerSegment, setSmsPerSegment] = useState("0");
  const [smsSegmentLength, setSmsSegmentLength] = useState("160");

  useEffect(() => {
    fetchRateCard()
      .then((rc) => {
        setRateCard(rc);
        setWhatsappMarketing(String(toRupees(rc.whatsappMarketingPaise)));
        setWhatsappUtility(String(toRupees(rc.whatsappUtilityPaise)));
        setWhatsappAuthentication(String(toRupees(rc.whatsappAuthenticationPaise)));
        setEmail(String(toRupees(rc.emailPaise)));
        setSmsPerSegment(String(toRupees(rc.smsPerSegmentPaise)));
        setSmsSegmentLength(String(rc.smsSegmentLength));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateRateCard({
        whatsappMarketingPaise: toPaise(Number(whatsappMarketing)),
        whatsappUtilityPaise: toPaise(Number(whatsappUtility)),
        whatsappAuthenticationPaise: toPaise(Number(whatsappAuthentication)),
        emailPaise: toPaise(Number(email)),
        smsPerSegmentPaise: toPaise(Number(smsPerSegment)),
        smsSegmentLength: Number(smsSegmentLength) || 160,
      });
      setRateCard(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save pricing.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="border-b border-line px-8 py-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Pricing</h1>
        <p className="mt-1 text-sm text-ink-soft">
          What a message actually costs against a customer&apos;s wallet, per channel — separate from a plan&apos;s
          monthly platform fee. Any rate can be set to 0 to make that channel free. Changes only apply to sends from
          this point forward.
        </p>
      </div>

      <div className="px-8 py-6">
        {!loaded || !rateCard ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : (
          <div className="max-w-2xl rounded-2xl border border-line bg-surface-2 p-5">
            {error && <p className="mb-3 rounded-lg bg-accent-soft/60 px-3 py-2 text-sm text-accent">{error}</p>}

            <p className="mb-2 text-sm font-semibold text-ink">WhatsApp (₹ per message)</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <RateField label="Marketing" value={whatsappMarketing} onChange={setWhatsappMarketing} />
              <RateField label="Utility" value={whatsappUtility} onChange={setWhatsappUtility} />
              <RateField label="Authentication" value={whatsappAuthentication} onChange={setWhatsappAuthentication} />
            </div>

            <p className="mb-2 mt-5 text-sm font-semibold text-ink">Email (₹ per message)</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <RateField label="Per message" value={email} onChange={setEmail} />
            </div>

            <p className="mb-2 mt-5 text-sm font-semibold text-ink">SMS</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <RateField label="Per segment (₹)" value={smsPerSegment} onChange={setSmsPerSegment} />
              <RateField
                label="Segment length (chars)"
                value={smsSegmentLength}
                onChange={setSmsSegmentLength}
                step="1"
              />
            </div>

            <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
              <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                <IndianRupee size={14} /> {saving ? "Saving…" : "Save pricing"}
              </Button>
              {saved && (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <Check size={13} /> Saved
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function RateField({
  label,
  value,
  onChange,
  step = "0.01",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
      {label}
      <input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-line bg-cream px-2.5 text-sm text-ink outline-none focus:border-accent"
      />
    </label>
  );
}
