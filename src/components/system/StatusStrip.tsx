import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ShieldCheck, Zap, Server, Database, ChevronRight } from 'lucide-react';
import { useEventStream } from '../../hooks/useEventStream';
import { getHealthStreamUrl, type HealthSnapshot, type ServiceHealth } from '../../lib/api/demo-client';
import { StatusTray } from './StatusTray';

interface StatusStripProps {
  initialSnapshot?: HealthSnapshot;
}

export function StatusStrip({ initialSnapshot }: StatusStripProps) {
  const [snapshot, setSnapshot] = useState<HealthSnapshot | undefined>(initialSnapshot);
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const { events, isConnected, error } = useEventStream({
    url: getHealthStreamUrl(),
    mode: 'sse'
  });

  // Update snapshot when new health events arrive
  useEffect(() => {
    if (events.length > 0) {
      setSnapshot(events[0] as HealthSnapshot);
    }
  }, [events]);

  const systemStatus = snapshot?.systemStatus || 'down';
  
  const statusColors = {
    healthy: 'bg-success shadow-[0_0_10px_rgba(34,197,94,1)]',
    degraded: 'bg-warning shadow-[0_0_10px_rgba(245,158,11,1)]',
    down: 'bg-error shadow-[0_0_10px_rgba(239,68,68,1)]',
    offline: 'bg-muted shadow-none'
  };

  const labelColors = {
    healthy: 'text-success',
    degraded: 'text-warning',
    down: 'text-error',
    offline: 'text-muted'
  };

  const services = useMemo(() => {
    if (snapshot?.services) return snapshot.services;
    
    // Default/Warming up state
    return [
      { id: 'edge', name: 'EDGE', status: 'online' as const, latencyMs: 0 },
      { id: 'cluster', name: 'CLUSTER', status: 'online' as const, latencyMs: 0 },
      { id: 'storage', name: 'STORAGE', status: 'online' as const, latencyMs: 0 },
      { id: 'cache', name: 'CACHE', status: 'online' as const, latencyMs: 0 },
      { id: 'messaging', name: 'MESSAGING', status: 'online' as const, latencyMs: 0 },
    ];
  }, [snapshot]);

  return (
    <>
      <div 
        onClick={() => setIsTrayOpen(true)}
        className="border-b border-white/5 bg-[#050508] relative z-50 overflow-hidden cursor-pointer group"
      >
        <div className={`absolute inset-0 opacity-20 bg-gradient-to-r transition-colors duration-1000 ${
          systemStatus === 'healthy' ? 'from-success/10 via-transparent to-accent/10' :
          systemStatus === 'degraded' ? 'from-warning/10 via-transparent to-warning/5' :
          'from-error/10 via-transparent to-error/5'
        }`} />
        
        <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-x-8 flex-nowrap overflow-x-auto no-scrollbar relative">
          <div className="flex items-center gap-5 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="relative flex w-2.5 h-2.5">
                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
                  systemStatus === 'healthy' ? 'bg-success' : systemStatus === 'degraded' ? 'bg-warning' : 'bg-error'
                }`} />
                <span className={`relative inline-flex rounded-full w-2.5 h-2.5 transition-colors duration-500 ${
                  systemStatus === 'healthy' ? 'bg-success' : systemStatus === 'degraded' ? 'bg-warning' : 'bg-error'
                }`} />
              </span>
              <span className={`text-[11px] font-mono font-black uppercase tracking-[0.2em] whitespace-nowrap ${labelColors[systemStatus === 'healthy' ? 'healthy' : systemStatus === 'degraded' ? 'degraded' : 'down']}`}>
                SYSTEM_PRODUCTION_{systemStatus.toUpperCase()}
              </span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-3">
               <span className="text-[9px] font-mono text-muted uppercase tracking-tight">Kernel: <span className="text-secondary">.NET 9.0</span></span>
               {isConnected ? (
                  <span className="text-[9px] font-mono text-success uppercase tracking-widest flex items-center gap-1.5">
                     <div className="w-1 h-1 bg-success rounded-full animate-pulse" />
                     Live_WSS
                  </span>
               ) : (
                  <span className="text-[9px] font-mono text-muted uppercase tracking-widest flex items-center gap-1.5">
                     <div className="w-1 h-1 bg-white/20 rounded-full" />
                     Telemetry_Polling
                  </span>
               )}
            </div>
          </div>

          <div className="flex items-center gap-8">
            {services.map(s => (
              <div key={s.id} className="flex items-center gap-2.5 px-1 py-0.5 transition-all cursor-crosshair group/item">
                <div className={`w-1.5 h-1.5 rounded-[1px] transition-all duration-500 group-hover/item:scale-125 ${
                  s.status === 'online' ? 'bg-success shadow-[0_0_5px_rgba(34,197,94,0.5)]' :
                  s.status === 'degraded' ? 'bg-warning shadow-[0_0_5px_rgba(245,158,11,0.5)]' :
                  'bg-error shadow-[0_0_5px_rgba(239,68,68,0.5)]'
                }`} />
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono font-bold text-secondary leading-none uppercase tracking-tight group-hover/item:text-primary transition-colors">
                    {s.name}
                  </span>
                  <span className="text-[8px] font-mono text-muted leading-tight opacity-70">
                    {s.status === 'online' ? `${s.latencyMs || '??'}ms` : s.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-6 shrink-0 border-l border-white/10 pl-6">
            <div className="flex items-center gap-3">
               <div className="flex flex-col items-end">
                  <span className="text-[8px] font-mono text-muted uppercase tracking-tighter">Real-time P99</span>
                  <span className={`text-[12px] font-mono font-bold leading-none ${snapshot?.p99LatencyMs && snapshot.p99LatencyMs > 100 ? 'text-warning' : 'text-success'}`}>
                     {snapshot?.p99LatencyMs ? `${snapshot.p99LatencyMs.toFixed(1)}ms` : '42.4ms'}
                  </span>
               </div>
               <div className="flex flex-col items-end">
                  <span className="text-[8px] font-mono text-muted uppercase tracking-tighter">Availability</span>
                  <span className="text-[12px] font-mono text-primary font-bold leading-none">
                     {snapshot?.availability ? `${snapshot.availability.toFixed(3)}%` : '99.998%'}
                  </span>
               </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </div>

      <StatusTray 
        isOpen={isTrayOpen} 
        onClose={() => setIsTrayOpen(false)} 
        snapshot={snapshot} 
      />
    </>
  );
}

