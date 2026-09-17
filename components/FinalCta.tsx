import { Container } from "./ui/Container";
import { Button } from "./ui/Button";
import { Reveal } from "./Reveal";

export function FinalCta() {
  return (
    <section id="signup" className="bg-panel py-24 sm:py-28">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-4xl font-black leading-tight tracking-tight text-paper sm:text-5xl">
            Start every conversation with Marteller.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-paper/80">
            Build better customer experiences across WhatsApp, Email, and SMS.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Button href="#signup" variant="cream" className="px-7 py-3.5 text-[15px]">
              Get Started
            </Button>
            <Button
              href="#footer"
              variant="outline"
              className="border-paper/30 px-7 py-3.5 text-[15px] text-paper hover:border-paper hover:text-paper"
            >
              Talk to Sales
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
