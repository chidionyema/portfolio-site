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
                Evidence
              </Heading>
              <Heading variant="section" className="mb-6" level={2}>
                A live .NET 9 cluster, running in your browser.
              </Heading>
              <p className="text-lg text-secondary leading-relaxed">
                This isn't a mock. Trigger a checkout to see a real MassTransit 
                saga state machine orchestrate across four microservices. 
                Click 'Inject Fault' to see the cluster automatically compensate.
              </p>
            </div>

            <div className="panel-dark rounded-2xl overflow-hidden shadow-2xl">
              <CheckoutDemo />
            </div>

            <div className="flex justify-end">
              <Link variant="cta" href="/demos">
                Explore the full pattern catalog →
              </Link>
            </div>
          </Stack>
        </Reveal>
      </Container>
    </Section>
  );
}
