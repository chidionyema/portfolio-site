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
    problem: "A customer is charged but their order never appears.",
    solution: "The system detects the partial failure and automatically reverses the charge, releases the reserved stock, and cancels the order. No support ticket needed.",
    demo: "/demos/checkout-saga",
    demoLabel: "See the auto-rollback",
    color: "border-red-500/30",
    iconColor: "text-red-400",
  },
  {
    icon: RefreshCw,
    problem: "A customer panic-clicks 'Pay' three times during a slow connection.",
    solution: "They're charged exactly once. The second and third clicks are detected as duplicates and return the original receipt. Zero revenue leakage.",
    demo: "/demos/idempotency",
    demoLabel: "Fire duplicate requests",
    color: "border-amber-500/30",
    iconColor: "text-amber-400",
  },
  {
    icon: Zap,
    problem: "The payment provider goes down during Black Friday.",
    solution: "Traffic to the failing service is cut off in milliseconds. Browsing, search, and cart keep working. When the provider recovers, traffic resumes automatically.",
    demo: "/demos/circuit-breaker",
    demoLabel: "Kill a service, watch recovery",
    color: "border-blue-500/30",
    iconColor: "text-blue-400",
  },
  {
    icon: BookOpen,
    problem: "Finance asks: where did this refund go, and who approved it?",
    solution: "Every pound in, every pound out. A complete audit trail where debits always equal credits. Money cannot be created, lost, or hidden.",
    demo: "/demos/double-entry-ledger",
    demoLabel: "Trace a transaction",
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
