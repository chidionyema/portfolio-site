import { motion } from 'framer-motion';
import { Shield, Zap, Search, Eye } from 'lucide-react';

interface Score {
  label: string;
  score: number;
  icon: any;
  color: string;
}

const SCORES: Score[] = [
  { label: 'Performance',   score: 98,  icon: Zap,    color: 'text-success' },
  { label: 'Accessibility', score: 100, icon: Eye,    color: 'text-success' },
  { label: 'Best Practices', score: 100, icon: Shield, color: 'text-success' },
  { label: 'SEO',           score: 100, icon: Search, color: 'text-success' },
];

export function Scorecard() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {SCORES.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          viewport={{ once: true }}
          className="surface p-6 flex flex-col items-center text-center space-y-4 group hover:border-accent/30 transition-all"
        >
          <div className={`p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:border-accent/20 transition-colors ${s.color}`}>
            <s.icon className="w-6 h-6" />
          </div>
          
          <div className="space-y-1">
            <div className="text-[24px] font-mono font-black text-primary leading-none">
              {s.score}
            </div>
            <div className="text-[9px] font-mono text-muted uppercase tracking-[0.2em]">
              {s.label}
            </div>
          </div>

          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className={`h-full ${s.score >= 90 ? 'bg-success' : 'bg-warning'}`}
              initial={{ width: 0 }}
              whileInView={{ width: `${s.score}%` }}
              transition={{ duration: 1, delay: i * 0.1 + 0.5 }}
              viewport={{ once: true }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
