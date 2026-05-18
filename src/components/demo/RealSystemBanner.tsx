import { motion } from 'framer-motion';
import { Radio } from 'lucide-react';

interface Instance { service: string; instance?: string | null }
interface Metadata { bff?: { instance: string; region: string }; upstreams?: Instance[]; timestamp?: string }

export function RealSystemBanner({ metadata }: { metadata?: Metadata | null }) {
  if (!metadata?.bff) return null;

  const items = [
    { label: 'bff-web', id: metadata.bff.instance, region: metadata.bff.region },
    ...(metadata.upstreams?.filter(u => u.instance).map(u => ({ label: u.service, id: u.instance!, region: undefined })) ?? [])
  ];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="flex items-center gap-3 px-4 py-2 bg-black/60 border-l-2 border-success font-mono text-[9px] uppercase tracking-widest overflow-x-auto"
    >
      <div className="flex items-center gap-1.5 text-success shrink-0">
        <Radio className="w-3 h-3" />
        <span className="font-black">Live</span>
      </div>
      <div className="h-3 w-px bg-white/10" />
      {items.map((item, i) => (
        <span key={i} className="text-secondary/70 shrink-0 whitespace-nowrap">
          <span className="text-secondary/50">{item.label}</span>
          {' @ '}
          <span className="text-primary/80">{item.id?.slice(0, 8) ?? '—'}</span>
          {item.region && <span className="text-muted ml-1">({item.region})</span>}
        </span>
      ))}
    </motion.div>
  );
}
