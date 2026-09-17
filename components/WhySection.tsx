import { Activity, Layers, ShieldCheck, TrendingUp } from "lucide-react";
import { Container } from "./ui/Container";
import { SectionLabel } from "./ui/Pill";
import { Reveal } from "./Reveal";

const metrics = [
  {
    icon: ShieldCheck,
    value: "99.9%",
    label: "Platform reliability",
  },
  {
    icon: Activity,
    value: "Real-time",
    label: "Delivery insights",
  },
  {
    icon: Layers,
    value: "3 Channels",
    label: "One unified platform",
  },
  {
    icon: TrendingUp,
    value: "Built to scale",
    label: "From your first message to millions",
  },
];

export function WhySection() {
  return (
    <section className="bg-cream-secondary/50 py-24 sm:py-32">
      <Container>
        <Reveal className="max-w-2xl">
          <SectionLabel>Why Marteller</SectionLabel>
          <h2 className="mt-4 text-balance text-4xl font-black tracking-tight text-ink sm:text-5xl">
            Reliable communication at every scale.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, i) => (
            <Reveal key={metric.label} delay={i * 80}>
              <div className="flex h-full flex-col gap-4 rounded-2xl border border-line bg-surface p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <metric.icon size={20} />
                </span>
                <div>
                  <p className="text-2xl font-extrabold tracking-tight text-ink">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">{metric.label}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
