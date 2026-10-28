"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { formatINR } from "@/lib/currency";
import {
  Plan,
  Subscription,
  cancelSubscription,
  devConfirmSubscription,
  fetchMySubscription,
  fetchPlans,
  startSubscribe,
} from "@/lib/billing";
import { loadRazorpayScript } from "@/lib/razorpay";

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_PHONE_BYPASS === "true";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const CHANNEL_LABELS: Record<keyof Plan["messageLimits"], string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  sms: "SMS",
  ai: "AI generations",
};

// onStatusChange: lets a parent gate (PlanGate/DashboardShell) stay in sync
// without waiting for a full page refresh — fires every time fresh
// subscription data loads, with the status string or null if there's none.
export function SubscriptionSection({
  onStatusChange,
}: {
  onStatusChange?: (status: string | null) => void;
} = {}) {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [current, setCurrent] = useState<{ subscription: Subscription; plan: Plan } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Independent fetches, not Promise.all — a transient failure on one
  // (e.g. the backend restarting mid-request) shouldn't blank out the
  // other and silently render as "no plans available" when it's actually
  // a fetch failure, not an empty plan list.
  function load() {
    setLoadError(null);
    fetchPlans()
      .then(setPlans)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Could not load plans."))
      .finally(() => setLoaded(true));
    fetchMySubscription()
      .then((subscription) => {
        setCurrent(subscription);
        onStatusChange?.(subscription?.subscription.status ?? null);
      })
      .catch(() => {});
  }

  useEffect(load, []);

  // The Checkout `handler` fires as soon as Razorpay confirms payment
  // client-side, but our own Subscription doc only flips to
  // active/authenticated once the webhook lands (see
  // SubscriptionsService.processWebhookEvent on the backend) — so poll
  // briefly rather than trusting the client-side callback alone. In dev,
  // the webhook can never reach a local backend (no public URL), so after
  // one empty poll, substitute the dev-only confirm endpoint instead of
  // waiting out the rest of the loop.
  async function pollForConfirmation() {
    setConfirming(true);
    for (let i = 0; i < 6; i++) {
      await sleep(2000);
      try {
        const subscription = await fetchMySubscription();
        if (subscription && subscription.subscription.status !== "created") {
          setCurrent(subscription);
          break;
        }
        if (i === 0 && DEV_BYPASS) {
          const confirmed = await devConfirmSubscription();
          setCurrent(confirmed);
          break;
        }
      } catch {
        // keep polling
      }
    }
    setConfirming(false);
    setSubscribingPlanId(null);
    load();
  }

  async function handleSubscribe(plan: Plan) {
    setError(null);
    setSubscribingPlanId(plan._id);
    try {
      const { razorpaySubscriptionId, razorpayKeyId } = await startSubscribe(plan._id);
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Could not load the payment gateway. Check your connection and try again.");
      }

      const checkout = new window.Razorpay({
        key: razorpayKeyId,
        subscription_id: razorpaySubscriptionId,
        name: "Marteller",
        description: `${plan.name} plan — ${formatINR(plan.priceMonthlyPaise)}/mo`,
        prefill: {
          name: user?.name ?? undefined,
          email: user?.email ?? undefined,
          contact: user?.phoneNumber ?? undefined,
        },
        theme: { color: "#d96a36" },
        handler: () => {
          pollForConfirmation();
        },
        modal: {
          ondismiss: () => setSubscribingPlanId(null),
        },
      });
      checkout.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setSubscribingPlanId(null);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel your subscription at the end of the current billing period?")) return;
    setCanceling(true);
    setError(null);
    try {
      await cancelSubscription(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel subscription.");
    } finally {
      setCanceling(false);
    }
  }

  if (!loaded) {
    return (
      <div className="rounded-2xl border border-line bg-surface-2 p-6">
        <p className="text-sm text-ink-muted">Loading plans…</p>
      </div>
    );
  }

  if (current) {
    const { subscription, plan } = current;
    return (
      <div className="rounded-2xl border border-line bg-surface-2 p-6">
        {error && <p className="mb-3 rounded-lg bg-accent-soft/60 px-3 py-2 text-sm text-accent">{error}</p>}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-ink-muted">Current plan</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{plan.name}</p>
            <p className="mt-1 text-xs text-ink-muted">
              {formatINR(plan.priceMonthlyPaise)}/mo · status: {subscription.status}
              {subscription.cancelAtPeriodEnd && " · cancels at period end"}
            </p>
          </div>
          {!subscription.cancelAtPeriodEnd && subscription.status !== "cancelled" && (
            <Button onClick={handleCancel} disabled={canceling} variant="outline">
              {canceling ? "Cancelling…" : "Cancel subscription"}
            </Button>
          )}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(CHANNEL_LABELS) as (keyof Plan["messageLimits"])[]).map((channel) => {
            // Legacy plans created before the AI dimension existed won't
            // have this key in Mongo at all.
            const limit = plan.messageLimits[channel] ?? 0;
            const used = subscription.messagesUsedThisPeriod[channel] ?? 0;
            const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
            return (
              <div key={channel}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-ink-soft">{CHANNEL_LABELS[channel]}</span>
                  <span className="text-ink-muted">
                    {used} / {limit}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-cream-secondary">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-6">
      <p className="text-sm font-semibold text-ink">Choose a plan</p>
      <p className="mt-1 text-xs text-ink-muted">
        A monthly message allowance per channel, included free with your plan — usage beyond it draws
        from your credits instead (see Billing &amp; usage below).
      </p>
      {error && <p className="mt-3 rounded-lg bg-accent-soft/60 px-3 py-2 text-sm text-accent">{error}</p>}

      {loadError ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-accent-soft/60 px-3 py-2 text-sm text-accent">
          <span>Couldn&apos;t load plans — {loadError}</span>
          <button onClick={load} className="shrink-0 font-medium underline hover:no-underline">
            Retry
          </button>
        </div>
      ) : plans.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">No plans available right now.</p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const isBusy = subscribingPlanId === plan._id;
            return (
              <div key={plan._id} className="flex flex-col rounded-xl border border-line bg-cream p-4">
                <p className="text-sm font-semibold text-ink">{plan.name}</p>
                <p className="mt-1 text-xl font-semibold tracking-tight text-ink">
                  {formatINR(plan.priceMonthlyPaise)}
                  <span className="text-xs font-medium text-ink-muted"> /mo</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-soft">
                  <span>{plan.messageLimits.whatsapp} WhatsApp</span>
                  <span>{plan.messageLimits.email} Email</span>
                  <span>{plan.messageLimits.sms} SMS</span>
                  <span>{plan.messageLimits.ai ?? 0} AI generations</span>
                </div>
                {plan.features.length > 0 && (
                  <ul className="mt-3 flex-1 space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-ink-soft">
                        <Check size={12} className="mt-0.5 shrink-0 text-accent" /> {f}
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  onClick={() => handleSubscribe(plan)}
                  disabled={isBusy}
                  className="mt-4 w-full gap-1.5"
                >
                  {isBusy ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      {confirming ? "Confirming…" : "Starting…"}
                    </>
                  ) : (
                    "Subscribe"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
