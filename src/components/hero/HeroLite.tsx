import { ArrowRight, Zap } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "../../lib/brand-icons";
import { buttonVariants } from "../ui/Button";
import { Heading } from "../ui/Heading";
import { Container } from "../ui/Container";
import { Pill } from "../ui/Pill";
import { Reveal } from "../ui/Reveal";
import { Stack } from "../ui/Stack";
import { cn } from "../../lib/utils";
import type { HeroPreviewData } from "./HeroPreview";
import type { LiveMetrics } from "../../lib/api/demo-client";

interface HeroProps {
  preview?: HeroPreviewData;
  initialMetrics?: LiveMetrics;
}

export function Hero(_: HeroProps) {
  return (
    <section data-hero className="relative bg-base overflow-hidden border-b border-border">
      <Container size="wide" className="pt-32 pb-24 lg:pt-48 lg:pb-32">
        <Reveal delay={0.1}>
          <Stack gap={10}>
            <div className="max-w-3xl">
              <p className="text-sm text-accent font-semibold tracking-wide uppercase mb-6">
                Chidi Onyema · Principal Backend Engineer
              </p>

              <Heading variant="display" level={1} className="mb-6">
                I build backend systems<br className="hidden sm:block" />
                that don't break<br className="hidden sm:block" />
                under pressure.
              </Heading>

              <p className="text-xl md:text-2xl text-secondary leading-relaxed max-w-3xl mb-4 font-normal">
                Distributed transactions, fault tolerance, financial integrity.
                This portfolio is a live, open-source .NET 9 platform. Not slides, not diagrams.
              </p>

              <p className="text-base text-secondary/70 mb-10 max-w-2xl leading-relaxed">
                Every demo below sends real HTTP requests through 8 microservices
                on Fly.io. The trace IDs and latency in the responses are from actual production services.
              </p>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-8">
                <a href="#challenges" className={cn(buttonVariants({ variant: "primary" }), "gap-2 px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base")}>
                  See what I built
                  <ArrowRight className="w-5 h-5" />
                </a>
                <a href="/architecture" className={cn(buttonVariants({ variant: "secondary" }), "px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base")}>
                  How it works
                </a>
                <div className="flex items-center gap-2">
                  <a
                    href="https://linkedin.com/in/chidionyema"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 text-secondary hover:text-primary transition-colors bg-surface-warm rounded-full"
                    aria-label="LinkedIn"
                  >
                    <LinkedinIcon className="w-5 h-5" />
                  </a>
                  <a
                    href="https://github.com/chidionyema"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 text-secondary hover:text-primary transition-colors bg-surface-warm rounded-full"
                    aria-label="GitHub"
                  >
                    <GithubIcon className="w-5 h-5" />
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-6 border-t border-border/50">
                <Pill variant="status" className="gap-1.5 px-3 py-1 text-[10px] tracking-widest uppercase font-bold">
                  <Zap className="w-3 h-3 text-warning" />
                  Available for contract
                </Pill>
                <span className="text-xs text-muted">London / Remote · 10+ years</span>
              </div>
            </div>
          </Stack>
        </Reveal>
      </Container>
    </section>
  );
}
