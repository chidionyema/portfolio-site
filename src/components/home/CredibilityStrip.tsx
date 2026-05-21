import { motion } from "framer-motion";

const facts = [
  { value: "8", label: "Microservices", detail: "on Fly.io" },
  { value: "159", label: "Arch Rules", detail: "enforced every build" },
  { value: "13", label: "Test Suites", detail: "unit → E2E" },
  { value: "13", label: "Live Demos", detail: "real HTTP, real data" },
];

const stack = [
  ".NET 9", "MassTransit", "PostgreSQL", "RabbitMQ",
  "Redis", "EF Core", "Polly", "Vault", "Fly.io",
];

export function CredibilityStrip() {
  return (
    <div className="w-full border-y border-border bg-surface-warm/30">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6">
          {facts.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="text-center"
            >
              <div className="text-2xl font-black tabular-nums text-primary font-mono">
                {f.value}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted mt-1">
                {f.label}
              </div>
              <div className="text-[10px] text-secondary/50 mt-0.5">
                {f.detail}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tech pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {stack.map((name) => (
            <span
              key={name}
              className="px-2.5 py-1 rounded-full bg-surface border border-border text-[11px] font-medium text-secondary"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
