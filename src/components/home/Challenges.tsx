import { motion } from "framer-motion";
import { ArrowRight, ShieldAlert, RefreshCw, Zap, BookOpen } from "lucide-react";
import { Section } from "../ui/Section";
import { Heading } from "../ui/Heading";
import { Container } from "../ui/Container";
import { Reveal } from "../ui/Reveal";
import { cn } from "../../lib/utils";
import { buttonVariants } from "../ui/Button";

const challenges = [
  {
    icon: ShieldAlert,
    problem: "Payment succeeds, but stock reservation fails.",
    solution: "A saga rolls back every step automatically — no orphaned charges, no manual cleanup.",
    demo: "/demos/checkout-saga",
    demoLabel: "Try the checkout saga",
    color: "border-red-500/30",
    iconColor: "text-red-400",
  },
  {
    icon: RefreshCw,
    problem: "A customer double-clicks 'Pay' during a network hiccup.",
    solution: "Idempotency keys ensure the charge happens exactly once, no matter how many retries.",
    demo: "/demos/idempotency",
    demoLabel: "Test safe retries",
    color: "border-amber-500/30",
    iconColor: "text-amber-400",
  },
  {
    icon: Zap,
    problem: "One downstream service goes down during peak traffic.",
    solution: "Circuit breakers shed load instantly. Healthy services keep serving. Recovery is automatic.",
    demo: "/demos/circuit-breaker",
    demoLabel: "Break a circuit",
    color: "border-blue-500/30",
    iconColor: "text-blue-400",
  },
  {
    icon: BookOpen,
    problem: "An auditor asks where €47.50 went three months ago.",
    solution: "A double-entry ledger tracks every cent. Every transaction balances to zero. Always.",
    demo: "/demos/double-entry-ledger",
    demoLabel: "Inspect the ledger",
    color: "border-emerald-500/30",
    iconColor: "text-emerald-400",
  },
];

export function Challenges() {
  return (
    <Section id="challenges" border="top">
      <Container>
        <Reveal>
          <div className="max-w-2xl mb-12">
            <Heading variant="caption" className="mb-4">
              Real problems, real solutions
            </Heading>
            <Heading variant="section" className="mb-6" level={2}>
              The hard parts of distributed systems.
            </Heading>
            <p className="text-lg text-secondary leading-relaxed">
              Each card is a real failure mode I've solved. Click through to see it happen live.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {challenges.map((c, i) => (
            <motion.a
              key={c.demo}
              href={c.demo}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className={cn(
                "group block rounded-2xl border bg-surface p-6 sm:p-8",
                "hover:shadow-lg hover:border-accent/30 transition-all duration-200",
                c.color
              )}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={cn("p-2.5 rounded-xl bg-surface-warm shrink-0", c.iconColor)}>
                  <c.icon className="w-5 h-5" />
                </div>
                <p className="text-base font-semibold text-primary leading-snug pt-1.5">
                  {c.problem}
                </p>
              </div>

              <p className="text-sm text-secondary leading-relaxed mb-6 pl-[52px]">
                {c.solution}
              </p>

              <div className="flex items-center gap-2 pl-[52px] text-accent text-sm font-medium group-hover:gap-3 transition-all">
                {c.demoLabel}
                <ArrowRight className="w-4 h-4" />
              </div>
            </motion.a>
          ))}
        </div>

        <Reveal delay={0.3}>
          <div className="flex justify-center mt-10">
            <a href="/demos" className={cn(buttonVariants({ variant: "secondary" }), "gap-2 px-6 py-3 text-sm")}>
              All 13 interactive demos
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
