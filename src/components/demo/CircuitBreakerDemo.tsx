import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Zap, ShieldAlert, ShieldCheck, ShieldOff, Send, Flame, RotateCw } from 'lucide-react';
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
import { RealSystemBanner } from './RealSystemBanner';
import { WhatToWatch } from './WhatToWatch';

type CircuitState = 'Closed' | 'Open' | 'HalfOpen';

interface RequestLog {
  id: string;
  timestamp: Date;
  status: 'ok' | 'failed' | 'rejected';
  durationMs: number;
  circuitState?: CircuitState;
}

const STATE_CONFIG: Record<CircuitState, { color: string; bg: string; border: string; glow: string; icon: typeof ShieldCheck; label: string; desc: string }> = {
  Closed:   { color: 'text-success', bg: 'bg-success/10', border: 'border-success/40', glow: 'shadow-[0_0_20px_rgba(34,197,94,0.3)]', icon: ShieldCheck, label: 'Closed', desc: 'All traffic flows normally' },
  Open:     { color: 'text-error',   bg: 'bg-error/10',   border: 'border-error/40',   glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]', icon: ShieldOff,   label: 'Open',   desc: 'Requests rejected instantly' },
  HalfOpen: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/40', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]', icon: ShieldAlert, label: 'Half-Open', desc: 'Probing with single request' },
};

export function CircuitBreakerDemo() {
  const [withBreakerLogs, setWithBreakerLogs] = useState<RequestLog[]>([]);
  const [withoutBreakerLogs, setWithoutBreakerLogs] = useState<RequestLog[]>([]);
  const [circuitState, setCircuitState] = useState<CircuitState>('Closed');
  const [prevState, setPrevState] = useState<CircuitState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [receipt, setReceipt] = useState<RequestMetadata | null>(null);
  const transitionTimer = useRef<ReturnType<typeof setTimeout>>();

  const { executeCommand, events, metadata } = useDemoSession('circuit-breaker');

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

  const sendRequestWithBreaker = useCallback(async (shouldFail: boolean = true) => {
    const start = Date.now();
    try {
      const res = await executeCommand('/circuit/request', { shouldFail });
      const duration = Date.now() - start;
      const isRejected = res?.isRejected || res?.rejected;
      const isOk = res?.success && !isRejected;
      const status: 'ok' | 'failed' | 'rejected' = isOk ? 'ok' : isRejected ? 'rejected' : 'failed';

      setWithBreakerLogs(prev => [{
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        timestamp: new Date(),
        status,
        durationMs: res?.responseTimeMs ?? duration,
        circuitState: (res?.circuitState as CircuitState) ?? circuitState,
      }, ...prev].slice(0, 8));
      
      if (res?.traceId) setReceipt(res as RequestMetadata);
    } catch {
      setWithBreakerLogs(prev => [{
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        timestamp: new Date(),
        status: 'failed' as const,
        durationMs: Date.now() - start,
        circuitState,
      }, ...prev].slice(0, 8));
    }
  }, [executeCommand, circuitState]);

  const sendRequestWithoutBreaker = useCallback(async () => {
    const start = Date.now();
    try {
      // Simulate timeout cliff by explicitly setting shouldFail: true 
      // and letting it wait for the backend's simulated latency.
      const res = await executeCommand('/circuit/request', { shouldFail: true });
      const duration = Date.now() - start;
      setWithoutBreakerLogs(prev => [{
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        timestamp: new Date(),
        status: 'failed' as const,
        durationMs: res?.responseTimeMs ?? duration,
      }, ...prev].slice(0, 8));
    } catch {
      setWithoutBreakerLogs(prev => [{
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        timestamp: new Date(),
        status: 'failed' as const,
        durationMs: Date.now() - start,
      }, ...prev].slice(0, 8));
    }
  }, [executeCommand]);

  const fireHammer = useCallback(async () => {
    setIsLoading(true);
    
    // Clear logs for fresh run
    setWithBreakerLogs([]);
    setWithoutBreakerLogs([]);

    // Fire 6 parallel requests to both sides
    const requests = [];
    for (let i = 0; i < 6; i++) {
      requests.push(sendRequestWithBreaker(true));
      requests.push(sendRequestWithoutBreaker());
    }

    await Promise.all(requests);
    setIsLoading(false);
  }, [sendRequestWithBreaker, sendRequestWithoutBreaker]);

  const resetCircuit = useCallback(async () => {
    try {
      await executeCommand('/circuit/reset', {});
      setCircuitState('Closed');
      setWithBreakerLogs([]);
      setWithoutBreakerLogs([]);
    } catch {}
  }, [executeCommand]);


  const config = STATE_CONFIG[circuitState];
  const StateIcon = config.icon;

  return (
    <div className="space-y-8">
      <RealSystemBanner metadata={metadata} />
      <WhatToWatch demoId="circuit" />

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
                <Icon className={cn("w-5 h-5", isActive ? cfg.color : 'text-muted/40')} aria-hidden="true" />
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

      <div className="flex flex-col items-center gap-4">
        <Button
          variant="primary"
          onClick={fireHammer}
          disabled={isLoading}
          className="h-auto py-5 px-10 font-black text-xs uppercase tracking-[0.3em] rounded-2xl flex items-center justify-center gap-3 bg-error hover:bg-error/90 text-white shadow-[0_0_30px_rgba(239,68,68,0.3)] border-none group"
        >
          {isLoading ? (
            <RotateCw className="w-5 h-5 animate-spin" aria-hidden="true" />
          ) : (
            <Flame className="w-5 h-5 group-hover:scale-110 transition-transform" aria-hidden="true" />
          )}
          Trip & Hammer
        </Button>
        <button onClick={resetCircuit} className="text-[10px] font-mono text-muted hover:text-primary uppercase tracking-widest transition-colors">
          Reset Environment
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Without Breaker */}
        <Stack gap={4}>
           <div className="flex items-center justify-between">
              <Heading variant="caption" className="text-error">Without Breaker</Heading>
              <span className="text-[9px] font-mono text-muted uppercase">Sync Blocked</span>
           </div>
           <Card variant="panel-dark" padding="none" className="min-h-[400px] border-error/10">
              <div className="p-4 bg-error/5 border-b border-error/10 flex items-center gap-2">
                 <ShieldOff className="w-3.5 h-3.5 text-error" />
                 <span className="text-[10px] font-black uppercase text-error tracking-widest">Timeout Cliff</span>
              </div>
              <TrafficTable logs={withoutBreakerLogs} showCircuit={false} />
           </Card>
        </Stack>

        {/* With Breaker */}
        <Stack gap={4}>
           <div className="flex items-center justify-between">
              <Heading variant="caption" className="text-success">With Breaker</Heading>
              <span className="text-[9px] font-mono text-muted uppercase tracking-widest">Fail Fast</span>
           </div>
           <Card variant="panel-dark" padding="none" className="min-h-[400px] border-success/10">
              <div className="p-4 bg-success/5 border-b border-success/10 flex items-center gap-2">
                 <ShieldCheck className="w-3.5 h-3.5 text-success" />
                 <span className="text-[10px] font-black uppercase text-success tracking-widest">Resilience Policy</span>
              </div>
              <TrafficTable logs={withBreakerLogs} showCircuit={true} />
           </Card>
        </Stack>
      </div>

      <RequestReceipt
        traceId={receipt?.traceId}
        latencyMs={receipt?.latencyMs}
        statusCode={receipt?.statusCode}
        service={receipt?.service}
      />
    </div>
  );
}

