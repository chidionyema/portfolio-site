import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Activity, Zap, ShieldAlert, ShieldCheck, ShieldOff, Send, Flame, RotateCw } from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Heading } from '../ui/Heading';
import { Stack } from '../ui/Stack';
import { Pill } from '../ui/Pill';
import { Glass } from '../ui/Glass';
import { cn } from '../../lib/utils';
import type { RequestMetadata } from '../../lib/api/demo-client';
import { RequestReceipt } from './RequestReceipt';

type CircuitState = 'Closed' | 'Open' | 'HalfOpen';

interface RequestLog {
  id: string;
  timestamp: Date;
  status: 'ok' | 'failed' | 'rejected';
  durationMs: number;
  circuitState: CircuitState;
}

const STATE_CONFIG: Record<CircuitState, { color: string; bg: string; border: string; glow: string; icon: typeof ShieldCheck; label: string; desc: string }> = {
  Closed:   { color: 'text-success', bg: 'bg-success/10', border: 'border-success/40', glow: 'shadow-[0_0_20px_rgba(34,197,94,0.3)]', icon: ShieldCheck, label: 'Closed', desc: 'All traffic flows normally' },
  Open:     { color: 'text-error',   bg: 'bg-error/10',   border: 'border-error/40',   glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]', icon: ShieldOff,   label: 'Open',   desc: 'Requests rejected instantly' },
  HalfOpen: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/40', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]', icon: ShieldAlert, label: 'Half-Open', desc: 'Probing with single request' },
};

