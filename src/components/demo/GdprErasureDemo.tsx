import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Loader2, CheckCircle2, XCircle, AlertTriangle, Clock, ShieldOff } from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Heading } from '../ui/Heading';
import { Stack } from '../ui/Stack';
import { Pill } from '../ui/Pill';
import { cn } from '../../lib/utils';

type ErasureState = 'idle' | 'Processing' | 'Completed' | 'Failed' | 'Stalled';

interface ServiceNode {
  id: string;
  label: string;
  done: boolean;
  failed: boolean;
}

const STATE_CONFIG: Record<ErasureState, { icon: typeof CheckCircle2; color: string; bg: string; label: string; desc: string }> = {
  idle:       { icon: ShieldOff,     color: 'text-muted',   bg: 'bg-white/5',    label: 'Idle',       desc: 'No active request' },
  Processing: { icon: Clock,         color: 'text-warning', bg: 'bg-warning/10', label: 'Processing', desc: 'Scrubbing services…' },
  Completed:  { icon: CheckCircle2,  color: 'text-success', bg: 'bg-success/10', label: 'Completed',  desc: 'All data erased' },
  Failed:     { icon: XCircle,       color: 'text-error',   bg: 'bg-error/10',   label: 'Failed',     desc: 'Partial failure — ops review' },
  Stalled:    { icon: AlertTriangle, color: 'text-error',   bg: 'bg-error/10',   label: 'Stalled',    desc: 'SLA breach — 7-day limit exceeded' },
};

const SERVICES: Array<{ id: string; label: string }> = [
  { id: 'orders',   label: 'Orders' },
  { id: 'payments', label: 'Payments' },
  { id: 'identity', label: 'Identity' },
  { id: 'audit',    label: 'Audit' },
  { id: 'confirmed',label: 'Confirmed' },
];

const ERASURE_FLOW: ErasureState[] = ['Processing', 'Completed'];

