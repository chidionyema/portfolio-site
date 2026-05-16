import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useClusterState } from '../../hooks/useClusterState';
import type { HealthSnapshot } from '../../lib/api/demo-client';
import { StatusTray } from './StatusTray';

interface StatusStripProps {
  // Kept for backward compatibility with the Astro island prop —
  // the cluster store handles initial fetch on its own.
  initialSnapshot?: HealthSnapshot;
}

export function StatusStrip(_: StatusStripProps) {
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  // One source of truth: the shared cluster store. When chaos pauses
  // a target, `services[i].displayStatus` flips to 'offline' and
  // `systemStatus` flips to 'degraded' regardless of what the
  // underlying /health probe says — service-chaos is BFF-side fault
  // injection so the raw health endpoint lies.
  const { services, systemStatus, connectionState } = useClusterState();

  // Map systemStatus → token. Anything outside healthy/degraded reads as down.
  const statusKey: 'healthy' | 'degraded' | 'down' =
    systemStatus === 'healthy'
      ? 'healthy'
      : systemStatus === 'degraded'
        ? 'degraded'
        : 'down';

  const labelColors = {
    healthy: 'text-success',
    degraded: 'text-warning',
    down: 'text-error',
  } as const;

  // Topology pause shows up here without changing the snapshot itself.
  const isConnected = connectionState === 'connected';
  // Construct a snapshot-shaped payload for StatusTray (which still
  // expects a HealthSnapshot). The services use the chaos-aware
  // displayStatus so the tray agrees with the strip.
  const snapshot: HealthSnapshot = {
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.displayStatus,
      latencyMs: s.latencyMs,
      message: s.chaosPaused ? 'paused via topology' : s.message,
    })),
    systemStatus,
    p99LatencyMs: 0,
    availability: null,
    timestamp: new Date().toISOString(),
  };

  return (
    <>
      <button
        type="button"
        aria-label="Open cluster status details"
        onClick={() => setIsTrayOpen(true)}
        className="border-b border-white/5 bg-[#050508] relative z-50 overflow-hidden cursor-pointer group appearance-none w-full text-left"
      >
        <div className={`absolute inset-0 opacity-20 bg-gradient-to-r transition-colors duration-1000 ${
          systemStatus === 'healthy' ? 'from-success/10 via-transparent to-accent/10' :
          systemStatus === 'degraded' ? 'from-warning/10 via-transparent to-warning/5' :
          'from-error/10 via-transparent to-error/5'
        }`} />
        
        <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-x-8 flex-nowrap overflow-x-auto no-scrollbar relative">
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="relative flex w-2 h-2">
                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
                  statusKey === 'healthy' ? 'bg-success' : statusKey === 'degraded' ? 'bg-warning' : 'bg-error'
                }`} />
                <span className={`relative inline-flex rounded-full w-2 h-2 transition-colors duration-500 ${
                  statusKey === 'healthy' ? 'bg-success' : statusKey === 'degraded' ? 'bg-warning' : 'bg-error'
                }`} />
              </span>
              <span
                aria-live="polite"
                className={`text-[11px] font-mono font-black uppercase tracking-[0.2em] whitespace-nowrap ${labelColors[statusKey]}`}
              >
                {systemStatus === 'unknown' ? 'connecting…' : `cluster ${systemStatus}`}
              </span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <span className="text-[9px] font-mono text-muted uppercase tracking-widest flex items-center gap-1.5">
              <div className={`w-1 h-1 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-white/20'}`} />
              {isConnected ? 'live · push' : 'reconnecting'}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-6">
            {services.length === 0 && (
              <span className="text-[9px] font-mono text-muted/40 uppercase tracking-widest italic">
                waiting for snapshot…
              </span>
            )}
            {services.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 px-1 py-0.5 group/item"
                title={s.chaosPaused ? `${s.name} paused via topology` : s.message ?? `${s.name} ${s.displayStatus}`}
              >
                <div className={`w-1.5 h-1.5 rounded-[1px] transition-all duration-500 group-hover/item:scale-125 ${
                  s.displayStatus === 'online'
                    ? 'bg-success shadow-[0_0_5px_rgba(34,197,94,0.5)]'
                    : s.displayStatus === 'degraded'
                      ? 'bg-warning shadow-[0_0_5px_rgba(245,158,11,0.5)]'
                      : 'bg-error shadow-[0_0_5px_rgba(239,68,68,0.5)]'
                }`} />
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] font-mono font-bold text-secondary uppercase tracking-tight group-hover/item:text-primary transition-colors">
                    {s.name}
                  </span>
                  <span className={`text-[8px] font-mono leading-tight opacity-80 ${
                    s.chaosPaused ? 'text-error' : 'text-muted'
                  }`}>
                    {s.chaosPaused
                      ? 'paused'
                      : s.displayStatus === 'online'
                        ? `${s.latencyMs || '??'}ms`
                        : s.displayStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {/* Mobile: show service count instead of individual services */}
          <div className="sm:hidden flex items-center gap-2">
            {services.length > 0 && (
              <span className="text-[9px] font-mono text-secondary uppercase tracking-widest">
                {services.filter(s => s.displayStatus === 'online').length}/{services.length} services
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0 border-l border-white/10 pl-4 text-muted">
            <ChevronRight className="w-4 h-4 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </button>

      <StatusTray
        isOpen={isTrayOpen} 
        onClose={() => setIsTrayOpen(false)} 
        snapshot={snapshot} 
      />
    </>
  );
}

