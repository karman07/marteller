import { Check } from "lucide-react";
import { Container } from "./ui/Container";
import { SectionLabel } from "./ui/Pill";
import { Button } from "./ui/Button";
import { Reveal } from "./Reveal";

const plans = [
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
  return (
    <section id="pricing" className="bg-cream py-24 sm:py-32">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionLabel>Pricing</SectionLabel>
          <h2 className="mt-4 text-balance text-4xl font-black tracking-tight text-ink sm:text-5xl">
            Start simple. Scale freely.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 100}>
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
                  href="#pricing"
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
