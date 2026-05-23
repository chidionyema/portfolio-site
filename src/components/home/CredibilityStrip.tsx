import { motion } from "framer-motion";

const facts = [
  { value: "8", label: "Services", detail: "deployed on Fly.io" },
  { value: "13", label: "Live Demos", detail: "click a button, see it work" },
  { value: "0", label: "Mocked Calls", detail: "every response is real" },
  { value: "10+", label: "Years", detail: "backend engineering" },
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

      </div>
    </div>
  );
}