export function CircuitBreakerDemo() {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [circuitState, setCircuitState] = useState<CircuitState>('Closed');
  const [prevState, setPrevState] = useState<CircuitState | null>(null);
  const [metrics, setMetrics] = useState({ success: 0, failure: 0, rejected: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isFaultActive, setIsFaultActive] = useState(false);
  const [receipt, setReceipt] = useState<RequestMetadata | null>(null);
  const transitionTimer = useRef<ReturnType<typeof setTimeout>>();

  const { executeCommand, events, chaos } = useDemoSession('circuit-breaker');

  useEffect(() => {
    if (events.length > 0) {
      const last = events[0];
      if (last.circuitState) {
        const newState = last.circuitState as CircuitState;
        if (newState !== circuitState) {
          setPrevState(circuitState);
          setCircuitState(newState);
          clearTimeout(transitionTimer.current);
          transitionTimer.current = setTimeout(() => setPrevState(null), 1500);
        }
      }
    }
  }, [events]);

  const sendRequest = useCallback(async (shouldFail?: boolean) => {
    setIsLoading(true);
    const start = Date.now();
    try {
      const res = await executeCommand('/circuit/request', { shouldFail: shouldFail ?? isFaultActive });
      if (res?.traceId || res?.latencyMs) setReceipt(res as RequestMetadata);
      const duration = Date.now() - start;
      const isRejected = res?.isRejected || res?.rejected;
      const isOk = res?.success && !isRejected;

      const newState = (res?.circuitState as CircuitState) ?? circuitState;
      if (newState !== circuitState) {
        setPrevState(circuitState);
        setCircuitState(newState);
      }

      setMetrics(prev => ({
        success: prev.success + (isOk ? 1 : 0),
        failure: prev.failure + (!isOk && !isRejected ? 1 : 0),
        rejected: prev.rejected + (isRejected ? 1 : 0),
      }));

      const status = isOk ? 'ok' as const : isRejected ? 'rejected' as const : 'failed' as const;
      setLogs(prev => [{
        id: crypto.randomUUID(),
        timestamp: new Date(),
        status,
        durationMs: res?.responseTimeMs ?? duration,
        circuitState: newState,
      }, ...prev].slice(0, 20));
    } catch {
      setMetrics(prev => ({ ...prev, failure: prev.failure + 1 }));
      setLogs(prev => [{
        id: crypto.randomUUID(),
        timestamp: new Date(),
        status: 'failed' as const,
        durationMs: Date.now() - start,
        circuitState,
      }, ...prev].slice(0, 20));
    } finally {
      setIsLoading(false);
    }
  }, [executeCommand, circuitState, isFaultActive]);

  const toggleFault = useCallback(async () => {
    try {
      await executeCommand('/circuit/toggle-failure', { failureMode: !isFaultActive });
      setIsFaultActive(!isFaultActive);
    } catch { /* fire-and-forget: circuit state is reflected via polling, failure is non-fatal */ }
  }, [executeCommand, isFaultActive]);

  const resetCircuit = useCallback(async () => {
    try {
      await executeCommand('/circuit/reset', {});
      setCircuitState('Closed');
      setMetrics({ success: 0, failure: 0, rejected: 0 });
      setIsFaultActive(false);
    } catch { /* fire-and-forget: circuit state is reflected via polling, failure is non-fatal */ }
  }, [executeCommand]);

  const spikeTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => spikeTimers.current.forEach(clearTimeout), []);

  const fireSpike = useCallback(() => {
    spikeTimers.current.forEach(clearTimeout);
    spikeTimers.current = [];
    for (let i = 0; i < 5; i++) {
      spikeTimers.current.push(setTimeout(() => sendRequest(), i * 200));
    }
  }, [sendRequest]);

  const config = STATE_CONFIG[circuitState];
  const StateIcon = config.icon;
  const total = metrics.success + metrics.failure + metrics.rejected;

  return (
    <div className="space-y-8">
      {/* State Machine Visualization */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(['Closed', 'Open', 'HalfOpen'] as CircuitState[]).map((state) => {
          const cfg = STATE_CONFIG[state];
          const Icon = cfg.icon;
          const isActive = circuitState === state;
          const wasActive = prevState === state;

          return (
            <motion.div
              key={state}
              animate={isActive ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 0.4 }}
              className={cn(
                "relative p-5 rounded-xl border-2 transition-all duration-500 overflow-hidden",
                isActive ? `${cfg.bg} ${cfg.border} ${cfg.glow}` : 'bg-white/[0.02] border-white/5',
                wasActive && 'ring-2 ring-white/10'
              )}
            >
              {/* Animated transition arrow */}
              {isActive && prevState && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center"
                >
                  <Zap className="w-3 h-3 text-white" />
                </motion.div>
              )}

              <div className="flex items-center gap-3 mb-3">
                <Icon className={cn("w-5 h-5", isActive ? cfg.color : 'text-muted/40')} />
                <span className={cn(
                  "text-xs font-black uppercase tracking-widest",
                  isActive ? cfg.color : 'text-muted/40'
                )}>
                  {cfg.label}
                </span>
              </div>
              <p className={cn(
                "text-[10px] leading-relaxed",
                isActive ? 'text-secondary' : 'text-muted/30'
              )}>
                {cfg.desc}
              </p>

              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="circuit-indicator"
                  className={cn("absolute bottom-0 left-0 right-0 h-0.5", cfg.color.replace('text-', 'bg-'))}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Transition arrows between states */}
      <div className="hidden md:flex items-center justify-center gap-2 text-[9px] font-mono text-muted/50 uppercase tracking-widest -mt-4">
        <span>2 failures</span>
        <span className="text-error">→ open</span>
        <span className="mx-4">|</span>
        <span>6s cooldown</span>
        <span className="text-warning">→ half-open</span>
        <span className="mx-4">|</span>
        <span>probe succeeds</span>
        <span className="text-success">→ closed</span>
      </div>

      <div className="grid lg:grid-cols-[1fr_1fr] gap-8">
        {/* Left: Controls + Metrics */}
        <Stack gap={6}>
          <Card variant="panel-dark" padding="lg">
            <Stack gap={6} className="font-mono">
              {/* Fault injection toggle */}
              <div className={cn(
                "p-4 rounded-xl border flex items-center justify-between transition-all",
                isFaultActive ? "bg-error/10 border-error/30" : "bg-white/[0.02] border-white/5"
              )}>
                <div className="flex items-center gap-3">
                  <Flame className={cn("w-4 h-4", isFaultActive ? "text-error animate-pulse" : "text-muted")} />
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest">
                      {isFaultActive ? 'Fault active' : 'No fault'}
                    </div>
                    <div className="text-[9px] text-muted mt-0.5">
                      {isFaultActive ? 'catalog-svc returning 503s' : 'All upstreams healthy'}
                    </div>
                  </div>
                </div>
                <Button
                  variant={isFaultActive ? "primary" : "secondary"}
                  onClick={toggleFault}
                  className={cn(
                    "h-auto px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg",
                    isFaultActive ? "bg-error border-error" : "border-error/20 text-error hover:bg-error/10"
                  )}
                >
                  {isFaultActive ? 'Clear' : 'Inject'}
                </Button>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="primary"
                  onClick={() => sendRequest()}
                  disabled={isLoading}
                  className="w-full h-auto py-4 font-black text-[10px] uppercase tracking-widest rounded-xl flex flex-col items-center justify-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  Request
                </Button>
                <Button
                  variant="secondary"
                  onClick={fireSpike}
                  disabled={isLoading}
                  className="w-full h-auto py-4 font-black text-[10px] uppercase tracking-widest rounded-xl flex flex-col items-center justify-center gap-1.5 border-warning/30 text-warning hover:bg-warning/10"
                >
                  <Zap className="w-4 h-4" />
                  Spike 5x
                </Button>
                <Button
                  variant="secondary"
                  onClick={resetCircuit}
                  className="w-full h-auto py-4 font-black text-[10px] uppercase tracking-widest rounded-xl flex flex-col items-center justify-center gap-1.5"
                >
                  <RotateCw className="w-4 h-4" />
                  Reset
                </Button>
              </div>

              {/* Metric tiles */}
              <div className="grid grid-cols-3 gap-3">
                <MetricTile label="Success" value={metrics.success} color="text-success" total={total} />
                <MetricTile label="Failed" value={metrics.failure} color="text-error" total={total} />
                <MetricTile label="Rejected" value={metrics.rejected} color="text-warning" total={total} />
              </div>

              {/* Response time sparkline */}
              {logs.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[9px] font-black uppercase tracking-[0.3em] text-muted/60">
                    Response latency (last {Math.min(logs.length, 20)})
                  </div>
                  <div className="flex items-end gap-px h-12">
                    {(() => {
                      const reversed = [...logs].reverse();
                      const maxMs = Math.max(...reversed.map(l => l.durationMs), 1);
                      return reversed.map((log) => {
                      const height = Math.max(4, (log.durationMs / maxMs) * 100);
                      return (
                        <motion.div
                          key={log.id}
                          initial={{ height: 0 }}
                          animate={{ height: `${height}%` }}
                          className={cn(
                            "flex-1 rounded-t-sm min-w-[3px]",
                            log.status === 'ok' ? 'bg-success/60' :
                            log.status === 'rejected' ? 'bg-warning/60' :
                            'bg-error/60'
                          )}
                          title={`${log.durationMs}ms — ${log.status}`}
                        />
                      );
                    });
                    })()}
                  </div>
                  <div className="flex justify-between text-[8px] text-muted/60 font-mono">
                    <span>oldest</span>
                    <span>latest</span>
                  </div>
                </div>
              )}
              <RequestReceipt
                traceId={receipt?.traceId}
                latencyMs={receipt?.latencyMs}
                statusCode={receipt?.statusCode}
                service={receipt?.service}
              />
            </Stack>
          </Card>
        </Stack>

        {/* Right: Traffic Log */}
        <Stack gap={6}>
          <Heading variant="caption" className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-muted" />
            Traffic Log
          </Heading>

          <Card variant="panel-dark" padding="none" className="h-[540px] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto font-mono text-[11px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#0d0d12] border-b border-white/10 z-10 text-muted/90 uppercase text-[10px] font-black tracking-widest">
                  <tr>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Latency</th>
                    <th className="px-4 py-3 text-right">Circuit</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-24 text-center text-muted/80 italic uppercase tracking-[0.4em] font-black">
                          Send traffic to view results
                        </td>
                      </tr>
                    ) : (
                      logs.map((req) => (
                        <motion.tr
                          key={req.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="group border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-4 py-3">
                            {req.status === 'ok' ? (
                              <span className="text-success uppercase font-black tracking-wider flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                                200 OK
                              </span>
                            ) : req.status === 'rejected' ? (
                              <span className="text-warning uppercase font-black tracking-wider flex items-center gap-1.5">
                                <ShieldOff className="w-3 h-3" />
                                Rejected
                              </span>
                            ) : (
                              <span className="text-error uppercase font-black tracking-wider flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-error" />
                                503
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <span className={cn(
                              req.status === 'rejected' ? 'text-warning' : 'text-muted/90'
                            )}>
                              {req.durationMs}ms
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Pill
                              variant={req.circuitState === 'Closed' ? 'success' : req.circuitState === 'Open' ? 'error' : 'warning'}
                              className="text-[8px] px-1.5 py-0"
                            >
                              {req.circuitState}
                            </Pill>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-white/[0.02] border-t border-white/5 font-mono text-[9px] text-muted/60 uppercase tracking-widest text-center">
              Polly AsyncCircuitBreakerPolicy · 2 failures → open 6s · auto probe on half-open
            </div>
          </Card>
        </Stack>
      </div>
    </div>
  );
}

function MetricTile({ label, value, color, total }: { label: string; value: number; color: string; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 text-center">
      <div className={cn("text-2xl font-black tabular-nums", color)}>{value}</div>
      <div className="text-[9px] font-black uppercase tracking-widest text-muted mt-1">{label}</div>
      {total > 0 && (
        <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", color.replace('text-', 'bg-'))}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 100 }}
          />
        </div>
      )}
    </div>
  );
}
