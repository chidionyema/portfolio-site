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
      className="mb-10 space-y-4"
    >
      {/* High-leverage summary header for Recruiters/EMs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-subtle bg-accent/5 border-l-4 border-l-warning p-4 flex items-center gap-4">
          <AlertCircle className="w-5 h-5 text-warning shrink-0" />
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-warning/60 mb-1">The Problem</div>
            <div className="text-sm font-bold text-primary leading-tight">{copy.problemSummary}</div>
          </div>
        </div>
        <div className="glass-subtle bg-accent/5 border-l-4 border-l-accent-light p-4 flex items-center gap-4">
          <Cog className="w-5 h-5 text-accent-light shrink-0" />
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-accent-light/60 mb-1">The Solution</div>
            <div className="text-sm font-bold text-primary leading-tight">{copy.mechanismSummary}</div>
          </div>
        </div>
      </div>

      {/* Detailed technical cells */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
        <ContextCell
          icon={<AlertCircle className="w-3.5 h-3.5" />}
          label="Context"
          body={copy.problem}
          accentClass="text-warning/40"
        />
        <ContextCell
          icon={<Cog className="w-3.5 h-3.5" />}
          label="Mechanism"
          body={copy.mechanism}
          accentClass="text-accent-light/40"
        />
        <div className="relative group">
          <ContextCell
            icon={<Eye className="w-3.5 h-3.5" />}
            label="What to watch"
            body={copy.watch}
            accentClass="text-success/40"
          />
          <div className="absolute top-4 right-4 bg-white/5 border border-white/10 px-2 py-1 rounded text-[8px] font-black text-accent-light uppercase tracking-widest group-hover:bg-accent group-hover:text-white transition-all">
            {copy.strategy}
          </div>
        </div>
      </div>
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
