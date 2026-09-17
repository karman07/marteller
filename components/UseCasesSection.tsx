import {
  GraduationCap,
  HeartPulse,
  Landmark,
  Rocket,
  ShoppingCart,
} from "lucide-react";
import { Container } from "./ui/Container";
import { SectionLabel } from "./ui/Pill";
import { Reveal } from "./Reveal";

const useCases = [
  {
    icon: ShoppingCart,
    title: "E-commerce",
    description:
      "Order updates, abandoned carts, promotions, and delivery notifications.",
  },
  {
    icon: GraduationCap,
    title: "Education",
    description:
      "Admissions, student notifications, reminders, announcements, and results.",
  },
  {
    icon: Rocket,
    title: "SaaS",
    description:
      "User onboarding, product alerts, account updates, and automated journeys.",
  },
  {
    icon: Landmark,
    title: "Finance",
    description:
      "OTPs, transaction alerts, verification, and important account notifications.",
  },
  {
    icon: HeartPulse,
    title: "Healthcare",
    description: "Appointment reminders, follow-ups, and patient communication.",
  },
];

export function UseCasesSection() {
  return (
    <section id="use-cases" className="bg-cream py-24 sm:py-32">
      <Container>
        <Reveal className="max-w-2xl">
          <SectionLabel>Use Cases</SectionLabel>
          <h2 className="mt-4 text-balance text-4xl font-black tracking-tight text-ink sm:text-5xl">
            Built for every business that needs to communicate.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((useCase, i) => (
            <Reveal key={useCase.title} delay={i * 80}>
              <div className="group flex h-full flex-col gap-4 rounded-2xl border border-line bg-surface p-7 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-cream">
                  <useCase.icon size={20} />
                </span>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-ink">
                    {useCase.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {useCase.description}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
