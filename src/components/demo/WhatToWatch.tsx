import { motion, AnimatePresence } from 'framer-motion';
import { Eye } from 'lucide-react';
import { DEMO_CONTEXT } from '../../lib/demo-context';

interface WhatToWatchProps {
  demoId: string;
  className?: string;
}

export function WhatToWatch({ demoId, className = '' }: WhatToWatchProps) {
  const copy = DEMO_CONTEXT[demoId];
  if (!copy?.watch) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex items-start gap-3 px-4 py-3 rounded-lg bg-white/[0.02] border border-white/5 ${className}`}
    >
      <Eye className="w-4 h-4 text-secondary/50 shrink-0 mt-0.5" />
      <div>
        <p className="text-[10px] uppercase tracking-widest text-secondary/40 font-bold mb-1">What to watch</p>
        <p className="text-xs text-secondary/70 leading-relaxed">{copy.watch}</p>
      </div>
    </motion.div>
  );
}
