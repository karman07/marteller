import { Container } from "./ui/Container";
import { Logo } from "./Logo";

const columns = [
  {
    title: "Product",
    links: ["WhatsApp", "Email", "SMS", "Automation", "Analytics"],
  },
  {
    title: "Developers",
    links: ["Documentation", "API Reference", "SDKs", "Status"],
  },
  {
    title: "Company",
    links: ["About", "Contact", "Careers"],
  },
  {
    title: "Legal",
    links: ["Privacy", "Terms", "Security"],
  },
];

export function Footer() {
  return (
    <footer id="footer" className="border-t border-line bg-cream-secondary/40">
      <Container className="py-16">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_repeat(4,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
              The communication infrastructure behind every customer
              conversation — WhatsApp, Email, and SMS from one platform.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">
                {col.title}
              </p>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#footer"
                      className="text-sm text-ink-soft transition-colors hover:text-ink"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 border-t border-line pt-8 text-sm text-ink-soft">
          © 2026 Marteller. All rights reserved.
        </div>
      </Container>
    </footer>
  );
}
