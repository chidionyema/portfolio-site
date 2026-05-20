import * as React from "react";
import { RateLimiterDemo } from "../demo/RateLimiterDemo";
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
              <Heading variant="caption" className="mb-4">
                Real infrastructure, real results
              </Heading>
              <Heading variant="section" className="mb-6" level={2}>
                Traffic control at scale.
              </Heading>
              <p className="text-lg text-secondary leading-relaxed">
                Watch a real token-bucket rate limiter in action. Every request targets a live 
                .NET 9 cluster. Send bursts of traffic to watch the tokens drain and the system 
                automatically throttle excessive load.
              </p>
            </div>

            <div className="panel-dark rounded-2xl overflow-hidden shadow-2xl">
              <RateLimiterDemo />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted max-w-md">
                Every request hits Fly.io → BFF → Distributed Cache. 
                Trace IDs, latency, and system telemetry are real.
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
