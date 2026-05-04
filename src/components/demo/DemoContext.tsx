import { motion } from 'framer-motion';
import { AlertCircle, Cog, Eye } from 'lucide-react';
import { DEMO_CONTEXT } from '../../lib/demo-context';

interface DemoContextProps {
  demoId: string;
}

export function DemoContext({ demoId }: DemoContextProps) {
  const copy = DEMO_CONTEXT[demoId];
  if (!copy) return null;

  return (
    <motion.section
      key={`${demoId}-context`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Why this pattern matters"
      className="mb-10 grid grid-cols-1 md:grid-cols-3 gap-3 font-mono"
    >
      <ContextCell
        icon={<AlertCircle className="w-3.5 h-3.5" />}
        label="Problem"
        body={copy.problem}
        accentClass="text-warning"
      />
      <ContextCell
        icon={<Cog className="w-3.5 h-3.5" />}
        label="Mechanism"
        body={copy.mechanism}
        accentClass="text-accent-light"
      />
      <ContextCell
        icon={<Eye className="w-3.5 h-3.5" />}
        label="What to watch"
        body={copy.watch}
        accentClass="text-success"
      />
    </motion.section>
  );
}

interface ContextCellProps {
  icon: React.ReactNode;
  label: string;
  body: string;
  accentClass: string;
}

function ContextCell({ icon, label, body, accentClass }: ContextCellProps) {
  return (
    <div className="surface bg-black/30 border border-white/5 p-5 space-y-3">
      <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] ${accentClass}`}>
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-secondary text-[12px] leading-relaxed font-sans">{body}</p>
    </div>
  );
}