function TrafficTable({ logs, showCircuit }: { logs: RequestLog[]; showCircuit: boolean }) {
  return (
    <div className="font-mono text-[11px] overflow-y-auto max-h-[400px]">
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 bg-[#0d0d12]/90 backdrop-blur border-b border-white/10 z-10 text-muted/90 uppercase text-[9px] font-black tracking-widest">
          <tr>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Latency</th>
            {showCircuit && <th className="px-4 py-3 text-right">Circuit</th>}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={showCircuit ? 3 : 2} className="py-24 text-center text-muted/40 italic uppercase tracking-[0.4em] font-black text-[10px]">
                  Idle
                </td>
              </tr>
            ) : (
              logs.map((req) => (
                <motion.tr
                  key={req.id}
                  initial={{ opacity: 0, x: -10 }}
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
                        503 ERR
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={cn(
                      req.status === 'rejected' ? 'text-warning' : req.durationMs > 2000 ? 'text-error font-black' : 'text-muted/90'
                    )}>
                      {req.durationMs}ms
                    </span>
                  </td>
                  {showCircuit && (
                    <td className="px-4 py-3 text-right">
                      <Pill
                        variant={req.circuitState === 'Closed' ? 'success' : req.circuitState === 'Open' ? 'error' : 'warning'}
                        className="text-[8px] px-1.5 py-0"
                      >
                        {req.circuitState}
                      </Pill>
                    </td>
                  )}
                </motion.tr>
              )
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}

