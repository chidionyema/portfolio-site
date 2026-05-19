import { ArrowRight, Zap } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "../../lib/brand-icons";
import { useClusterState } from "../../hooks/useClusterState";
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
  const { systemStatus } = useClusterState();

  return (
    <section data-hero className="relative bg-base overflow-hidden border-b border-border">
      <div className="absolute top-6 right-6 z-30">
        <Pill variant="status" className="gap-2 px-3.5 py-1.5 backdrop-blur">
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              systemStatus === "healthy"
                ? "bg-success"
                : systemStatus === "degraded"
                  ? "bg-warning"
                  : "bg-muted/40",
              systemStatus === "healthy" && "animate-pulse"
            )}
          />
          <span className="font-medium">cluster: {systemStatus ?? "connecting"}</span>
        </Pill>
      </div>

      <Container size="wide" className="pt-32 pb-24 lg:pt-48 lg:pb-40">
        <Reveal delay={0.1}>
          <Stack gap={12}>
            <div className="max-w-4xl">
              {/* Credibility signal */}
              <div className="flex items-center gap-3 mb-8">
                <Pill variant="status" className="gap-1.5 px-3 py-1 text-[10px] tracking-widest uppercase font-bold">
                  <Zap className="w-3 h-3 text-warning" />
                  Available for contract
                </Pill>
                <span className="text-xs text-muted">London · Remote · 10+ years</span>
              </div>

              <Heading variant="display" level={1} className="mb-6">
                .NET distributed systems<br className="hidden sm:block" />
                that don't break at&nbsp;3am.
              </Heading>

              <p className="text-xl md:text-2xl text-secondary leading-relaxed max-w-3xl mb-4 font-normal">
                I design and build microservice platforms with real saga orchestration, 
                transactional outboxes, and automated resilience. Not slides — running code.
              </p>

              {/* Differentiator callout */}
              <p className="text-sm text-accent/80 mb-12 max-w-2xl leading-relaxed">
                This portfolio is a <strong className="text-accent">live .NET 9 cluster on Fly.io</strong> — 
                8 microservices, Postgres, RabbitMQ, Redis. Every demo hits real infrastructure. 
                Break it, watch it recover.
              </p>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <a href="/demos" className={cn(buttonVariants({ variant: "primary" }), "gap-2 px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base")}>
                  Try the live demos
                  <ArrowRight className="w-5 h-5" />
                </a>
                <a href="/architecture" className={cn(buttonVariants({ variant: "secondary" }), "px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base")}>
                  Architecture deep dives
                </a>
                <div className="flex items-center gap-2">
                  <a
                    href="https://linkedin.com/in/chidionyema"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 text-muted hover:text-primary transition-colors bg-surface-warm rounded-full"
                    aria-label="LinkedIn"
                  >
                    <LinkedinIcon className="w-5 h-5" />
                  </a>
                  <a
                    href="https://github.com/chidionyema"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 text-muted hover:text-primary transition-colors bg-surface-warm rounded-full"
                    aria-label="GitHub"
                  >
                    <GithubIcon className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>
          </Stack>
        </Reveal>
      </Container>
    </section>
  );
}
