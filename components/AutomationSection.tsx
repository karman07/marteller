import {
  Clock,
  Mail,
  MessageCircle,
  MessageSquareText,
  Route,
  Split,
  UserPlus,
} from "lucide-react";
import { Container } from "./ui/Container";
import { Reveal } from "./Reveal";

function Connector() {
  return (
    <div className="flex justify-center py-1">
      <svg width="2" height="28" className="text-paper/40">
        <line
          x1="1"
          y1="0"
          x2="1"
          y2="28"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="4 4"
          className="animate-flow"
        />
      </svg>
    </div>
  );
}

function Node({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Mail;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-xs items-center gap-3 rounded-2xl border border-paper/15 bg-paper/[0.06] px-5 py-4 backdrop-blur-sm transition-colors hover:border-paper/30">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper/10 text-accent-light">
        <Icon size={16} />
      </span>
      <div>
        <p className="text-sm font-semibold text-paper">{title}</p>
        <p className="text-xs text-paper/60">{subtitle}</p>
      </div>
    </div>
  );
}

export function AutomationSection() {
  return (
    <section className="bg-panel py-24 sm:py-32">
      <Container className="grid gap-16 lg:grid-cols-2 lg:items-center lg:gap-12">
        <Reveal>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-light">
            Automation
          </span>
          <h2 className="mt-4 text-balance text-4xl font-black tracking-tight text-paper sm:text-5xl">
            Let communication run itself.
          </h2>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-paper/70">
            Build automated workflows that send the right message through the
            right channel at exactly the right moment.
          </p>
        </Reveal>

        <Reveal delay={100}>
          <div className="rounded-[1.75rem] border border-paper/10 bg-paper/[0.03] p-6 sm:p-8">
            <Node icon={UserPlus} title="Customer Signs Up" subtitle="Trigger" />
            <Connector />
            <Node icon={Mail} title="Welcome Email" subtitle="Email channel" />
            <Connector />
            <Node icon={Clock} title="Wait 1 Day" subtitle="Delay" />
            <Connector />
            <Node
              icon={MessageCircle}
              title="WhatsApp Follow-up"
              subtitle="WhatsApp channel"
            />
            <Connector />
            <Node icon={Split} title="No Response?" subtitle="Condition" />

            <div className="mt-1 grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-center py-1">
                  <span className="rounded-full bg-paper/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-light">
                    Yes
                  </span>
                </div>
                <Node
                  icon={MessageSquareText}
                  title="Send SMS"
                  subtitle="SMS channel"
                />
              </div>
              <div>
                <div className="flex justify-center py-1">
                  <span className="rounded-full bg-paper/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-paper/50">
                    No
                  </span>
                </div>
                <Node
                  icon={Route}
                  title="Continue Journey"
                  subtitle="Next step"
                />
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
