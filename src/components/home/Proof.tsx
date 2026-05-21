import * as React from "react";
import { CircuitBreakerDemo } from "../demo/CircuitBreakerDemo";
import { Section } from "../ui/Section";
import { Heading } from "../ui/Heading";
import { Container } from "../ui/Container";
import { Link } from "../ui/Link";
import { Stack } from "../ui/Stack";
import { Reveal } from "../ui/Reveal";

export function Proof() {
  return (
    <Section id="proof" border="top">
      <Container>
        <Reveal>
          <Stack gap={8}>
            <div className="max-w-2xl">
              <Heading variant="caption" className="mb-4 text-primary">
                Distributed Resilience in Action
              </Heading>
              <Heading variant="section" className="mb-6" level={2}>
                The "Fail-Fast" Pattern.
              </Heading>
              <p className="text-lg text-secondary leading-relaxed">
                Watch how a system survives upstream failure. "Trip & Hammer" to see 
                standard requests hit a timeout cliff while the Circuit Breaker opens 
                to reject traffic instantly, protecting your cluster from resource exhaustion.
              </p>
            </div>

            <div className="panel-dark rounded-2xl overflow-hidden shadow-2xl">
              <CircuitBreakerDemo />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted max-w-md">
                Every request hits Fly.io → BFF → Fault-Injected Catalog Service. 
                Real-time circuit state and latency metrics.
              </p>
              <Link variant="cta" href="/demos">
                Explore all 13 patterns →
              </Link>
            </div>
          </Stack>
        </Reveal>
      </Container>
    </Section>
  );
}
