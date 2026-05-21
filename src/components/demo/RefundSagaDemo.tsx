import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Undo2, Loader2, CheckCircle2, XCircle, AlertTriangle, Clock, Send, ShieldAlert } from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import { DemoIntro } from './DemoIntro';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Heading } from '../ui/Heading';
import { Stack } from '../ui/Stack';
import { Pill } from '../ui/Pill';
import { cn } from '../../lib/utils';

type SagaState = 'idle' | 'Requested' | 'AwaitingProviderConfirmation' | 'Refunded' | 'RequiresReview' | 'Cancelled';

interface StageEntry {
  id: string;
  state: SagaState;
  timestamp: Date;
  detail?: string;
}

const STATE_CONFIG: Record<SagaState, { icon: typeof CheckCircle2; color: string; bg: string; label: string; desc: string }> = {
  idle:                          { icon: Undo2,          color: 'text-muted',   bg: 'bg-white/5',     label: 'Idle',           desc: 'No active refund' },
  Requested:                     { icon: Send,           color: 'text-accent',  bg: 'bg-accent/10',   label: 'Requested',      desc: 'Saga created, awaiting provider initiation' },
  AwaitingProviderConfirmation:  { icon: Clock,          color: 'text-warning', bg: 'bg-warning/10',  label: 'Awaiting',       desc: 'Provider processing refund (24h timeout)' },
  Refunded:                      { icon: CheckCircle2,   color: 'text-success', bg: 'bg-success/10',  label: 'Refunded',       desc: 'Provider confirmed, funds returned' },
  RequiresReview:                { icon: AlertTriangle,  color: 'text-error',   bg: 'bg-error/10',    label: 'Review',         desc: 'Timed out or provider failed: requires review' },
  Cancelled:                     { icon: XCircle,        color: 'text-muted',   bg: 'bg-white/10',    label: 'Cancelled',      desc: 'Operator cancelled the refund' },
};

const SAGA_FLOW: SagaState[] = ['Requested', 'AwaitingProviderConfirmation', 'Refunded'];

