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
                Checkout demo
              </Heading>
              <Heading variant="section" className="mb-6" level={2}>
                Four services, one transaction.
              </Heading>
              <p className="text-lg text-secondary leading-relaxed">
                Reserves stock in Catalog, creates a payment session in Payments,
                confirms the order in Orders. A saga in CheckoutOrchestrator
                coordinates the steps. Use <strong>{"'Inject Fault'"}</strong> to
                fail a step and see the saga roll back.
              </p>
            </div>

            <div className="panel-dark rounded-2xl overflow-hidden shadow-2xl">
              <CheckoutDemo />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted max-w-md">
                Request path: browser → Cloudflare → Fly.io BFF → RabbitMQ → service → Postgres.
              </p>
              <Link variant="cta" href="/demos">
                All 13 demos →
              </Link>
            </div>
          </Stack>
        </Reveal>
      </Container>
    </Section>
  );
}
