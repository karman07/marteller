"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Container } from "./ui/Container";
import { SectionLabel } from "./ui/Pill";
import { Button } from "./ui/Button";
import { Reveal } from "./Reveal";
import { trackFunnelStep } from "@/lib/analytics";
import { fetchPlans, Plan } from "@/lib/billing";
import { formatINR } from "@/lib/currency";
import { useAuth } from "@/context/AuthContext";

// Static fallback shown until real plans exist in the admin console (or if
// the plans fetch fails) — keeps the marketing page from ever looking
// broken/empty before billing is fully configured.
const FALLBACK_PLANS = [
  {
    name: "Starter",
    description: "For teams getting started with customer communication.",
    features: [
      "WhatsApp, Email & SMS sending",
      "Core automation workflows",
      "Standard support",
      "Community resources",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Growth",
    description: "For growing businesses sending across multiple channels.",
    features: [
      "Everything in Starter",
      "Advanced automation workflows",
      "Priority support",
      "Analytics & reporting",
    ],
    cta: "Get Started",
    highlighted: true,
  },
  {
    name: "Enterprise",
    description:
      "For high-volume businesses requiring custom infrastructure and support.",
    features: [
      "Custom infrastructure",
      "Dedicated account support",
      "SLAs & uptime guarantees",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { user, openLoginModal } = useAuth();
  const [plans, setPlans] = useState<Plan[] | null>(null);

  useEffect(() => {
    fetchPlans()
      .then((items) => setPlans(items.filter((p) => p.isActive)))
      .catch(() => setPlans([]));
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    let fired = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired) {
          fired = true;
          trackFunnelStep("pricing_view");
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const dynamicPlans = plans && plans.length > 0;
  const cards = dynamicPlans
    ? plans!
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((plan, i, arr) => ({
          key: plan._id,
          name: plan.name,
          description: plan.description ?? "",
          priceLabel: `${formatINR(plan.priceMonthlyPaise)}/mo`,
          features: plan.features,
          cta: user ? "Go to billing" : "Get Started",
          highlighted: i === Math.min(1, arr.length - 1),
          href: user ? "/dashboard/billing" : undefined,
          onClick: user ? undefined : openLoginModal,
        }))
    : FALLBACK_PLANS.map((plan) => ({
        key: plan.name,
        name: plan.name,
        description: plan.description,
        priceLabel: undefined as string | undefined,
        features: plan.features,
        cta: plan.cta,
        highlighted: plan.highlighted,
        href: "#pricing" as string | undefined,
        onClick: undefined as (() => void) | undefined,
      }));

  return (
    <section id="pricing" ref={sectionRef} className="bg-cream py-24 sm:py-32">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionLabel>Pricing</SectionLabel>
          <h2 className="mt-4 text-balance text-4xl font-black tracking-tight text-ink sm:text-5xl">
            Start simple. Scale freely.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {cards.map((plan, i) => (
            <Reveal key={plan.key} delay={i * 100}>
              <div
                className={`flex h-full flex-col rounded-3xl p-8 ${
                  plan.highlighted
                    ? "border-2 border-accent bg-panel text-paper shadow-[0_24px_48px_-20px_rgba(27,22,18,0.35)]"
                    : "border border-line bg-surface text-ink"
                }`}
              >
                {plan.highlighted && (
                  <span className="mb-4 inline-flex w-fit items-center rounded-full bg-paper/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent-light">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-bold tracking-tight">
                  {plan.name}
                </h3>
                {plan.priceLabel && (
                  <p className="mt-1 text-2xl font-semibold tracking-tight">{plan.priceLabel}</p>
                )}
                <p
                  className={`mt-2.5 text-sm leading-relaxed ${
                    plan.highlighted ? "text-paper/70" : "text-ink-soft"
                  }`}
                >
                  {plan.description}
                </p>

                <ul className="mt-7 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2.5 text-sm"
                    >
                      <Check
                        size={15}
                        className={
                          plan.highlighted ? "text-accent-light" : "text-accent"
                        }
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  href={plan.href}
                  onClick={plan.onClick}
                  variant={plan.highlighted ? "cream" : "outline"}
                  className="mt-8 w-full"
                >
                  {plan.cta}
                </Button>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={300} className="mt-10 text-center">
          <Button href="#pricing" variant="outline" className="px-7 py-3">
            View Pricing
          </Button>
        </Reveal>
      </Container>
    </section>
  );
}