export function GdprErasureDemo() {
  const [currentState, setCurrentState] = useState<ErasureState>('idle');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [serviceNodes, setServiceNodes] = useState<ServiceNode[]>(
    SERVICES.map(s => ({ id: s.id, label: s.label, done: false, failed: false }))
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [log, setLog] = useState<Array<{ id: string; text: string; ts: Date }>>([]);
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const stepRef = useRef(0);

  const { executeCommand } = useDemoSession('erasure');

  const appendLog = useCallback((text: string) => {
    setLog(prev => [{ id: crypto.randomUUID(), text, ts: new Date() }, ...prev].slice(0, 20));
  }, []);

  // Advance service nodes incrementally when processing (local simulation)
  useEffect(() => {
    if (currentState !== 'Processing') return;
    stepRef.current = 0;

    const advance = setInterval(() => {
      const idx = stepRef.current;
      if (idx >= SERVICES.length) {
        clearInterval(advance);
        setCurrentState('Completed');
        appendLog('All services confirmed erasure');
        setIsProcessing(false);
        return;
      }
      setServiceNodes(prev => prev.map((n, i) => i === idx ? { ...n, done: true } : n));
      appendLog(`${SERVICES[idx].label}: data erased`);
      stepRef.current += 1;
    }, 700);

    return () => clearInterval(advance);
  }, [currentState, appendLog]);

  // Poll backend when we have a real requestId
  useEffect(() => {
    if (!requestId || currentState === 'Completed' || currentState === 'Failed' || currentState === 'Stalled') {
      clearInterval(pollRef.current);
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const res = await executeCommand(`/erasure/${requestId}`, {}, { method: 'GET' }) as {
          state?: string;
          completedServices?: string[];
          failedServices?: string[];
        } | null;

        if (res?.state && res.state !== currentState) {
          const newState = res.state as ErasureState;
          setCurrentState(newState);

          if (res.completedServices) {
            setServiceNodes(prev => prev.map(n => ({
              ...n,
              done: res.completedServices!.includes(n.id),
              failed: res.failedServices?.includes(n.id) ?? false,
            })));
          }

          if (newState === 'Completed' || newState === 'Failed' || newState === 'Stalled') {
            setIsProcessing(false);
            appendLog(`Erasure request ${newState.toLowerCase()}`);
          }
        }
      } catch { /* polling failure is non-fatal */ }
    }, 2000);

    return () => clearInterval(pollRef.current);
  }, [requestId, currentState, executeCommand, appendLog]);

  const startErasure = useCallback(async () => {
    setIsProcessing(true);
    setCurrentState('idle');
    setRequestId(null);
    setLog([]);
    setServiceNodes(SERVICES.map(s => ({ id: s.id, label: s.label, done: false, failed: false })));

    try {
      const res = await executeCommand('/erasure/start', {
        subjectId: crypto.randomUUID(),
        reason: 'Demo GDPR erasure request',
      }) as { requestId?: string } | null;

      if (res?.requestId) {
        setRequestId(res.requestId);
        appendLog(`Erasure request ${res.requestId.slice(0, 8)}… created`);
      }
      setCurrentState('Processing');
      appendLog('Saga started — scrubbing services in order');
    } catch {
      setCurrentState('Processing');
      appendLog('Saga started — scrubbing services in order');
    }
  }, [executeCommand, appendLog]);

  const isTerminal = currentState === 'Completed' || currentState === 'Failed' || currentState === 'Stalled';

  return (
    <div className="space-y-8">
      {/* State timeline */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {(['Processing', 'Completed', 'Failed', 'Stalled'] as ErasureState[]).map((state) => {
          const cfg = STATE_CONFIG[state];
          const Icon = cfg.icon;
          const isActive = currentState === state;
          const flowIdx = ERASURE_FLOW.indexOf(currentState);
          const stateFlowIdx = ERASURE_FLOW.indexOf(state);
          const isDone = flowIdx > stateFlowIdx && stateFlowIdx >= 0;

          return (
            <motion.div
              key={state}
              animate={isActive ? { scale: [1, 1.03, 1] } : {}}
              transition={{ duration: 0.5 }}
              className={cn(
                "relative p-4 rounded-xl border-2 transition-all duration-500 text-center",
                isActive ? `${cfg.bg} border-current ${cfg.color}` :
                isDone ? 'bg-success/5 border-success/30 text-success' :
                'bg-white/[0.02] border-white/5 text-muted/30'
              )}
            >
              <Icon className={cn("w-5 h-5 mx-auto mb-2", isActive ? cfg.color : isDone ? 'text-success' : 'text-muted/30')} />
              <div className="text-[9px] font-black uppercase tracking-widest">{cfg.label}</div>
              <div className={cn("text-[8px] mt-1 leading-tight", isActive ? 'text-secondary' : 'text-muted/20')}>
                {cfg.desc}
              </div>
              {isActive && (
                <motion.div
                  layoutId="erasure-indicator"
                  className={cn("absolute bottom-0 left-0 right-0 h-0.5 rounded-b", cfg.color.replace('text-', 'bg-'))}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Service pipeline */}
      <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5">
        <div className="text-[9px] font-black uppercase tracking-widest text-muted/50 mb-4">Service erasure pipeline</div>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {serviceNodes.map((node, idx) => (
            <div key={node.id} className="flex items-center gap-1 shrink-0">
              <motion.div
                animate={node.done ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.3 }}
                className={cn(
                  "flex flex-col items-center px-3 py-2 rounded-lg border transition-all duration-500 min-w-[70px]",
                  node.failed ? 'bg-error/10 border-error/40 text-error' :
                  node.done ? 'bg-success/10 border-success/40 text-success' :
                  currentState === 'Processing' && !node.done ? 'bg-white/[0.02] border-white/10 text-muted/60 animate-pulse' :
                  'bg-white/[0.02] border-white/5 text-muted/30'
                )}
              >
                {node.done && !node.failed
                  ? <CheckCircle2 className="w-4 h-4 mb-1" />
                  : node.failed
                    ? <XCircle className="w-4 h-4 mb-1" />
                    : <div className="w-4 h-4 mb-1 rounded-full border-2 border-current opacity-40" />
                }
                <span className="text-[9px] font-black uppercase tracking-wider">{node.label}</span>
              </motion.div>
              {idx < serviceNodes.length - 1 && (
                <div className={cn(
                  "w-4 h-0.5 transition-colors duration-500",
                  serviceNodes[idx + 1].done ? 'bg-success/40' : 'bg-white/10'
                )} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Controls */}
        <Stack gap={6}>
          <Heading variant="caption" className="flex items-center gap-2.5">
            <Trash2 className="w-4 h-4 text-accent" />
            Erasure Controls
          </Heading>

          <Card variant="panel-dark" padding="lg">
            <Stack gap={6} className="font-mono">
              <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted">Subject</span>
                  <Pill variant={isTerminal ? (currentState === 'Completed' ? 'success' : 'error') : isProcessing ? 'warning' : 'status'}>
                    {currentState === 'idle' ? 'READY' : currentState}
                  </Pill>
                </div>
                <div className="text-secondary text-[11px]">Anonymous demo subject</div>
                <div className="mt-2 text-[9px] text-muted/60">SLA: 7 days · 5 services · GDPR Art. 17</div>
                {requestId && (
                  <div className="mt-3 pt-3 border-t border-white/5 text-[9px] text-muted/60 uppercase tracking-widest">
                    Request: {requestId.slice(0, 12)}…
                  </div>
                )}
              </div>

              <Button
                variant="primary"
                onClick={startErasure}
                disabled={isProcessing}
                className={cn(
                  "w-full h-auto py-5 font-black text-sm uppercase tracking-widest rounded-xl",
                  currentState === 'Completed' ? "bg-success border-success" :
                  currentState === 'Failed' || currentState === 'Stalled' ? "bg-error border-error" : ""
                )}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Erasing data…
                  </span>
                ) : currentState === 'Completed' ? (
                  '✓ Erased — run another'
                ) : currentState === 'Failed' || currentState === 'Stalled' ? (
                  '✕ Failed — run another'
                ) : (
                  'Request Erasure'
                )}
              </Button>

              <div className="p-4 rounded-xl bg-accent/5 border border-accent/10">
                <div className="text-[9px] font-black uppercase tracking-widest text-accent/60 mb-2">What happens</div>
                <ol className="text-[10px] text-secondary/70 leading-relaxed space-y-1 list-decimal list-inside">
                  <li>Saga created, SLA timer starts (7 days)</li>
                  <li>Each service receives erasure command in order</li>
                  <li>Service confirms deletion and saga advances</li>
                  <li>All 5 services confirmed → Completed</li>
                  <li>Any failure → Failed state for ops review</li>
                </ol>
              </div>
            </Stack>
          </Card>
        </Stack>

        {/* Right: Event log */}
        <Stack gap={6}>
          <Heading variant="caption" className="flex items-center gap-2.5">
            <ShieldOff className="w-4 h-4 text-muted" />
            Erasure Event Log
          </Heading>

          <Card variant="panel-dark" padding="none" className="h-[420px] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto font-mono text-[11px]">
              <AnimatePresence initial={false}>
                {log.length === 0 ? (
                  <div className="py-24 text-center text-muted/80 italic uppercase tracking-[0.4em] font-black">
                    Request an erasure to see the saga progress
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.02]">
                    {log.map((entry) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex-1 text-secondary/80">{entry.text}</div>
                        <div className="text-[9px] text-muted/60 tabular-nums shrink-0">
                          {entry.ts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>

            <div className="p-4 bg-white/[0.02] border-t border-white/5 font-mono text-[9px] text-muted/60 uppercase tracking-widest text-center">
              GDPR Art. 17 · 5-service saga · 7-day SLA · failure escalates to ops
            </div>
          </Card>
        </Stack>
      </div>
    </div>
  );
}
