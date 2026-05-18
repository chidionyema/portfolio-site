import { motion } from 'framer-motion';
import {
  Server, Shield, Code2, BookOpen, Database, Lock, Globe,
  GitBranch, FlaskConical, ArrowRight, Workflow, AlertTriangle,
  CheckCircle2, XCircle, Terminal
} from 'lucide-react';
import { Section } from '../ui/Section';
import { Container } from '../ui/Container';
import { Heading } from '../ui/Heading';
import { Stack } from '../ui/Stack';
import { Card } from '../ui/Card';
import { Glass } from '../ui/Glass';
import { Reveal } from '../ui/Reveal';
import { Link } from '../ui/Link';
import { cn } from '../../lib/utils';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { delay, duration: 0.5 },
});

export function ArchitecturePage() {
  return (
    <div className="space-y-24">
      {/* Hero */}
      <motion.div {...fadeUp()} className="text-center max-w-3xl mx-auto">
        <Heading variant="caption" className="mb-4">Platform Engineering</Heading>
        <Heading variant="section" level={1} className="mb-6">
          16 microservices. 159 architecture guards. 50 custom analyzers.
        </Heading>
        <p className="text-lg text-secondary leading-relaxed">
          Every line enforced in CI. No exceptions, no overrides, no "we'll fix it later."
        </p>
      </motion.div>

      {/* Section A: Roslyn Analyzers */}
      <section>
        <motion.div {...fadeUp()}>
          <Heading variant="caption" className="mb-2 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-accent" />
            Compile-Time Enforcement
          </Heading>
          <Heading variant="panel" level={2} className="mb-8">
            Custom Roslyn Analyzers (HWK001–050)
          </Heading>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4">
          {ANALYZER_EXAMPLES.map((ex, i) => (
            <motion.div key={ex.id} {...fadeUp(i * 0.1)}>
              <Card variant="panel-dark" padding="md" className="h-full">
                <div className="font-mono text-[10px] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-accent font-black">{ex.id}</span>
                    <span className="text-error text-[9px] uppercase tracking-widest">build error</span>
                  </div>
                  <div className="text-[11px] font-bold text-primary leading-snug">{ex.title}</div>

                  {/* Bad code */}
                  <div className="p-3 rounded-lg bg-error/5 border border-error/10 relative">
                    <XCircle className="w-3 h-3 text-error absolute top-2 right-2" />
                    <pre className="text-error/70 line-through decoration-error/30 whitespace-pre-wrap text-[9px] leading-relaxed">
                      {ex.bad}
                    </pre>
                  </div>

                  {/* Good code */}
                  <div className="p-3 rounded-lg bg-success/5 border border-success/10 relative">
                    <CheckCircle2 className="w-3 h-3 text-success absolute top-2 right-2" />
                    <pre className="text-success/80 whitespace-pre-wrap text-[9px] leading-relaxed">
                      {ex.good}
                    </pre>
                  </div>

                  <p className="text-muted/60 text-[9px] uppercase tracking-widest">
                    Fires at compile time, not at code review.
                  </p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Section B: Architecture Guards */}
      <section>
        <motion.div {...fadeUp()}>
          <Heading variant="caption" className="mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4 text-success" />
            CI Enforcement
          </Heading>
          <Heading variant="panel" level={2} className="mb-4">
            159 Architecture Guards + 12 NetArchTest Rules
          </Heading>
          <p className="text-secondary text-sm mb-8 max-w-2xl">
            Regex patterns and assembly-level rules run on every PR. A single violation blocks the merge.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {GUARD_EXAMPLES.map((guard, i) => (
            <motion.div key={i} {...fadeUp(i * 0.05)}>
              <Glass intensity="low" className="p-4 border-none">
                <div className="flex items-start gap-3 font-mono text-[10px]">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-primary mb-1">{guard.rule}</div>
                    <div className="text-muted/70 leading-relaxed">{guard.desc}</div>
                  </div>
                </div>
              </Glass>
            </motion.div>
          ))}
        </div>

        <motion.div {...fadeUp(0.3)} className="mt-4 text-center">
          <a
            href="https://github.com/chidionyema/haworks-platform/blob/main/tests/Platform.ArchitecturalGuards/PlatformGuardTests.cs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent/60 hover:text-accent transition-colors"
          >
            <Terminal className="w-3 h-3" />
            View all 159 guards on GitHub
          </a>
        </motion.div>
      </section>

      {/* Section C: Double-Entry Ledger */}
      <section>
        <motion.div {...fadeUp()}>
          <Heading variant="caption" className="mb-2 flex items-center gap-2">
            <Database className="w-4 h-4 text-accent" />
            Financial Integrity
          </Heading>
          <Heading variant="panel" level={2} className="mb-8">
            Double-Entry Ledger (Payouts Service)
          </Heading>
        </motion.div>

        <motion.div {...fadeUp(0.1)}>
          <Card variant="panel-dark" padding="lg" className="max-w-2xl mx-auto">
            <div className="font-mono text-[11px] space-y-6">
              <LedgerRow type="credit" account="Seller Payable" amount="+£39.99" desc="Payment received" />
              <LedgerRow type="debit" account="Platform Escrow" amount="-£39.99" desc="Funds reserved" />
              <div className="h-px bg-white/10" />
              <LedgerRow type="debit" account="Seller Payable" amount="-£39.99" desc="Payout disbursed" />
              <LedgerRow type="credit" account="Bank (Stripe)" amount="+£39.99" desc="Wire initiated" />
              <div className="h-px bg-white/10" />
              <div className="text-center text-[10px] text-success font-black uppercase tracking-widest pt-2">
                Sum of all entries = £0.00 (invariant enforced by DB CHECK constraint)
              </div>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* Section D: GDPR Erasure Saga */}
      <section>
        <motion.div {...fadeUp()}>
          <Heading variant="caption" className="mb-2 flex items-center gap-2">
            <Lock className="w-4 h-4 text-error" />
            Compliance Engineering
          </Heading>
          <Heading variant="panel" level={2} className="mb-8">
            GDPR Article 17 Erasure Saga
          </Heading>
        </motion.div>

        <motion.div {...fadeUp(0.1)}>
          <Card variant="panel-dark" padding="lg" className="max-w-3xl mx-auto">
            <div className="flex flex-wrap items-center justify-center gap-3 font-mono text-[10px]">
              {ERASURE_STEPS.map((step, i) => (
                <div key={step.label} className="flex items-center gap-3">
                  <div className={cn("px-3 py-2 rounded-lg border", step.bg, step.border)}>
                    <div className={cn("font-black uppercase tracking-widest", step.color)}>{step.label}</div>
                    <div className="text-muted/60 text-[8px] mt-0.5">{step.detail}</div>
                  </div>
                  {i < ERASURE_STEPS.length - 1 && <ArrowRight className="w-4 h-4 text-muted/30 shrink-0" />}
                </div>
              ))}
            </div>
            <p className="text-center text-[10px] text-muted/60 mt-6 font-mono uppercase tracking-widest">
              7-day compliance window · stall detection at 24h · audit records anonymized, not deleted
            </p>
          </Card>
        </motion.div>
      </section>

      {/* Section E: CDC Pipeline */}
      <section>
        <motion.div {...fadeUp()}>
          <Heading variant="caption" className="mb-2 flex items-center gap-2">
            <Workflow className="w-4 h-4 text-accent" />
            Event Backbone
          </Heading>
          <Heading variant="panel" level={2} className="mb-8">
            CDC Pipeline (Debezium → Kafka → Elasticsearch)
          </Heading>
        </motion.div>

        <motion.div {...fadeUp(0.1)}>
          <Card variant="panel-dark" padding="lg" className="max-w-3xl mx-auto">
            <div className="flex flex-wrap items-center justify-center gap-4 font-mono text-[10px]">
              {CDC_PIPELINE.map((node, i) => (
                <div key={node.name} className="flex items-center gap-4">
                  <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-center">
                    <node.icon className="w-5 h-5 text-accent mx-auto mb-1" />
                    <div className="font-black uppercase tracking-widest text-primary">{node.name}</div>
                    <div className="text-muted/50 text-[8px] mt-0.5">{node.detail}</div>
                  </div>
                  {i < CDC_PIPELINE.length - 1 && <ArrowRight className="w-4 h-4 text-accent/30 shrink-0" />}
                </div>
              ))}
            </div>
            <p className="text-center text-[10px] text-muted/60 mt-6 font-mono uppercase tracking-widest">
              No dual-write, no polling. The WAL is the source of truth. Sub-second propagation.
            </p>
          </Card>
        </motion.div>
      </section>

      {/* Section F: Contract Testing */}
      <section>
        <motion.div {...fadeUp()}>
          <Heading variant="caption" className="mb-2 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-warning" />
            Test Strategy
          </Heading>
          <Heading variant="panel" level={2} className="mb-8">
            Consumer-Driven Contract Tests (Pact)
          </Heading>
        </motion.div>

        <motion.div {...fadeUp(0.1)}>
          <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto font-mono text-[10px]">
            <Glass intensity="low" className="p-5 text-center border-none">
              <div className="text-2xl font-black text-primary mb-1">13</div>
              <div className="text-[9px] uppercase tracking-widest text-muted font-black">Contract Suites</div>
            </Glass>
            <Glass intensity="low" className="p-5 text-center border-none">
              <div className="text-2xl font-black text-success mb-1">159</div>
              <div className="text-[9px] uppercase tracking-widest text-muted font-black">Arch Guards</div>
            </Glass>
            <Glass intensity="low" className="p-5 text-center border-none">
              <div className="text-2xl font-black text-accent mb-1">50</div>
              <div className="text-[9px] uppercase tracking-widest text-muted font-black">Roslyn Rules</div>
            </Glass>
          </div>
        </motion.div>
      </section>

      {/* Section G: Aspire */}
      <section>
        <motion.div {...fadeUp()}>
          <Heading variant="caption" className="mb-2 flex items-center gap-2">
            <Server className="w-4 h-4 text-accent" />
            Developer Experience
          </Heading>
          <Heading variant="panel" level={2} className="mb-8">
            .NET Aspire Orchestration
          </Heading>
        </motion.div>

        <motion.div {...fadeUp(0.1)}>
          <Card variant="panel-dark" padding="lg" className="max-w-xl mx-auto">
            <pre className="font-mono text-[11px] text-secondary leading-relaxed">
              <span className="text-muted">$</span> dotnet run --project AppHost{'\n'}
              {'\n'}
              <span className="text-accent">13</span> infrastructure containers{'\n'}
              <span className="text-accent">16</span> microservices{'\n'}
              <span className="text-accent"> 1</span> command{'\n'}
              {'\n'}
              <span className="text-success">Dashboard: http://localhost:15888</span>
            </pre>
          </Card>
        </motion.div>
      </section>

      {/* CTA */}
      <motion.div {...fadeUp()} className="text-center py-12">
        <p className="text-lg text-secondary mb-6">Want to see these patterns in action?</p>
        <Link variant="cta" href="/demos">
          Try the Live Demos →
        </Link>
      </motion.div>
    </div>
  );
}

function LedgerRow({ type, account, amount, desc }: { type: 'debit' | 'credit'; account: string; amount: string; desc: string }) {
  const isCredit = type === 'credit';
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className={cn(
          "w-16 text-center py-1 rounded text-[9px] font-black uppercase tracking-widest",
          isCredit ? 'bg-success/10 text-success border border-success/20' : 'bg-error/10 text-error border border-error/20'
        )}>
          {type}
        </span>
        <span className="text-secondary">{account}</span>
      </div>
      <div className="text-right">
        <span className={cn("font-black tabular-nums", isCredit ? 'text-success' : 'text-error')}>{amount}</span>
        <span className="text-muted/50 ml-3">{desc}</span>
      </div>
    </div>
  );
}

