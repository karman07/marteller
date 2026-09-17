import { ArrowRight, Mail, MessageCircle, MessageSquareText, Zap } from "lucide-react";
import { Container } from "../ui/Container";
import { Button } from "../ui/Button";
import { Pill } from "../ui/Pill";
import { DashboardPreview } from "./DashboardPreview";

const pills = [
  { icon: <MessageCircle size={13} className="text-accent" />, label: "WhatsApp" },
  { icon: <Mail size={13} className="text-accent" />, label: "Email" },
  { icon: <MessageSquareText size={13} className="text-accent" />, label: "SMS" },
  { icon: <Zap size={13} className="text-accent" />, label: "Automation" },
];

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-cream pt-16 pb-20 sm:pt-20 lg:pb-28">
      <div className="bg-grid pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />

      <Container className="grid items-center gap-16 lg:grid-cols-2 lg:gap-12">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Powering Business Communication
          </span>

          <h1 className="mt-5 text-balance text-5xl font-black leading-[0.98] tracking-tight text-ink sm:text-6xl lg:text-[4.25rem]">
            Every <span className="text-accent">Customer</span>.
            <br />
            Every <span className="text-accent">Channel</span>.
            <br />
            <span className="text-accent">One Platform</span>.
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
            Send WhatsApp, Email, and SMS campaigns, notifications, and
            automated customer messages from one reliable communication
            platform.
          </p>

          <div className="mt-7 flex flex-wrap gap-2.5">
            {pills.map((p) => (
              <Pill key={p.label} icon={p.icon}>
                {p.label}
              </Pill>
            ))}
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Button href="#signup" variant="primary" className="px-7 py-3.5 text-[15px]">
              Start Building
              <ArrowRight size={16} />
            </Button>
            <Button href="#platform" variant="outline" className="px-7 py-3.5 text-[15px]">
              Explore Platform
            </Button>
          </div>
        </div>

        <DashboardPreview />
      </Container>
    </section>
  );
}
