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
                See it work, then break it
              </Heading>
              <Heading variant="section" className="mb-6" level={2}>
                A real checkout across four services.
              </Heading>
              <p className="text-lg text-secondary leading-relaxed">
                This demo runs a full purchase flow: reserve stock in Catalog,
                create a payment session in Payments, confirm the order in Orders,
                all coordinated by a saga in CheckoutOrchestrator. Click{' '}
                <strong>{"'Inject Fault'"}</strong> to kill a step mid-flow and watch
                the saga automatically undo everything — stock released, payment
                reversed, no orphaned data.
              </p>
            </div>

            <div className="panel-dark rounded-2xl overflow-hidden shadow-2xl">
              <CheckoutDemo />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted max-w-md">
                Not a simulation. Every request travels: your browser → Cloudflare →
                Fly.io BFF → RabbitMQ → microservice → Postgres. Trace IDs and
                latency are real.
              </p>
              <Link variant="cta" href="/demos">
                Explore all 13 demos →
              </Link>
            </div>
          </Stack>
        </Reveal>
      </Container>
    </Section>
  );
}
