import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getMetricsSnapshot, type LiveMetrics } from '../../lib/api/demo-client';

type Status = 'idle' | 'live' | 'offline';

interface LiveMetricsRowProps {
  initialMetrics?: LiveMetrics;
}

export function LiveMetricsRow({ initialMetrics }: LiveMetricsRowProps) {
  const [metrics, setMetrics] = useState<LiveMetrics | undefined>(initialMetrics);
  const [status, setStatus] = useState<Status>(initialMetrics ? 'live' : 'idle');

  useEffect(() => {
    let cancelled = false;
    const fetchMetrics = async () => {
      try {
        const data = await getMetricsSnapshot();
        if (cancelled) return;
        setMetrics(data);
        setStatus('live');
      } catch {
        if (cancelled) return;
        setStatus('offline');
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Use ?? so a legitimately-zero value (e.g. p99 of 0ms during a quiet window)
  // doesn't fall through to a placeholder. When metrics are absent we render
  // an honest em-dash instead of suggesting a measurement we don't have.
  const specs: Array<{ label: string; value: number | null; format: (v: number) => string }> = [
    {
      label: 'Ingress Events (24h)',
      value: metrics?.ingressEvents24h ?? null,
      format: (v) => Math.floor(v).toLocaleString(),
    },
    {
      label: 'Cluster Availability',
      value: metrics?.clusterAvailability ?? null,
      format: (v) => `${v.toFixed(3)}%`,
    },
    {
      label: 'P99 Latency',
      value: metrics?.p99LatencyMs ?? null,
      format: (v) => `${v.toFixed(1)}ms`,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-px bg-white/5 border border-white/5 max-w-md shadow-2xl overflow-hidden">
      {specs.map((s) => (
        <div key={s.label} className="bg-black/40 p-4 relative group">
          <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="text-[8px] font-black text-muted uppercase tracking-widest mb-1 relative z-10 flex items-center gap-1.5">
            {s.label.split(' ')[0]}
            <StatusDot status={status} />
          </div>
          <div className="text-lg font-mono text-primary font-bold tabular-nums relative z-10">
            {s.value === null ? (
              <span className="text-muted/60" aria-label={status === 'offline' ? 'metrics offline' : 'metrics loading'}>
                —
              </span>
            ) : (
              <AnimatedNumber value={s.value} format={s.format} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusDot({ status }: { status: Status }) {
  if (status === 'live') {
    return (
      <span
        className="inline-block w-1 h-1 rounded-full bg-success animate-pulse"
        aria-label="metrics live"
      />
    );
  }
  if (status === 'offline') {
    return (
      <span
        className="inline-block w-1 h-1 rounded-full bg-warning"
        aria-label="metrics offline"
      />
    );
  }
  return (
    <span
      className="inline-block w-1 h-1 rounded-full bg-white/20"
      aria-label="metrics loading"
    />
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
