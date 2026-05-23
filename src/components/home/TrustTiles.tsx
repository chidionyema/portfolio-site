import { motion } from 'framer-motion';
import { Server, Shield, FlaskConical, Activity } from 'lucide-react';
import { Glass } from '../ui/Glass';

const tiles = [
  {
    icon: Server,
    value: '8',
    label: 'Microservices',
    detail: 'Deployed and running on Fly.io',
    color: 'text-accent'
  },
  {
    icon: Shield,
    value: '159',
    label: 'Automated Rules',
    detail: 'Enforce architecture in every build',
    color: 'text-success'
  },
  {
    icon: FlaskConical,
    value: '13',
    label: 'Test Suites',
    detail: 'Unit, integration, contract, and E2E',
    color: 'text-warning'
  },
  {
    icon: Activity,
    value: '13',
    label: 'Interactive Demos',
    detail: 'Try them. they hit real services',
    color: 'text-primary'
  },
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
            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-muted mb-2">
              {tile.label}
            </div>
            <div className="text-[10px] text-secondary/50 leading-tight">
              {tile.detail}
            </div>
          </Glass>
        </motion.div>
      ))}
    </div>
  );
}
