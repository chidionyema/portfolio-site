import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Activity, Zap, Server, ShieldAlert, Cpu } from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Heading } from '../ui/Heading';
import { Stack } from '../ui/Stack';
import { Pill } from '../ui/Pill';
import { Glass } from '../ui/Glass';
import { cn } from '../../lib/utils';
import type { RequestMetadata } from '../../lib/api/demo-client';

interface RequestLog {
  id: string;
  timestamp: Date;
  status: 'ok' | 'failed' | 'circuit-open' | 'rejected';
  durationMs: number;
}

export function CircuitBreakerDemo() {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [circuitState, setCircuitState] = useState<'Closed' | 'Open' | 'HalfOpen'>('Closed');
  const [failureCount, setFailureCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [receipts, setReceipts] = useState<RequestMetadata[]>([]);

  const { executeCommand, events, chaos } = useDemoSession('circuit-breaker');

  // Monitor circuit state from events
  useEffect(() => {
    if (events.length > 0) {
      const lastEvent = events[0];
      if (lastEvent.circuitState) {
        setCircuitState(lastEvent.circuitState as any);
      }
    }
  }, [events]);

  const sendRequest = useCallback(async () => {
    setIsLoading(true);
    const start = Date.now();
    try {
      const res = await executeCommand('TestCircuitBreaker');
      const duration = Date.now() - start;
      
      setLogs(prev => [{
        id: crypto.randomUUID(),
        timestamp: new Date(),
        status: res?.success ? 'ok' : res?.rejected ? 'circuit-open' : 'failed',
        durationMs: duration
      }, ...prev].slice(0, 10));

      if (res?.success) {
        setFailureCount(0);
      } else if (!res?.rejected) {
        setFailureCount(prev => Math.min(prev + 1, 3));
      }

      if (res?.metadata) setReceipts(prev => [res.metadata, ...prev].slice(0, 5));
    } catch (e) {
      setLogs(prev => [{
        id: crypto.randomUUID(),
        timestamp: new Date(),
        status: 'failed',
        durationMs: Date.now() - start
      }, ...prev].slice(0, 10));
      setFailureCount(prev => Math.min(prev + 1, 3));
    } finally {
      setIsLoading(false);
    }
  }, [executeCommand]);

  const fireTrafficSpike = useCallback(() => {
    for(let i=0; i<5; i++) {
      setTimeout(sendRequest, i * 200);
    }
  }, [sendRequest]);

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <Stack gap={6}>
        <div className="flex items-center justify-between">
          <Heading variant="caption" className="flex items-center gap-2.5">
            <Network className="w-4 h-4 text-accent" />
            Circuit Breaker State
          </Heading>
        </div>

        <Card variant="panel-dark" padding="lg">
          <Stack gap={8} className="font-mono">
            <Stack gap={4}>
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted/60">
                <span>Polly Policy State</span>
                <Pill variant={circuitState === 'Closed' ? 'success' : circuitState === 'HalfOpen' ? 'warning' : 'error'}>
                  {circuitState}
                </Pill>
              </div>

              <div className={cn(
                "p-6 rounded-xl border relative overflow-hidden transition-colors flex items-center justify-between",
                circuitState === 'Closed' ? "bg-success/5 border-success/30" : 
                circuitState === 'Open' ? "bg-error/10 border-error/50" : 
                "bg-warning/10 border-warning/50"
              )}>
                <div className="space-y-1 z-10">
                  <div className="text-[10px] uppercase tracking-widest text-muted">Threshold</div>
                  <div className="text-xl font-black">3 Failures</div>
                </div>
                
                <div className="space-y-1 z-10 text-right">
                  <div className="text-[10px] uppercase tracking-widest text-muted">Current</div>
                  <div className={cn(
                    "text-xl font-black tabular-nums",
                    failureCount >= 3 ? "text-error" : failureCount > 0 ? "text-warning" : "text-success"
                  )}>
                    {failureCount} / 3
                  </div>
                </div>
              </div>

              {chaos.serviceFaulty && (
                <div className="p-3 rounded-lg bg-error/10 border border-error/20 flex items-start gap-3">
                  <ShieldAlert className="w-4 h-4 text-error shrink-0 mt-0.5" />
                  <p className="text-[10px] leading-relaxed text-error/80 uppercase tracking-widest">
                    Fault injected. Downstream service is returning 503s. 
                    The circuit breaker will open after 3 consecutive failures.
                  </p>
                </div>
              )}
            </Stack>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="primary"
                onClick={sendRequest}
                disabled={isLoading}
                className="w-full h-auto py-4 font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2"
              >
                Send Request
              </Button>
              <Button
                variant="secondary"
                onClick={fireTrafficSpike}
                disabled={isLoading}
                className="w-full h-auto py-4 font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 border-warning/30 text-warning hover:bg-warning/10"
              >
                Spike (5x)
              </Button>
            </div>
          </Stack>
        </Card>
      </Stack>

      <Stack gap={6}>
        <Heading variant="caption" className="flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-muted" />
          Traffic Log
        </Heading>

        <Card variant="panel-dark" padding="none" className="h-[440px] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto font-mono text-[11px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0d0d12] border-b border-white/10 z-10 text-muted/60 uppercase text-[10px] font-black tracking-widest">
                <tr>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Latency</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-24 text-center text-muted/20 italic uppercase tracking-[0.4em] font-black">
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
                        <td className="px-6 py-4">
                          {req.status === 'ok' ? (
                            <span className="text-success uppercase font-black tracking-wider">200 OK</span>
                          ) : req.status === 'circuit-open' ? (
                            <span className="text-warning uppercase font-black tracking-wider flex items-center gap-2">
                              <ShieldAlert className="w-3 h-3" />
                              Rejected (Circuit Open)
                            </span>
                          ) : (
                            <span className="text-error uppercase font-black tracking-wider flex items-center gap-2">
                              503 Service Unavailable
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums text-muted/60">
                          {req.durationMs}ms
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </Card>
      </Stack>
    </div>
  );
}
