import * as React from "react";
import { Section } from "../ui/Section";
import { Heading } from "../ui/Heading";
import { Container } from "../ui/Container";
import { Card } from "../ui/Card";
import { Link } from "../ui/Link";
import { Stack } from "../ui/Stack";
import { Reveal } from "../ui/Reveal";

interface Dive {
  slug: string;
  title: string;
  description: string;
  readingTime: string;
}

interface DivesProps {
  dives: Dive[];
}

export function Dives({ dives }: DivesProps) {
  return (
    <Section id="deep-dives" border="top">
      <Container>
        <Reveal>
          <Stack gap={12}>
            <div className="max-w-2xl">
              <Heading variant="caption" className="mb-4">
                Architecture
              </Heading>
              <Heading variant="section" className="mb-6" level={2}>
                Patterns for scale and reliability.
              </Heading>
              <p className="text-lg text-secondary leading-relaxed">
                Detailed breakdowns of the decisions that define the platform. 
                Focusing on how we handle distributed state, data consistency, and failure at scale.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {dives.map((dive, i) => (
                <Reveal key={dive.slug} delay={i * 0.1}>
                  <Card className="h-full hover:shadow-md transition-all group">
                    <Stack gap={4} className="h-full justify-between">
                      <div>
                        <Heading variant="panel" level={3} className="mb-3 group-hover:text-secondary transition-colors">
                          {dive.title}
                        </Heading>
                        <p className="text-sm text-secondary line-clamp-3">
                          {dive.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-6">
                        <span className="text-[10px] uppercase tracking-widest text-muted">
                          {dive.readingTime} min read
                        </span>
                        <Link variant="cta" href={`/deep-dives/${dive.slug}`} className="text-xs">
                          Read dive →
                        </Link>
                      </div>
                    </Stack>
                  </Card>
                </Reveal>
              ))}
            </div>
            
            <div className="flex justify-center mt-8">
              <Link variant="cta" href="/#writing" className="text-sm">
                View full technical archive
              </Link>
            </div>
          </Stack>
        </Reveal>
      </Container>
    </Section>
  );
}