const ANALYZER_EXAMPLES = [
  {
    id: 'HWK001',
    title: 'No SaveChangesAsync in MassTransit consumers',
    bad: `await _dbContext.SaveChangesAsync();\n// Outbox commits automatically`,
    good: `// Mutations via EF tracked entities\n// MassTransit outbox commits on success`,
  },
  {
    id: 'HWK002',
    title: 'No Guid.NewGuid() inside Polly retry',
    bad: `policy.ExecuteAsync(() => {\n  var key = Guid.NewGuid(); // new per retry!\n});`,
    good: `var key = Guid.NewGuid();\npolicy.ExecuteAsync(() => {\n  Call(key); // same across retries\n});`,
  },
  {
    id: 'HWK035',
    title: 'No hardcoded currency strings',
    bad: `var amount = new Money(100, "USD");\n// What about GBP, EUR customers?`,
    good: `var amount = new Money(\n  100, options.DefaultCurrency\n); // From config`,
  },
];

const GUARD_EXAMPLES = [
  { rule: 'No PublishAsync without SaveChanges', desc: 'Events written to outbox must be flushed' },
  { rule: 'No BeginTransactionAsync in consumers', desc: 'MassTransit outbox provides the transaction' },
  { rule: 'No localhost fallback in config', desc: 'Containers resolve via service mesh, not loopback' },
  { rule: 'No positional records for events', desc: 'MassTransit cannot deserialize positional constructors' },
  { rule: 'No raw Testcontainers in tests', desc: 'Must use SharedTestPostgres singleton' },
  { rule: 'No idempotency key inside Polly retry', desc: 'Key changes per attempt, defeating idempotency' },
];

const ERASURE_STEPS = [
  { label: 'Request', detail: 'User submits', color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/20' },
  { label: 'Orders', detail: 'PII scrubbed', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
  { label: 'Payments', detail: 'PII scrubbed', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
  { label: 'Identity', detail: 'Account deleted', color: 'text-error', bg: 'bg-error/10', border: 'border-error/20' },
  { label: 'Audit', detail: 'Anonymized', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
  { label: 'Confirmed', detail: '< 7 days', color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
];

const CDC_PIPELINE = [
  { name: 'PostgreSQL', detail: 'WAL stream', icon: Database },
  { name: 'Debezium', detail: 'CDC connector', icon: GitBranch },
  { name: 'Kafka', detail: 'Event log', icon: Server },
  { name: 'Elasticsearch', detail: 'Search index', icon: Globe },
];