export function RefundSagaDemo() {
  const [currentState, setCurrentState] = useState<SagaState>('idle');
  const [stages, setStages] = useState<StageEntry[]>([]);
  const [refundId, setRefundId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const { executeCommand } = useDemoSession('refund-saga');

  // Poll refund state when active
  useEffect(() => {
    if (!refundId || currentState === 'Refunded' || currentState === 'RequiresReview' || currentState === 'Cancelled') {
      clearInterval(pollRef.current);
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const res = await executeCommand(`/refund/${refundId}`, {}, { method: 'GET' });
        if (res?.currentState && res.currentState !== currentState) {
          const newState = res.currentState as SagaState;
          setCurrentState(newState);
          setStages(prev => [{
            id: crypto.randomUUID(),
            state: newState,
            timestamp: new Date(),
            detail: res.failureDetail ?? undefined,
          }, ...prev].slice(0, 20));

          if (newState === 'Refunded' || newState === 'RequiresReview' || newState === 'Cancelled') {
            setIsProcessing(false);
          }
        }
      } catch { /* polling failure is non-fatal */ }
    }, 1500);

    return () => clearInterval(pollRef.current);
  }, [refundId, currentState, executeCommand]);

  const startRefund = useCallback(async () => {
    setIsProcessing(true);
    setCurrentState('idle');
    setStages([]);
    setRefundId(null);

    try {
      const res = await executeCommand('/refund/start', {
        amountCents: 3999,
        refundAmountCents: 3999,
        currency: 'USD',
        reason: 'Demo refund — full amount',
      });

      if (res?.refundId) {
        setRefundId(res.refundId);
        setCurrentState('Requested');
        setStages([{
          id: crypto.randomUUID(),
          state: 'Requested',
          timestamp: new Date(),
          detail: `Refund ${res.refundId.slice(0, 8)}… created for payment ${res.paymentId?.slice(0, 8) ?? '?'}…`,
        }]);
      }
    } catch (err) {
      console.error('Failed to start refund demo', err);
      setIsProcessing(false);
    }
  }, [executeCommand]);

  const isTerminal = currentState === 'Refunded' || currentState === 'RequiresReview' || currentState === 'Cancelled';

  return (
    <div className="space-y-8">
      <DemoIntro demoId="refund" />
      {/* State Machine Timeline */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {(['Requested', 'AwaitingProviderConfirmation', 'Refunded', 'RequiresReview', 'Cancelled'] as SagaState[]).map((state) => {
          const cfg = STATE_CONFIG[state];
          const Icon = cfg.icon;
          const isActive = currentState === state;
          const flowIdx = SAGA_FLOW.indexOf(currentState);
          const stateFlowIdx = SAGA_FLOW.indexOf(state);
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
                  layoutId="refund-indicator"
                  className={cn("absolute bottom-0 left-0 right-0 h-0.5 rounded-b", cfg.color.replace('text-', 'bg-'))}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Controls */}
        <Stack gap={6}>
          <Heading variant="caption" className="flex items-center gap-2.5">
            <Undo2 className="w-4 h-4 text-accent" />
            Refund Controls
          </Heading>

          <Card variant="panel-dark" padding="lg">
            <Stack gap={6} className="font-mono">
              {/* Order summary */}
              <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted">Demo Order</span>
                  <Pill variant={isTerminal ? (currentState === 'Refunded' ? 'success' : 'error') : isProcessing ? 'warning' : 'status'}>
                    {currentState === 'idle' ? 'READY' : currentState}
                  </Pill>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-secondary">Demo Widget × 1</span>
                  <span className="text-xl font-black tabular-nums text-primary">$39.99</span>
                </div>
                {refundId && (
                  <div className="mt-3 pt-3 border-t border-white/5 text-[9px] text-muted/60 uppercase tracking-widest">
                    Refund: {refundId.slice(0, 12)}…
                  </div>
                )}
              </div>

              {/* Action */}
              <Button
                variant="primary"
                onClick={startRefund}
                disabled={isProcessing}
                className={cn(
                  "w-full h-auto py-5 font-black text-sm uppercase tracking-widest rounded-xl",
                  currentState === 'Refunded' ? "bg-success border-success" :
                  currentState === 'RequiresReview' ? "bg-error border-error" : ""
                )}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {currentState === 'AwaitingProviderConfirmation' ? 'Awaiting provider…' : 'Processing…'}
                  </span>
                ) : currentState === 'Refunded' ? (
                  '✓ Refund complete — run another'
                ) : currentState === 'RequiresReview' ? (
                  '✕ Requires review — run another'
                ) : (
                  'Request full refund'
                )}
              </Button>

              {/* Explanation */}
              <div className="p-4 rounded-xl bg-accent/5 border border-accent/10">
                <div className="text-[9px] font-black uppercase tracking-widest text-accent/60 mb-2">What happens</div>
                <ol className="text-[10px] text-secondary/70 leading-relaxed space-y-1 list-decimal list-inside">
                  <li>BffWeb seeds a completed payment in payments-svc</li>
                  <li>Creates a refund → RefundRequestedEvent published</li>
                  <li>RefundSaga initiates provider refund (Stripe)</li>
                  <li>Provider confirms → saga finalizes as Refunded</li>
                  <li>If provider fails or times out (24h) → RequiresReview</li>
                </ol>
              </div>
            </Stack>
          </Card>
        </Stack>

        {/* Right: Stage History */}
        <Stack gap={6}>
          <Heading variant="caption" className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-muted" />
            Saga Event Log
          </Heading>

          <Card variant="panel-dark" padding="none" className="h-[480px] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto font-mono text-[11px]">
              <AnimatePresence initial={false}>
                {stages.length === 0 ? (
                  <div className="py-24 text-center text-muted/80 italic uppercase tracking-[0.4em] font-black">
                    Request a refund to see the saga progress
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.02]">
                    {stages.map((entry) => {
                      const cfg = STATE_CONFIG[entry.state];
                      const Icon = cfg.icon;
                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
                        >
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", cfg.bg)}>
                            <Icon className={cn("w-4 h-4", cfg.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={cn("text-[10px] font-black uppercase tracking-widest", cfg.color)}>
                              {cfg.label}
                            </div>
                            {entry.detail && (
                              <div className="text-[9px] text-muted mt-0.5 truncate">{entry.detail}</div>
                            )}
                          </div>
                          <div className="text-[9px] text-muted/60 tabular-nums shrink-0">
                            {entry.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </AnimatePresence>
            </div>

            <div className="p-4 bg-white/[0.02] border-t border-white/5 font-mono text-[9px] text-muted/60 uppercase tracking-widest text-center">
              MassTransit StateMachine · 24h timeout → RequiresReview · compensation on every path
            </div>
          </Card>
        </Stack>
      </div>
    </div>
  );
}
