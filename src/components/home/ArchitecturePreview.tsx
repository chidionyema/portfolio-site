import { motion } from 'framer-motion';

interface Node {
  label: string;
  pulse?: boolean;
}

interface Tier {
  name: string;
  nodes: Node[];
  color: string;
}

const TIERS: Tier[] = [
  {
    name: 'Frontend',
    color: 'border-blue-500/40 text-blue-300',
    nodes: [{ label: 'Browser' }, { label: 'Cloudflare Pages' }],
  },
  {
    name: 'Gateway',
    color: 'border-accent/40 text-accent',
    nodes: [{ label: 'BFF · Fly.io', pulse: true }],
  },
  {
    name: 'Services',
    color: 'border-purple-500/40 text-purple-300',
    nodes: [
      { label: 'Catalog' },
      { label: 'Payments' },
      { label: 'Orders' },
      { label: 'Checkout' },
    ],
  },
  {
    name: 'Infrastructure',
    color: 'border-emerald-500/40 text-emerald-300',
    nodes: [{ label: 'Postgres' }, { label: 'RabbitMQ' }, { label: 'Redis' }],
  },
];

function Arrow() {
  return (
    <div className="flex items-center justify-center px-1 shrink-0">
      <svg
        width="24"
        height="16"
        viewBox="0 0 24 16"
        fill="none"
        className="text-white/20"
      >
        <path
          d="M0 8h20M14 2l6 6-6 6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function ServiceNode({ label, pulse }: Node) {
  return (
    <div className="relative flex items-center justify-center">
      {pulse && (
        <motion.span
          className="absolute inset-0 rounded-md border border-accent/40"
          animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.15, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <span className="relative px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/10 font-mono text-[11px] text-white/70 whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}

export function ArchitecturePreview() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0d0f12] px-6 py-5 mt-6">
      <p className="font-mono text-[10px] uppercase tracking-widest text-white/25 mb-4">
        request flow
      </p>

      {/* Mobile: vertical stack */}
      <div className="flex flex-col gap-4 md:hidden">
        {TIERS.map((tier, i) => (
          <div key={tier.name}>
            <p className={`font-mono text-[10px] uppercase tracking-widest mb-2 ${tier.color.split(' ')[1]}`}>
              {tier.name}
            </p>
            <div className="flex flex-wrap gap-2">
              {tier.nodes.map((n) => (
                <ServiceNode key={n.label} {...n} />
              ))}
            </div>
            {i < TIERS.length - 1 && (
              <div className="mt-3 flex justify-start">
                <svg width="16" height="24" viewBox="0 0 16 24" fill="none" className="text-white/20">
                  <path d="M8 0v20M2 14l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: horizontal flow */}
      <div className="hidden md:flex items-start gap-0">
        {TIERS.map((tier, i) => (
          <div key={tier.name} className="flex items-center gap-0">
            <div className="flex flex-col items-center gap-2">
              <p className={`font-mono text-[10px] uppercase tracking-widest mb-1 ${tier.color.split(' ')[1]}`}>
                {tier.name}
              </p>
              <div className="flex flex-col gap-1.5">
                {tier.nodes.map((n) => (
                  <ServiceNode key={n.label} {...n} />
                ))}
              </div>
            </div>
            {i < TIERS.length - 1 && <Arrow />}
          </div>
        ))}
      </div>
    </div>
  );
}
