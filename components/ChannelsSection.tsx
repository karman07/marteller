import { ArrowRight, Check, Mail, MessageCircle, MessageSquareText } from "lucide-react";
import { Container } from "./ui/Container";
import { SectionLabel } from "./ui/Pill";
import { Reveal } from "./Reveal";

const channels = [
  {
    icon: MessageCircle,
    title: "WhatsApp Business",
    description:
      "Deliver rich, personal conversations on the channel your customers already use.",
    features: [
      "Template messaging",
      "Transactional notifications",
      "Campaigns",
      "Automated workflows",
      "Delivery tracking",
    ],
    cta: "Explore WhatsApp",
  },
  {
    icon: Mail,
    title: "Email Delivery",
    description:
      "Send transactional and marketing emails with reliable delivery and clear insights.",
    features: [
      "Transactional email",
      "Marketing campaigns",
      "Templates",
      "Analytics",
      "High-volume sending",
    ],
    cta: "Explore Email",
  },
  {
    icon: MessageSquareText,
    title: "SMS Messaging",
    description:
      "Deliver important messages instantly when speed and reach matter most.",
    features: [
      "OTP & verification",
      "Transactional SMS",
      "Bulk campaigns",
      "Delivery reports",
      "Global reach",
    ],
    cta: "Explore SMS",
  },
];

export function ChannelsSection() {
  return (
    <section id="platform" className="bg-cream py-24 sm:py-32">
      <Container>
        <Reveal className="max-w-2xl">
          <SectionLabel>One Platform, Every Message</SectionLabel>
          <h2 className="mt-4 text-balance text-4xl font-black tracking-tight text-ink sm:text-5xl">
            Reach customers wherever they are.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            Choose the right channel for every moment and manage every
            conversation through Marteller.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {channels.map((channel, i) => (
            <Reveal key={channel.title} delay={i * 100}>
              <div className="group flex h-full flex-col rounded-3xl border border-line bg-surface p-8 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_24px_48px_-24px_rgba(27,22,18,0.25)]">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-cream">
                  <channel.icon size={22} />
                </span>
                <h3 className="mt-6 text-xl font-bold tracking-tight text-ink">
                  {channel.title}
                </h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">
                  {channel.description}
                </p>

                <ul className="mt-6 space-y-2.5">
                  {channel.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2.5 text-sm text-ink"
                    >
                      <Check size={15} className="shrink-0 text-accent" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <a
                  href="#platform"
                  className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-accent"
                >
                  {channel.cta}
                  <ArrowRight
                    size={15}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
