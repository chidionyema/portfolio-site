import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getMetricsSnapshot, type LiveMetrics } from '../../lib/api/demo-client';

interface LiveMetricsRowProps {
  initialMetrics?: LiveMetrics;
}

export function LiveMetricsRow({ initialMetrics }: LiveMetricsRowProps) {
  const [metrics, setMetrics] = useState<LiveMetrics | undefined>(initialMetrics);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await getMetricsSnapshot();
        setMetrics(data);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  const specs = [
    { 
      label: 'Ingress Events (24h)', 
      value: metrics?.ingressEvents24h || 18234, 
      format: (v: number) => Math.floor(v).toLocaleString() 
    },
    { 
      label: 'Cluster Availability', 
      value: metrics?.clusterAvailability || 99.998, 
      format: (v: number) => `${v.toFixed(3)}%` 
    },
    { 
      label: 'P99 Latency', 
      value: metrics?.p99LatencyMs || 42.4, 
      format: (v: number) => `${v.toFixed(1)}ms` 
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-px bg-white/5 border border-white/5 max-w-md shadow-2xl overflow-hidden">
      {specs.map((s) => (
        <div key={s.label} className="bg-black/40 p-4 relative group">
          <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="text-[8px] font-black text-muted uppercase tracking-widest mb-1 relative z-10">
            {s.label.split(' ')[0]}
          </div>
          <div className="text-lg font-mono text-primary font-bold tabular-nums relative z-10">
            <AnimatedNumber value={s.value} format={s.format} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AnimatedNumber({ value, format }: { value: number; format: (v: number) => string }) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const start = performance.now();
    const from = display;
    const duration = 800;
    
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4); // Quart ease out
      const next = from + (value - from) * eased;
      
      setDisplay(next);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);

  return <>{format(display)}</>;
}
