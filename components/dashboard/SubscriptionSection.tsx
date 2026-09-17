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
  fetchMySubscription,
  fetchPlans,
  startSubscribe,
} from "@/lib/billing";

type RazorpayCheckoutOptions = {
  key: string;
  subscription_id: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler?: (response: unknown) => void;
  modal?: { ondismiss?: () => void };
};

type RazorpayCheckoutInstance = { open: () => void };

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const CHANNEL_LABELS: Record<keyof Plan["messageLimits"], string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  sms: "SMS",
};

export function SubscriptionSection() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [current, setCurrent] = useState<{ subscription: Subscription; plan: Plan } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    Promise.all([fetchPlans(), fetchMySubscription()])
      .then(([planList, subscription]) => {
        setPlans(planList);
        setCurrent(subscription);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }

  useEffect(load, []);

  // The Checkout `handler` fires as soon as Razorpay confirms payment
  // client-side, but our own Subscription doc only flips to
  // active/authenticated once the webhook lands (see
  // SubscriptionsService.processWebhookEvent on the backend) — so poll
  // briefly rather than trusting the client-side callback alone.
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

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {(Object.keys(CHANNEL_LABELS) as (keyof Plan["messageLimits"])[]).map((channel) => {
            const limit = plan.messageLimits[channel];
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
        A monthly message allowance per channel — usage beyond it draws from your wallet below.
      </p>
      {error && <p className="mt-3 rounded-lg bg-accent-soft/60 px-3 py-2 text-sm text-accent">{error}</p>}

      {plans.length === 0 ? (
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
