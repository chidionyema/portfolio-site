import { motion } from 'framer-motion';
import { Server, Shield, FlaskConical, Activity } from 'lucide-react';
import { Glass } from '../ui/Glass';

const tiles = [
  { icon: Server, value: '16', label: 'Microservices', color: 'text-accent' },
  { icon: Shield, value: '159', label: 'Architecture Guards', color: 'text-success' },
  { icon: FlaskConical, value: '13', label: 'CI Test Suites', color: 'text-warning' },
  { icon: Activity, value: '50', label: 'Roslyn Analyzers', color: 'text-primary' },
];

export function TrustTiles() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {tiles.map((tile, i) => (
        <motion.div
          key={tile.label}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
        >
          <Glass intensity="low" className="p-6 text-center border-none">
            <tile.icon className={`w-5 h-5 mx-auto mb-3 ${tile.color}`} />
            <div className="text-3xl font-black tabular-nums text-primary mb-1 font-mono">
              {tile.value}
            </div>
            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-muted">
              {tile.label}
            </div>
          </Glass>
        </motion.div>
      ))}
    </div>
  );
}
