/**
 * SagaSimulator — the §2/§3 mini-figure for the show-and-tell page.
 *
 * Pure client-side. No backend. Two modes:
 *   - "naive"  — DB tx and broker publish are separate. Broker death
 *                between them produces inconsistency: order saved,
 *                event lost.
 *   - "outbox" — DB tx writes the outbox row in the same transaction.
 *                Broker death just means the outbox row sits there
 *                until the broker comes back. State is consistent
 *                throughout.
 *
 * Used inline in the show-and-tell homepage at the §2 (naive) and §3
 * (outbox) story beats. The same component renders both via the mode
 * toggle. Visitor presses Run, optionally presses Kill broker mid-flight,
 * watches the outcome.
 *
 * Doesn't pretend to be the real platform — it's an illustrative figure,
 * a sketch on a napkin made interactive. The real saga lives one section
 * down (§4 saga storm) and runs against the actual cluster.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Skull, RotateCcw, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

type Mode = 'naive' | 'outbox';
type Phase =
  | 'idle'
  | 'tx-running'      // DB transaction in progress
  | 'tx-committed'    // DB transaction committed
  | 'publishing'      // Trying to publish to broker
  | 'published'       // Successfully published
  | 'broker-down'     // Publish attempted with broker down
  | 'queued'          // (outbox only) Sitting in outbox waiting for broker
  | 'flushing'        // (outbox only) Outbox draining to broker
  | 'consistent'      // Terminal: order saved, event published
  | 'inconsistent'    // Terminal: order saved, event LOST (naive only)
  | 'recovered';      // Terminal: order saved, event published via outbox after broker recovery

interface SimState {
  mode: Mode;
  phase: Phase;
  brokerUp: boolean;
  orderSaved: boolean;
  eventPublished: boolean;
  outboxQueue: number;
}

const initial = (mode: Mode): SimState => ({
  mode,
  phase: 'idle',
  brokerUp: true,
  orderSaved: false,
  eventPublished: false,
  outboxQueue: 0,
});

export function SagaSimulator() {
  const [state, setState] = useState<SimState>(initial('naive'));
  const stepTimer = useRef<number | null>(null);

  const clearTimer = () => {
    if (stepTimer.current !== null) {
      window.clearTimeout(stepTimer.current);
      stepTimer.current = null;
    }
  };

  useEffect(() => clearTimer, []);

  const setMode = (mode: Mode) => {
    clearTimer();
    setState(initial(mode));
  };

  const reset = () => {
    clearTimer();
    setState(initial(state.mode));
  };

  const run = () => {
    clearTimer();
    setState((s) => ({ ...initial(s.mode), brokerUp: s.brokerUp, phase: 'tx-running' }));

    // 1.0s — DB transaction commits.
    stepTimer.current = window.setTimeout(() => {
      setState((s) => {
        const inOutbox = s.mode === 'outbox';
        // In outbox mode the outbox row is written in the same tx,
        // so the queue depth ticks up as part of the commit.
        return {
          ...s,
          phase: 'tx-committed',
          orderSaved: true,
          outboxQueue: inOutbox ? s.outboxQueue + 1 : s.outboxQueue,
        };
      });

      // 0.6s later — try to publish.
      stepTimer.current = window.setTimeout(() => {
        setState((s) => {
          if (s.mode === 'naive') {
            // Naive: synchronous publish from the same code path.
            if (!s.brokerUp) {
              return {
                ...s,
                phase: 'inconsistent',
                eventPublished: false,
              };
            }
            return { ...s, phase: 'publishing' };
          }
          // Outbox: async publish via the BusOutboxDeliveryService.
          // If broker is up, the queue starts draining now.
          if (!s.brokerUp) {
            return { ...s, phase: 'queued' };
          }
          return { ...s, phase: 'flushing' };
        });

        stepTimer.current = window.setTimeout(() => {
          setState((s) => {
            if (s.phase === 'publishing' && s.brokerUp) {
              return { ...s, phase: 'consistent', eventPublished: true };
            }
            if (s.phase === 'flushing' && s.brokerUp) {
              return {
                ...s,
                phase: 'consistent',
                eventPublished: true,
                outboxQueue: Math.max(0, s.outboxQueue - 1),
              };
            }
            return s;
          });
        }, 600);
      }, 600);
    }, 1000);
  };

  const killBroker = () => {
    setState((s) => ({ ...s, brokerUp: false }));
  };

  const restoreBroker = () => {
    setState((s) => {
      const next = { ...s, brokerUp: true };
      // If the outbox is sitting on a queued message, kick it.
      if (s.mode === 'outbox' && s.phase === 'queued' && s.outboxQueue > 0) {
        next.phase = 'flushing';
        // Drain in 600ms.
        stepTimer.current = window.setTimeout(() => {
          setState((cur) => ({
            ...cur,
            phase: 'recovered',
            eventPublished: true,
            outboxQueue: Math.max(0, cur.outboxQueue - 1),
          }));
        }, 600);
      }
      return next;
    });
  };

  const isRunning = state.phase !== 'idle' &&
                    !['consistent', 'inconsistent', 'recovered'].includes(state.phase);
  const isTerminal = ['consistent', 'inconsistent', 'recovered'].includes(state.phase);

  return (
    <div className="surface p-8 shadow-2xl space-y-6 font-mono">
      {/* Mode toggle */}
      <div className="flex items-center gap-2 p-1 bg-black/40 border border-white/[0.06] rounded-xl">
        <button
          onClick={() => setMode('naive')}
          aria-pressed={state.mode === 'naive'}
          className={`focus-ring flex-1 py-2.5 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
            state.mode === 'naive'
              ? 'bg-error/20 text-error shadow-[0_0_20px_rgba(239,68,68,0.2)]'
              : 'text-muted hover:text-secondary hover:bg-white/5'
          }`}
        >
          Naive · publish-then-pray
        </button>
        <button
          onClick={() => setMode('outbox')}
          aria-pressed={state.mode === 'outbox'}
          className={`focus-ring flex-1 py-2.5 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
            state.mode === 'outbox'
              ? 'bg-success/20 text-success shadow-[0_0_20px_rgba(34,197,94,0.2)]'
              : 'text-muted hover:text-secondary hover:bg-white/5'
          }`}
        >
          Atomic · with outbox
        </button>
      </div>

      {/* Step boxes */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-4">
        <StepBox
          title="DB transaction"
          subtitle={state.mode === 'outbox'
            ? 'UPDATE order • INSERT outbox_message'
            : 'UPDATE order SET paid=true'}
          active={state.phase === 'tx-running'}
          done={['tx-committed', 'publishing', 'broker-down', 'queued', 'flushing', 'consistent', 'inconsistent', 'recovered'].includes(state.phase)}
        />
        <Arrow
          mode={state.mode}
          phase={state.phase}
          brokerUp={state.brokerUp}
        />
        <StepBox
          title="Broker publish"
          subtitle="PaymentCompleted → RabbitMQ"
          active={state.phase === 'publishing' || state.phase === 'flushing'}
          done={state.phase === 'consistent' || state.phase === 'recovered'}
          failed={state.phase === 'inconsistent'}
        />
      </div>

      {/* State indicators */}
      <div className="grid grid-cols-3 gap-3 text-[10px]">
        <StatePill
          label="Order saved"
          value={state.orderSaved ? '1' : '0'}
          tone={state.orderSaved ? 'success' : 'muted'}
        />
        <StatePill
          label="Event published"
          value={state.eventPublished ? '1' : '0'}
          tone={state.eventPublished ? 'success' : (isTerminal && !state.eventPublished ? 'error' : 'muted')}
        />
        <StatePill
          label={state.mode === 'outbox' ? 'Outbox queue' : 'Broker'}
          value={state.mode === 'outbox' ? String(state.outboxQueue) : (state.brokerUp ? 'up' : 'down')}
          tone={
            state.mode === 'outbox'
              ? (state.outboxQueue > 0 ? 'warning' : 'muted')
              : (state.brokerUp ? 'muted' : 'error')
          }
        />
      </div>

      {/* Outcome banner */}
      <AnimatePresence>
        {isTerminal && (
          <OutcomeBanner phase={state.phase} mode={state.mode} />
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <button
          onClick={run}
          disabled={isRunning}
          className="focus-ring px-4 py-2.5 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-all disabled:opacity-30 flex items-center gap-2"
        >
          <Play className="w-3 h-3 fill-current" />
          Run
        </button>
        <button
          onClick={state.brokerUp ? killBroker : restoreBroker}
          disabled={!isRunning && state.phase === 'idle'}
          className={`focus-ring px-4 py-2.5 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-30 flex items-center gap-2 ${
            state.brokerUp
              ? 'bg-error/10 text-error border border-error/30 hover:bg-error/20'
              : 'bg-success/10 text-success border border-success/30 hover:bg-success/20'
          }`}
        >
          {state.brokerUp ? (
            <><Skull className="w-3 h-3" /> Kill broker</>
          ) : (
            <><RotateCcw className="w-3 h-3" /> Restore broker</>
          )}
        </button>
        <button
          onClick={reset}
          className="focus-ring px-3 py-2.5 text-muted hover:text-secondary text-[10px] uppercase tracking-widest font-bold transition-colors flex items-center gap-1.5"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* Caption */}
      <p className="text-[10px] text-muted/60 leading-relaxed font-sans italic max-w-2xl">
        {state.mode === 'naive'
          ? 'Naive: the DB transaction commits, then the publish is a separate operation. Kill the broker between the two and the event is lost — order saved, no notification, downstream services never hear.'
          : 'Outbox: the publish writes a row to the same database in the same transaction. The broker becomes a latency concern, not a correctness one. Kill the broker and the row waits; restore and it flushes.'}
      </p>
    </div>
  );
}

