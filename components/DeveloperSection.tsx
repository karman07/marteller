import { ArrowRight, Code2, Server, ShieldCheck, Webhook, Zap } from "lucide-react";
import { Container } from "./ui/Container";
import { Reveal } from "./Reveal";

const features = [
  { icon: Code2, label: "Simple REST APIs" },
  { icon: Webhook, label: "Webhooks" },
  { icon: Zap, label: "Real-time delivery status" },
  { icon: ShieldCheck, label: "Secure authentication" },
  { icon: Server, label: "Scalable infrastructure" },
];

export function DeveloperSection() {
  return (
    <section
      id="developers"
      className="bg-panel-alt py-24 sm:py-32"
    >
      <Container className="grid gap-16 lg:grid-cols-2 lg:items-center lg:gap-14">
        <Reveal>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-light">
            Developer Experience
          </span>
          <h2 className="mt-4 text-balance text-4xl font-black leading-[1.05] tracking-tight text-paper sm:text-5xl">
            Built for developers.
            <br />
            Ready for scale.
          </h2>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-paper/65">
            Integrate powerful communication capabilities into your product
            with simple APIs, webhooks, and reliable infrastructure.
          </p>

          <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {features.map((f) => (
              <li
                key={f.label}
                className="flex items-center gap-2.5 text-sm text-paper/80"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper/10 text-accent-light">
                  <f.icon size={13} />
                </span>
                {f.label}
              </li>
            ))}
          </ul>

          <a
            href="#developers"
            className="mt-9 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-light"
          >
            View Documentation
            <ArrowRight size={15} />
          </a>
        </Reveal>

        <Reveal delay={100}>
          <div className="overflow-hidden rounded-2xl border border-paper/10 bg-black/30 shadow-[0_30px_60px_-24px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-1.5 border-b border-paper/10 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-paper/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-paper/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-paper/20" />
              <span className="ml-3 text-xs text-paper/40">send.ts</span>
            </div>
            <pre className="overflow-x-auto p-6 text-[13px] leading-relaxed">
              <code className="font-mono">
                <span className="text-paper/50">await</span>{" "}
                <span className="text-paper">marteller</span>
                <span className="text-paper/50">.</span>
                <span className="text-paper">messages</span>
                <span className="text-paper/50">.</span>
                <span className="text-accent-light">send</span>
                <span className="text-paper/50">{"({"}</span>
                {"\n"}
                {"  "}
                <span className="text-paper/70">channel</span>
                <span className="text-paper/50">: </span>
                <span className="text-accent-light">&quot;whatsapp&quot;</span>
                <span className="text-paper/50">,</span>
                {"\n"}
                {"  "}
                <span className="text-paper/70">to</span>
                <span className="text-paper/50">: </span>
                <span className="text-accent-light">
                  &quot;+91XXXXXXXXXX&quot;
                </span>
                <span className="text-paper/50">,</span>
                {"\n"}
                {"  "}
                <span className="text-paper/70">template</span>
                <span className="text-paper/50">: </span>
                <span className="text-accent-light">
                  &quot;order_confirmation&quot;
                </span>
                {"\n"}
                <span className="text-paper/50">{"});"}</span>
              </code>
            </pre>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
