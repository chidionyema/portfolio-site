import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, RotateCcw, Play } from "lucide-react";
import { Section } from "../ui/Section";
import { Heading } from "../ui/Heading";
import { Container } from "../ui/Container";
import { Reveal } from "../ui/Reveal";
import { Link } from "../ui/Link";
import { cn } from "../../lib/utils";

type StepState = "waiting" | "active" | "done" | "failed" | "compensating" | "compensated";

interface Step {
  service: string;
  action: string;
  compensate: string;
  state: StepState;
}

const INITIAL_STEPS: Step[] = [
  { service: "Catalog", action: "Reserve stock", compensate: "Release stock", state: "waiting" },
  { service: "Payments", action: "Charge card", compensate: "Refund card", state: "waiting" },
  { service: "Orders", action: "Confirm order", compensate: "Cancel order", state: "waiting" },
];

const DOT_COLOR: Record<StepState, string> = {
  waiting: "bg-white/20",
  active: "bg-accent animate-pulse",
  done: "bg-success",
  failed: "bg-error",
  compensating: "bg-warning animate-pulse",
  compensated: "bg-warning",
};

const LABEL: Record<StepState, string> = {
  waiting: "",
  active: "processing…",
  done: "✓ done",
  failed: "✗ failed",
  compensating: "rolling back…",
  compensated: "↩ rolled back",
};

type Scenario = "happy" | "failure";

export function SagaAnimation() {
  const [steps, setSteps] = useState(INITIAL_STEPS);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [scenario, setScenario] = useState<Scenario>("happy");
  const [result, setResult] = useState<string>("");

  const reset = useCallback(() => {
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, state: "waiting" })));
    setPhase("idle");
    setResult("");
  }, []);

  const run = useCallback(async () => {
    reset();
    setPhase("running");

    const update = (idx: number, state: StepState) =>
      setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, state } : s)));

    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // Step through forward
    for (let i = 0; i < INITIAL_STEPS.length; i++) {
      update(i, "active");
      await delay(800);

      if (scenario === "failure" && i === 1) {
        update(i, "failed");
        await delay(600);
        setResult("Payment declined → saga compensating…");

        // Compensate backwards
        for (let j = i - 1; j >= 0; j--) {
          update(j, "compensating");
          await delay(600);
          update(j, "compensated");
        }
        await delay(400);
        setResult("All steps rolled back. No money taken, no stock held.");
        setPhase("done");
        return;
      }

      update(i, "done");
    }

    await delay(300);
    setResult("Order confirmed. Stock reserved, payment captured, order created.");
    setPhase("done");
  }, [scenario, reset]);

  // Auto-play on first viewport entry
  const [hasPlayed, setHasPlayed] = useState(false);
  useEffect(() => {
    if (!hasPlayed && phase === "idle") {
      const timer = setTimeout(() => {
        setHasPlayed(true);
        run();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [hasPlayed, phase, run]);

  return (
    <Section id="saga-proof" border="top" padding="dense">
      <Container>
        <Reveal>
          <div className="max-w-2xl mb-8">
            <Heading variant="caption" className="mb-4">
              Watch it work
            </Heading>
            <Heading variant="section" className="mb-4" level={2}>
              What happens when checkout fails halfway through?
            </Heading>
            <p className="text-base text-secondary leading-relaxed">
              A checkout touches three services: stock, payments, and orders.
              Toggle "Payment fails" to see the system automatically undo
              everything that already happened. No stuck orders, no ghost charges.
            </p>
          </div>
        </Reveal>

        <div className="panel-dark rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-6 sm:p-8">
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <button
                onClick={() => { setScenario("happy"); if (phase === "done") reset(); }}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  scenario === "happy"
                    ? "border-success/50 text-success bg-success/10"
                    : "border-white/10 text-white/40 hover:text-white/60"
                )}
              >
                Happy path
              </button>
              <button
                onClick={() => { setScenario("failure"); if (phase === "done") reset(); }}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  scenario === "failure"
                    ? "border-error/50 text-error bg-error/10"
                    : "border-white/10 text-white/40 hover:text-white/60"
                )}
              >
                Payment fails
              </button>

              <button
                onClick={phase === "running" ? undefined : run}
                disabled={phase === "running"}
                className={cn(
                  "ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all",
                  phase === "running"
                    ? "border border-white/10 text-white/30 cursor-not-allowed"
                    : "border border-accent/50 text-accent hover:bg-accent/10"
                )}
              >
                {phase === "done" ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    Replay
                  </>
                ) : phase === "running" ? (
                  "Running…"
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    Run saga
                  </>
                )}
              </button>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {steps.map((step, i) => (
                <motion.div
                  key={step.service}
                  layout
                  className={cn(
                    "flex items-center gap-4 px-4 py-3 rounded-lg border transition-colors",
                    step.state === "active" && "border-accent/30 bg-accent/5",
                    step.state === "done" && "border-success/20 bg-success/5",
                    step.state === "failed" && "border-error/30 bg-error/5",
                    step.state === "compensating" && "border-warning/30 bg-warning/5",
                    step.state === "compensated" && "border-warning/20 bg-warning/5",
                    step.state === "waiting" && "border-white/[0.06] bg-white/[0.02]",
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full shrink-0 transition-colors", DOT_COLOR[step.state])} />

                  <span className="font-mono text-[11px] text-white/50 w-20 shrink-0">
                    {step.service}
                  </span>

                  <span className="font-mono text-xs text-white/80 flex-1">
                    {step.state === "compensating" || step.state === "compensated"
                      ? step.compensate
                      : step.action}
                  </span>

                  <AnimatePresence mode="wait">
                    {step.state !== "waiting" && (
                      <motion.span
                        key={step.state}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className={cn(
                          "font-mono text-[10px] shrink-0",
                          step.state === "done" && "text-success",
                          step.state === "failed" && "text-error",
                          step.state === "active" && "text-accent",
                          (step.state === "compensating" || step.state === "compensated") && "text-warning",
                        )}
                      >
                        {LABEL[step.state]}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            {/* Result */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "mt-6 px-4 py-3 rounded-lg border font-mono text-xs",
                    scenario === "happy" && phase === "done"
                      ? "border-success/20 text-success/90 bg-success/5"
                      : "border-warning/20 text-warning/90 bg-warning/5"
                  )}
                >
                  {result}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted max-w-md">
            The real demo sends requests through Cloudflare → BFF → RabbitMQ → Postgres.
          </p>
          <Link variant="cta" href="/demos/checkout-saga">
            Full interactive demo →
          </Link>
        </div>
      </Container>
    </Section>
  );
}
