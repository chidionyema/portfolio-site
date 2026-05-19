import * as React from "react";
import { CheckoutDemo } from "../demo/CheckoutDemo";
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
                Don't take my word for it — try it
              </Heading>
              <Heading variant="section" className="mb-6" level={2}>
                A distributed saga, running live.
              </Heading>
              <p className="text-lg text-secondary leading-relaxed">
                This checkout orchestrates stock reservation, payment, and order creation 
                across four real microservices. Click <strong>'Inject Fault'</strong> to 
                crash a step mid-flow and watch the saga automatically compensate — 
                stock released, payment reversed, no orphaned data.
              </p>
            </div>

            <div className="panel-dark rounded-2xl overflow-hidden shadow-2xl">
              <CheckoutDemo />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted max-w-md">
                Every request hits Fly.io → BFF → Catalog/Payments/Orders via RabbitMQ. 
                Trace IDs, latency, and instance IDs are real.
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
