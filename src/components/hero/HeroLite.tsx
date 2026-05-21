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
              {/* Context: what this IS — the first thing anyone reads */}
              <p className="text-sm text-accent font-semibold tracking-wide uppercase mb-6">
                Engineering Portfolio — Chidi Onyema
              </p>

              <Heading variant="display" level={1} className="mb-6">
                I built an 8-service platform<br className="hidden sm:block" />
                and deployed it live so you<br className="hidden sm:block" />
                can break it yourself.
              </Heading>

              <p className="text-xl md:text-2xl text-secondary leading-relaxed max-w-3xl mb-4 font-normal">
                This is a real .NET 9 microservices system running on Fly.io.
                Payments, orders, inventory, and event-driven sagas, all wired
                together and open for you to explore.
              </p>

              {/* What makes it different */}
              <p className="text-base text-secondary/70 mb-10 max-w-2xl leading-relaxed">
                Click a button, trigger a checkout across four services, inject a
                failure mid-flow, and watch the system automatically roll back.
                Every response comes from real infrastructure — Postgres, RabbitMQ,
                Redis, with real trace IDs and latency.
              </p>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-8">
                <a href="/demos" className={cn(buttonVariants({ variant: "primary" }), "gap-2 px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base")}>
                  Try the live demos
                  <ArrowRight className="w-5 h-5" />
                </a>
                <a href="/architecture" className={cn(buttonVariants({ variant: "secondary" }), "px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base")}>
                  {"How it's built"}
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

              {/* About me — compact */}
              <div className="flex items-center gap-3 pt-6 border-t border-border/50">
                <Pill variant="status" className="gap-1.5 px-3 py-1 text-[10px] tracking-widest uppercase font-bold">
                  <Zap className="w-3 h-3 text-warning" />
                  Available for contract
                </Pill>
                <span className="text-xs text-muted">Principal Backend Engineer · London / Remote · 10+ years</span>
              </div>
            </div>
          </Stack>
        </Reveal>
      </Container>
    </section>
  );
}