interface StepBoxProps {
  title: string;
  subtitle: string;
  active: boolean;
  done: boolean;
  failed?: boolean;
}

function StepBox({ title, subtitle, active, done, failed = false }: StepBoxProps) {
  const tone = failed
    ? 'border-error/40 bg-error/[0.04]'
    : done
    ? 'border-success/30 bg-success/[0.04]'
    : active
    ? 'border-accent/40 bg-accent/[0.05] shadow-[0_0_30px_rgba(99,102,241,0.15)]'
    : 'border-white/5 bg-white/[0.02]';
  return (
    <motion.div
      animate={{ scale: active ? 1.02 : 1 }}
      transition={{ duration: 0.2 }}
      className={`p-5 rounded-xl border transition-colors ${tone}`}
    >
      <div className="text-[11px] font-black uppercase tracking-[0.15em] text-primary mb-1.5">
        {title}
      </div>
      <div className="text-[10px] text-muted/70 leading-relaxed">
        {subtitle}
      </div>
    </motion.div>
  );
}

interface ArrowProps {
  mode: Mode;
  phase: Phase;
  brokerUp: boolean;
}

function Arrow({ mode, phase, brokerUp }: ArrowProps) {
  const showOutbox = mode === 'outbox';
  const inflight = phase === 'publishing' || phase === 'flushing';

  return (
    <div className="flex flex-col items-center justify-center min-w-[72px] gap-2">
      <div className="relative w-full h-px bg-white/10">
        <AnimatePresence>
          {inflight && (
            <motion.div
              initial={{ x: 0, opacity: 0 }}
              animate={{ x: '100%', opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-accent rounded-full shadow-[0_0_12px_rgba(99,102,241,0.6)]"
            />
          )}
        </AnimatePresence>
      </div>
      {showOutbox && (
        <div className="text-[8px] uppercase tracking-widest font-black text-warning/80 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          outbox
        </div>
      )}
      {!brokerUp && (
        <div className="text-[8px] uppercase tracking-widest font-black text-error/90 flex items-center gap-1">
          <Skull className="w-2.5 h-2.5" />
          broker down
        </div>
      )}
    </div>
  );
}

interface StatePillProps {
  label: string;
  value: string;
  tone: 'success' | 'error' | 'warning' | 'muted';
}

function StatePill({ label, value, tone }: StatePillProps) {
  const valueClass = {
    success: 'text-success',
    error: 'text-error',
    warning: 'text-warning',
    muted: 'text-muted',
  }[tone];
  return (
    <div className="bg-black/30 border border-white/[0.04] rounded-lg px-4 py-3">
      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-muted/60 mb-1">
        {label}
      </div>
      <div className={`text-2xl font-black tabular-nums tracking-tight ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}

interface OutcomeBannerProps {
  phase: Phase;
  mode: Mode;
}

function OutcomeBanner({ phase, mode }: OutcomeBannerProps) {
  const isFail = phase === 'inconsistent';
  const tone = isFail
    ? 'border-error/40 bg-error/[0.06] text-error'
    : 'border-success/40 bg-success/[0.06] text-success';
  const Icon = isFail ? AlertTriangle : CheckCircle2;
  const title = isFail
    ? 'Inconsistent state'
    : phase === 'recovered'
    ? 'Recovered'
    : 'Consistent state';
  const detail = isFail
    ? 'Order is saved as paid in the database, but no event reached the broker. Downstream services have no idea this order exists. The naive sequence cannot self-correct from here.'
    : phase === 'recovered'
    ? 'The outbox row sat through the broker outage. Once the broker came back, the BusOutboxDeliveryService flushed it. No publish was lost; no manual intervention needed.'
    : mode === 'outbox'
    ? 'Order saved and event published in the same logical transaction. The outbox row was written atomically with the state change and flushed asynchronously to the broker.'
    : 'Order saved and event published. The naive sequence works on the happy path; the failure mode is in the gap between the two operations.';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={`p-5 rounded-xl border ${tone} flex items-start gap-3`}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div>
        <div className="text-[11px] font-black uppercase tracking-[0.15em] mb-1.5">
          {title}
        </div>
        <div className="text-[11px] leading-relaxed font-sans opacity-90">
          {detail}
        </div>
      </div>
    </motion.div>
  );
}
