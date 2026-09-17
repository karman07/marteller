import { Mail, MessageCircle, MessageSquareText } from "lucide-react";
import { Container } from "./ui/Container";

const items = [
  { icon: MessageCircle, label: "WhatsApp" },
  { icon: Mail, label: "Email" },
  { icon: MessageSquareText, label: "SMS" },
];

export function ChannelStrip() {
  return (
    <section className="border-y border-line bg-cream-secondary/60 py-10">
      <Container className="flex flex-col items-center gap-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
          One Platform · Three Channels · Unlimited Conversations
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 text-ink"
            >
              <item.icon size={18} className="text-accent" />
              <span className="text-base font-semibold tracking-tight">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
