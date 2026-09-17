"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  CreatePlanPayload,
  Plan,
  createPlan,
  deletePlan,
  listAllPlans,
  updatePlan,
} from "@/lib/billing";
import { formatINR } from "@/lib/currency";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const EMPTY_FORM: CreatePlanPayload = {
  name: "",
  slug: "",
  description: "",
  priceMonthlyPaise: 0,
  currency: "INR",
  messageLimits: { whatsapp: 0, email: 0, sms: 0 },
  features: [],
  isActive: true,
  sortOrder: 0,
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreatePlanPayload>(EMPTY_FORM);
  const [featuresText, setFeaturesText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    listAllPlans()
      .then((items) => {
        setPlans(items);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFeaturesText("");
    setError(null);
    setCreating(true);
  }

  function openEdit(plan: Plan) {
    setForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description ?? "",
      priceMonthlyPaise: plan.priceMonthlyPaise,
      currency: plan.currency,
      messageLimits: { ...plan.messageLimits },
      features: plan.features,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
    });
    setFeaturesText(plan.features.join("\n"));
    setError(null);
    setEditing(plan);
  }

  function closeModal() {
    setCreating(false);
    setEditing(null);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.slug.trim()) {
      setError("Name and slug are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload: CreatePlanPayload = {
      ...form,
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description?.trim() || undefined,
      features: featuresText
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
    };
    try {
      if (editing) {
        const updated = await updatePlan(editing._id, payload);
        setPlans((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
      } else {
        const created = await createPlan(payload);
        setPlans((prev) => [...prev, created]);
      }
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save plan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    if (!confirm(`Delete the "${editing.name}" plan? This cannot be undone.`)) return;
    await deletePlan(editing._id);
    setPlans((prev) => prev.filter((p) => p._id !== editing._id));
    closeModal();
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-8 py-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Plans</h1>
          <p className="mt-1 text-sm text-ink-soft">Subscription tiers customers can buy via Razorpay.</p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus size={15} /> New plan
        </Button>
      </div>

      <div className="px-8 py-6">
        {!loaded ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : plans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-sm text-ink-muted">
            No plans yet — create one to start selling subscriptions.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <button
                key={plan._id}
                onClick={() => openEdit(plan)}
                className="flex flex-col rounded-2xl border border-line bg-surface-2 p-5 text-left transition-colors hover:border-accent"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">{plan.name}</p>
                    <p className="text-xs text-ink-muted">{plan.slug}</p>
                  </div>
                  <Badge variant={plan.isActive ? "success" : "muted"}>
                    {plan.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">
                  {formatINR(plan.priceMonthlyPaise)}
                  <span className="text-xs font-medium text-ink-muted"> /mo</span>
                </p>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-soft">
                  <span>{plan.messageLimits.whatsapp} WhatsApp</span>
                  <span>{plan.messageLimits.email} Email</span>
                  <span>{plan.messageLimits.sms} SMS</span>
                </div>
                {plan.features.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1 text-xs text-ink-muted">
                    {plan.features.slice(0, 3).map((f) => (
                      <li key={f} className="truncate">
                        • {f}
                      </li>
                    ))}
                  </ul>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal open={creating || !!editing} onClose={closeModal} title={editing ? "Edit plan" : "New plan"} size="lg">
        <div className="flex flex-col gap-3">
          {error && <p className="rounded-lg bg-accent-soft/60 px-3 py-2 text-sm text-accent">{error}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Plan name, e.g. Growth"
              className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
            />
            <input
              value={form.slug}
              onChange={(e) =>
                setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))
              }
              placeholder="slug, e.g. growth"
              className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
            />
          </div>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)"
            rows={2}
            className="w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
              Price / month (₹)
              <input
                type="number"
                min={0}
                value={form.priceMonthlyPaise / 100}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priceMonthlyPaise: Math.round(Number(e.target.value) * 100) }))
                }
                className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
              Sort order
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
              />
            </label>
          </div>

          <p className="mt-1 text-xs font-semibold text-ink-soft">Monthly message allowance</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {(["whatsapp", "email", "sms"] as const).map((channel) => (
              <label key={channel} className="flex flex-col gap-1 text-xs font-medium text-ink-soft capitalize">
                {channel}
                <input
                  type="number"
                  min={0}
                  value={form.messageLimits[channel]}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      messageLimits: { ...f.messageLimits, [channel]: Number(e.target.value) },
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
                />
              </label>
            ))}
          </div>

          <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
            Features (one per line)
            <textarea
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              rows={4}
              placeholder={"Unlimited templates\nPriority support"}
              className="w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-line accent-accent"
            />
            Active — visible on the pricing page
          </label>

          <div className="mt-2 flex items-center gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? "Saving…" : editing ? "Save changes" : "Create plan"}
            </Button>
            {editing && (
              <button
                onClick={handleDelete}
                aria-label="Delete plan"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line text-ink-muted transition-colors hover:border-accent hover:text-accent"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
