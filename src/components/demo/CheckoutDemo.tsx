import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Play,
  Activity,
  Database,
  RefreshCcw,
  Trophy,
  XCircle,
  Check,
} from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import { signalRClient } from '../../lib/api/signalr';
import type { SagaStepEvent } from '../../lib/api/signalr';
import { ChaosButton } from './ChaosButton';
import { RequestReceipt, RequestReceiptHistory } from './RequestReceipt';
import type { RequestMetadata } from '../../lib/api/demo-client';

import { CHECKOUT_COPY } from '../../lib/copy';

type Scenario = 'success' | 'stockFailure' | 'paymentFailure' | 'stockRace';

interface RaceLane {
  sagaId: string;
  orderId: string;
  label: string;
}

interface LaneState {
  sagaId: string;
  label: string;
  step: string;
  status: SagaStepEvent['status'] | null;
  events: SagaStepEvent[];
}

export function CheckoutDemo() {
  const [localEvents, setLocalEvents] = useState<SagaStepEvent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scenario, setScenario] = useState<Scenario>('success');
  const [sagaState, setSagaState] = useState<string>('Initial');
  const [activeSagaId, setActiveSagaId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [raceLanes, setRaceLanes] = useState<RaceLane[] | null>(null);
  const [receipts, setReceipts] = useState<RequestMetadata[]>([]);

  const { executeCommand, events: remoteEvents } = useDemoSession('checkout');

  // Single-saga state derivation
  useEffect(() => {
    if (raceLanes) return; // race mode handles its own derivation
    if (remoteEvents.length === 0) return;
    const last = remoteEvents[0] as SagaStepEvent;
    if (activeSagaId && last.sessionId !== activeSagaId) return;

    setLocalEvents((prev) => [last, ...prev]);
    setSagaState(last.step);

    const isCompleting =
      last.status === 'success' && (last.step === 'completed' || last.step === 'finalized' || last.step === 'payment_ready');
    const isFailing =
      last.status === 'failed' || last.step === 'stock_failed' || last.step === 'payment_failed';

    if (isCompleting || isFailing) setIsProcessing(false);
  }, [remoteEvents, activeSagaId, raceLanes]);

  // Race-mode derivation: bucket events into per-lane state
  const lanes = useMemo<LaneState[] | null>(() => {
    if (!raceLanes) return null;
    return raceLanes.map((lane) => {
      const laneEvents = (remoteEvents as SagaStepEvent[])
        .filter((e) => e.sessionId === lane.sagaId)
        .slice(0, 12);
      const last = laneEvents[0];
      return {
        sagaId: lane.sagaId,
        label: lane.label,
        step: last?.step ?? 'Pending',
        status: last?.status ?? null,
        events: [...laneEvents].reverse(),
      };
    });
  }, [raceLanes, remoteEvents]);

  // End the spinner once both lanes have a terminal step (race mode).
  useEffect(() => {
    if (!lanes) return;
    const allTerminal = lanes.every((l) =>
      ['completed', 'payment_ready', 'finalized', 'stock_failed', 'payment_failed', 'compensated'].includes(l.step),
    );
    if (allTerminal) setIsProcessing(false);
  }, [lanes]);

  const runSimulation = async () => {
    setIsProcessing(true);
    setLocalEvents([]);
    setSagaState('Initial');
    setActiveSagaId(null);
    setOrderId(null);
    setRaceLanes(null);

    try {
      const result = await executeCommand('/saga/start', {
        scenarioType: scenario,
        simulatedDelayMs: 500,
      });

      setReceipts(prev => [result, ...prev].slice(0, 10));

      if (result?.orderId) {
        setOrderId(result.orderId);
      }

      if (result?.races && Array.isArray(result.races)) {
        const lanes: RaceLane[] = result.races;
        setRaceLanes(lanes);
        // Subscribe to each lane's saga group so the SignalR events route to us.
        await Promise.all(lanes.map((l) => signalRClient.subscribe(l.sagaId).catch(() => {})));
      } else if (result?.sessionId) {
        setActiveSagaId(result.sessionId);
        await signalRClient.subscribe(result.sessionId).catch(() => {});
      }
    } catch {
      setIsProcessing(false);
    }
  };

  const resetSimulation = () => {
    setIsProcessing(false);
    setLocalEvents([]);
    setSagaState('Initial');
    setActiveSagaId(null);
    setOrderId(null);
    setRaceLanes(null);
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 1,
    });

  return (
    <div className="space-y-8 relative">
      <div className="grid lg:grid-cols-[45fr_55fr] gap-8 items-start">
        {/* Left Pane - Customer context */}
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em]">
            What happens to the customer's order if Stripe crashes mid-payment?
          </h3>
          <p className="text-xs text-muted leading-relaxed">
            Press <strong>Pay</strong>. Then press <strong>Crash payment service</strong> before the
            third stage lights up. Watch the customer's view on the left and
            the saga state machine on the right.
          </p>

          <div className="relative">
            <AnimatePresence mode="wait">
              {lanes ? (
                <RaceModeCustomerPane key="race" lanes={lanes} onReset={resetSimulation} isProcessing={isProcessing} />
              ) : sagaState === 'completed' || sagaState === 'finalized' ? (
                <ConfirmationCard key="receipt" orderId={orderId} onReset={resetSimulation} />
              ) : (
                <motion.div
                  key="cart"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="surface p-6 shadow-2xl space-y-8"
                >
                  {/* Scenario picker inside cart context */}
                  <div
                    role="radiogroup"
                    aria-label="Saga scenario"
                    className="grid grid-cols-2 gap-1 p-1 bg-black/40 border border-white/[0.06] rounded-xl"
                  >
                    {(Object.keys(CHECKOUT_COPY.SCENARIO_LABELS) as Scenario[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setScenario(s)}
                        disabled={isProcessing}
                        role="radio"
                        aria-checked={scenario === s}
                        className={`focus-ring py-2 px-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${
                          scenario === s
                            ? 'bg-white/10 text-white shadow-sm'
                            : 'text-muted hover:text-secondary hover:bg-white/5'
                        } disabled:opacity-30`}
                      >
                        {CHECKOUT_COPY.SCENARIO_LABELS[s]}
                      </button>
                    ))}
                  </div>

                  {/* Cart Item */}
                  <div className="flex gap-4">
                    <div className="w-[44px] h-[44px] bg-white/5 rounded flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-bold text-primary">Demo Widget</h4>
                        <span className="text-sm font-black tabular-nums">£39.99</span>
                      </div>
                      <p className="text-[10px] text-muted uppercase tracking-widest mt-1">Qty 1</p>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-white/5 pt-6">
                    <div className="flex justify-between text-[10px] text-muted uppercase tracking-widest">
                      <span>Subtotal</span>
                      <span className="tabular-nums">£39.99</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted uppercase tracking-widest">
                      <span>Tax</span>
                      <span className="tabular-nums">£0.00</span>
                    </div>
                    <div className="flex justify-between items-baseline pt-4">
                      <span className="text-xs font-bold text-primary uppercase tracking-widest">Total</span>
                      <span className="text-3xl font-black tabular-nums text-primary">£39.99</span>
                    </div>
                  </div>

                  <button
                    onClick={runSimulation}
                    disabled={isProcessing}
                    className={`w-full py-5 font-black text-sm uppercase rounded-xl transition-all shadow-xl disabled:opacity-20 flex items-center justify-center gap-3 ${getButtonTone(
                      sagaState,
                    )}`}
                  >
                    {getButtonContent(sagaState, isProcessing, orderId)}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <OutcomeBanner sagaState={sagaState} />
        </div>

        {/* Right Pane - Engineering context */}
        <div className="space-y-6">
          <h3 className="text-sm font-mono text-muted uppercase tracking-widest">
            {CHECKOUT_COPY.ENGINEERING_HEADER}
          </h3>

          {lanes ? (
            <div className="grid grid-cols-1 gap-6">
              {lanes.map((lane) => (
                <RaceLaneCard key={lane.sagaId} lane={lane} formatTime={formatTime} />
              ))}
            </div>
          ) : (
            <>
              <div className="surface p-8 shadow-2xl">
                <div className="mb-4">
                  <h4 className="text-[10px] font-mono text-muted uppercase tracking-[0.3em] mb-1">
                    Choreography · cross-service event flow
                  </h4>
                  <p className="text-[10px] text-muted/60 leading-relaxed">
                    Each row is one message — direct HTTP at the top,
                    RabbitMQ events between services after that. The saga
                    state machine in checkout-orchestrator drives all of
                    it; there is no central transaction.
                  </p>
                </div>
                <SagaSequenceView sagaState={sagaState} localEvents={localEvents} />
              </div>

              <CompensationDrawer sagaState={sagaState} localEvents={localEvents} />

              <div className="surface shadow-2xl h-[400px] flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between font-mono text-[10px]">
                  <span className="text-muted font-bold uppercase italic opacity-40">Bridge Events Log</span>
                </div>

                <div className="flex-1 overflow-y-auto font-mono text-[11px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#0d0d12] border-b border-white/10 z-10">
                      <tr className="text-muted/60 uppercase text-[10px] font-black tracking-widest">
                        <th className="px-6 py-3">Time</th>
                        <th className="px-6 py-3">Event</th>
                        <th className="px-6 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence initial={false}>
                        {localEvents.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-24 text-center text-muted/40 italic">
                              Awaiting saga initiation...
                            </td>
                          </tr>
                        ) : (
                          localEvents.map((e, i) => (
                            <motion.tr
                              key={`${e.sessionId}-${e.step}-${i}`}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors"
                            >
                              <td className="px-6 py-4 text-muted/50 text-[10px] whitespace-nowrap align-top">
                                [{formatTime(new Date(e.timestamp))}]
                              </td>
                              <td className="px-6 py-4 align-top">
                                <div className="text-secondary font-bold">{describeSagaStep(e.step)}</div>
                                <div className="text-[9px] text-muted/50 mt-0.5 font-mono uppercase tracking-widest">
                                  {e.step}
                                </div>
                                {e.description && (
                                  <div className="text-[10px] text-muted/70 mt-1.5 font-sans italic max-w-md leading-relaxed">
                                    {e.description}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right align-top">
                                <StatusBadge status={e.status} />
                              </td>
                            </motion.tr>
                          ))
                        )}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <h4 className="text-[10px] font-mono text-muted uppercase tracking-[0.3em] mb-4">Inject failure</h4>
                <ChaosButton scenario="inventory-kill" label="Kill Inventory Mid-Saga" durationSeconds={10} />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="pt-8 border-t border-white/5 font-mono text-[10px] text-muted/50 uppercase tracking-widest">
        Pattern: transactional outbox + saga compensation. Code: <code>src/CheckoutOrchestrator/Application/Sagas/CheckoutSaga.cs</code>.
        The hard part wasn't the saga; it was making the compensation event survive a broker outage.
      </div>

      <RequestReceiptHistory receipts={receipts} />
    </div>
  );
}

function getButtonContent(sagaState: string, isProcessing: boolean, orderId: string | null) {
  if (!isProcessing && sagaState === 'Initial') {
    return CHECKOUT_COPY.PAY_IDLE;
  }

  switch (sagaState) {
    case 'initiated':
      return (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          {CHECKOUT_COPY.PAY_RESERVING}
        </>
      );
    case 'stock_reserved':
      return (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          {CHECKOUT_COPY.PAY_CONFIRMING}
        </>
      );
    case 'payment_ready':
      return (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          {CHECKOUT_COPY.PAY_COMPLETING}
        </>
      );
    case 'completed':
    case 'finalized':
      return `✓ ${CHECKOUT_COPY.PAY_DONE_PREFIX} #${formatOrderId(orderId)} confirmed`;
    case 'stock_failed':
      return `✕ ${CHECKOUT_COPY.FAIL_SOLD_OUT}`;
    case 'payment_failed':
      return `✕ ${CHECKOUT_COPY.FAIL_CARD_DECLINED}`;
    case 'compensated':
      return `✕ Order abandoned`;
    default:
      return isProcessing ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Processing...
        </>
      ) : CHECKOUT_COPY.PAY_IDLE;
  }
}

function getButtonTone(sagaState: string) {
  if (sagaState === 'completed' || sagaState === 'finalized') return 'bg-success text-white';
  if (sagaState === 'stock_failed' || sagaState === 'payment_failed' || sagaState === 'compensated')
    return 'bg-error text-white';
  return 'bg-white text-black hover:bg-slate-100';
}

function ConfirmationCard({ orderId, onReset }: { orderId: string | null; onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="surface p-8 shadow-2xl text-center space-y-6 border border-success/20 bg-success/[0.02]"
    >
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
          <Check className="w-8 h-8 text-success" />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-black text-primary uppercase tracking-tight">{CHECKOUT_COPY.RECEIPT_HEADER}</h3>
        <p className="text-sm font-black tabular-nums text-success">#{formatOrderId(orderId)}</p>
      </div>

      <p className="text-sm text-muted leading-relaxed">{CHECKOUT_COPY.RECEIPT_EMAIL_LINE}</p>

      <div className="pt-4 space-y-6">
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          aria-disabled="true"
          title={CHECKOUT_COPY.RECEIPT_VIEW_TOOLTIP}
          className="block text-xs font-bold text-accent hover:underline decoration-accent/30 underline-offset-4 cursor-not-allowed"
        >
          {CHECKOUT_COPY.RECEIPT_VIEW_LINK}
        </a>

        <button
          onClick={onReset}
          className="text-[10px] font-black uppercase tracking-widest text-muted hover:text-primary transition-colors border-t border-white/5 pt-6 w-full"
        >
          {CHECKOUT_COPY.RUN_ANOTHER}
        </button>
      </div>
    </motion.div>
  );
}

function OutcomeBanner({ sagaState }: { sagaState: string }) {
  const isSuccess = sagaState === 'completed' || sagaState === 'finalized';
  const isFailure = sagaState === 'stock_failed' || sagaState === 'payment_failed' || sagaState === 'compensated';

  if (!isSuccess && !isFailure) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 border font-sans text-xs leading-relaxed shadow-xl ${
        isSuccess ? 'border-success/30 bg-success/5 text-primary' : 'border-error/30 bg-error/5 text-primary'
      }`}
    >
      {isSuccess ? (
        <>
          ✓ The customer's order is complete and stock is committed. <strong>Without this pattern</strong>, a failure in the final stage would leave you with inconsistent state between services.
        </>
      ) : (
        <>
          ✓ The customer's order rolled back, the stock was returned, and the customer wasn't double-charged. <strong>Without this pattern</strong>, your order is in <code>Paid</code> state in your DB but Stripe never confirmed — you find out from a refund ticket the next morning.
        </>
      )}
    </motion.div>
  );
}

function RaceModeCustomerPane({
  lanes,
  onReset,
  isProcessing,
}: {
  lanes: LaneState[];
  onReset: () => void;
  isProcessing: boolean;
}) {
  const allFinished = lanes.every((l) =>
    ['completed', 'payment_ready', 'finalized', 'stock_failed', 'payment_failed', 'compensated'].includes(l.step),
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-4"
    >
      {lanes.map((lane) => {
        const isWon = lane.step === 'completed' || lane.step === 'finalized' || lane.step === 'payment_ready';
        const isLost = lane.step === 'stock_failed' || lane.step === 'payment_failed' || lane.step === 'compensated';
        const tone = isWon ? 'border-success bg-success/5' : isLost ? 'border-error bg-error/5' : 'border-white/5';

        return (
          <div key={lane.sagaId} className={`surface p-4 border ${tone} transition-colors shadow-lg`}>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">{lane.label}</h4>
              <span className="text-[9px] font-mono text-muted/50">#{lane.sagaId.slice(0, 4)}</span>
            </div>

            <div className="flex justify-between items-center mb-4">
              <span className="text-xs text-primary">1 unit · £39.99</span>
              {lane.status && <StatusBadge status={lane.status} />}
            </div>

            <div
              className={`w-full py-2.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-2 ${
                isWon ? 'bg-success text-white' : isLost ? 'bg-error text-white' : 'bg-white/5 text-muted'
              }`}
            >
              {isWon ? (
                '✓ Confirmed'
              ) : isLost ? (
                '✕ Failed'
              ) : lane.step === 'Initial' || lane.step === 'Pending' ? (
                'Idle'
              ) : (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Processing…
                </>
              )}
            </div>
          </div>
        );
      })}

      {allFinished && !isProcessing && (
        <button
          onClick={onReset}
          className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-muted hover:text-primary transition-colors border border-dashed border-white/10 rounded-xl mt-2"
        >
          {CHECKOUT_COPY.RUN_ANOTHER}
        </button>
      )}
    </motion.div>
  );
}

function CompensationDrawer({ sagaState, localEvents }: { sagaState: string; localEvents: SagaStepEvent[] }) {
  const isAbandoned = sagaState === 'stock_failed' || sagaState === 'payment_failed' || sagaState === 'compensated';
  const compensationEvent = localEvents.find((e) => e.step === 'compensated');

  return (
    <AnimatePresence>
      {isAbandoned && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="space-y-4 pt-4">
            <h4 className="text-[10px] font-mono text-muted uppercase tracking-[0.3em]">
              {CHECKOUT_COPY.COMPENSATION_HEADER}
            </h4>
            <div className="surface p-6 border border-warning/30 bg-warning/5 space-y-4">
              <ul className="space-y-2 list-none">
                <li className="text-xs text-primary flex items-center gap-2">
                  <Check className="w-3 h-3 text-success" />
                  Stock release: ✓ 1 unit returned to inventory
                </li>
                <li className="text-xs text-primary flex items-center gap-2">
                  <Activity className="w-3 h-3 text-accent" />
                  Published{' '}
                  <span className="font-mono text-[10px] bg-white/5 px-1">StockReleaseRequestedEvent</span> to RabbitMQ
                </li>
              </ul>

              {compensationEvent?.traceId && (
                <div className="pt-2 border-t border-white/5">
                  <RequestReceipt
                    service={compensationEvent.service}
                    latencyMs={compensationEvent.latencyMs ?? 0}
                    statusCode={200}
                    traceId={compensationEvent.traceId}
                  />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface RaceLaneCardProps {
  lane: LaneState;
  formatTime: (d: Date) => string;
}

function RaceLaneCard({ lane, formatTime }: RaceLaneCardProps) {
  const won = lane.step === 'completed' || lane.step === 'payment_ready' || lane.step === 'finalized';
  const lost = lane.step === 'stock_failed' || lane.step === 'payment_failed' || lane.step === 'compensated';
  const tone = won
    ? 'border-success/30 bg-success/[0.04]'
    : lost
    ? 'border-error/30 bg-error/[0.04]'
    : 'border-white/5';

  return (
    <div className={`surface shadow-2xl border ${tone} flex flex-col overflow-hidden`}>
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between font-mono">
        <div className="flex items-center gap-3">
          {won ? (
            <Trophy className="w-4 h-4 text-success" />
          ) : lost ? (
            <XCircle className="w-4 h-4 text-error" />
          ) : (
            <Loader2 className="w-4 h-4 animate-spin text-muted" />
          )}
          <span className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">{lane.label}</span>
        </div>
        <span className="text-[9px] font-mono text-muted/50">{lane.sagaId.slice(0, 8)}…</span>
      </div>

      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between font-mono">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted/60">
          <span>Step</span>
          <span className="text-secondary font-black">{lane.step}</span>
        </div>
        {lane.status && <StatusBadge status={lane.status} />}
      </div>

      <div className="flex-1 overflow-y-auto font-mono text-[10px] min-h-[280px] max-h-[340px]">
        <ul className="divide-y divide-white/[0.03]">
          {lane.events.length === 0 ? (
            <li className="py-12 text-center text-muted/40 italic">
              Awaiting cluster events…
            </li>
          ) : (
            lane.events.map((e, i) => (
              <li key={`${e.step}-${i}`} className="px-6 py-3 flex items-center justify-between">
                <span className="text-muted/50">[{formatTime(new Date(e.timestamp))}]</span>
                <span className="text-secondary font-bold flex-1 mx-3 truncate" title={e.step}>
                  {describeSagaStep(e.step)}
                </span>
                <StatusBadge status={e.status} />
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

const SAGA_STEPS = [
  { id: 'initiated', label: 'Checkout started' },
  { id: 'stock_reserved', label: 'Stock reserved' },
  { id: 'payment_ready', label: 'Payment session created' },
  { id: 'completed', label: 'Order completed' },
] as const;

// Saga choreography. Each row is one message exchange: a service
// publishing or consuming a real RabbitMQ event (or, for the first two
// rows, an HTTP request). Maps the saga-step name the SignalR bridge
// sends (initiated, stock_reserved, ...) to the underlying message
// flow so the visitor sees the actual cross-service coordination
// instead of a single "Stock reserved" badge that hides four hops.
//
// Source code anchors: ritualworks-platform/src/CheckoutOrchestrator/
// Application/Sagas/CheckoutSaga.cs lines 71-150 (Initially / During
// blocks). Consumers: src/Catalog/Catalog.Application/Consumers/
// StockReservationRequestedConsumer.cs +
// src/Payments/Payments.Application/Consumers/
// PaymentSessionRequestedConsumer.cs.
type SagaLaneId = 'browser' | 'bff' | 'checkout' | 'catalog' | 'payments';

interface SagaHop {
  id: string;
  source: SagaLaneId;
  dest: SagaLaneId;
  eventName: string;
  /** Short why-it-happens annotation rendered under the event name. */
  detail: string;
  /** SignalR step name that flips this hop from pending → done. */
  signalsStep: string | null;
  kind: 'http' | 'event' | 'compensation';
}

const SAGA_LANES: { id: SagaLaneId; label: string }[] = [
  { id: 'browser',  label: 'Browser' },
  { id: 'bff',      label: 'bff-web' },
  { id: 'checkout', label: 'checkout-orchestrator' },
  { id: 'catalog',  label: 'catalog-svc' },
  { id: 'payments', label: 'payments-svc' },
];

const SAGA_HAPPY_PATH: SagaHop[] = [
  { id: 'http-1',          source: 'browser',  dest: 'bff',      eventName: 'POST /api/demo/saga/start', detail: 'Visitor clicks Pay',                                kind: 'http',  signalsStep: null },
  { id: 'http-2',          source: 'bff',      dest: 'checkout', eventName: 'POST /api/checkouts',       detail: 'BFF proxies to checkout-orchestrator',             kind: 'http',  signalsStep: null },
  { id: 'stock-req',       source: 'checkout', dest: 'catalog',  eventName: 'StockReservationRequested', detail: 'Saga: Initial → Initiated · publish via RabbitMQ', kind: 'event', signalsStep: 'initiated' },
  { id: 'stock-reserved',  source: 'catalog',  dest: 'checkout', eventName: 'StockReserved',             detail: 'Catalog: Product.ReserveStock + outbox publish',   kind: 'event', signalsStep: 'stock_reserved' },
  { id: 'payment-req',     source: 'checkout', dest: 'payments', eventName: 'PaymentSessionRequested',   detail: 'Saga: Initiated → StockReserved · publish',        kind: 'event', signalsStep: 'stock_reserved' },
  { id: 'payment-created', source: 'payments', dest: 'checkout', eventName: 'PaymentSessionCreated',     detail: 'Payments: create Stripe session + outbox publish', kind: 'event', signalsStep: 'payment_ready' },
  { id: 'payment-done',    source: 'payments', dest: 'checkout', eventName: 'PaymentCompleted',          detail: 'On Stripe webhook · saga: → Completed (final)',    kind: 'event', signalsStep: 'completed' },
];

const SAGA_COMPENSATION_PATHS: Record<string, SagaHop[]> = {
  stock_failed: [
    { id: 'comp-stock-failed', source: 'catalog',  dest: 'checkout', eventName: 'StockReservationFailed', detail: 'Saga: Initiated → Abandoned (no compensation needed — nothing reserved)', kind: 'compensation', signalsStep: 'stock_failed' },
  ],
  payment_failed: [
    { id: 'comp-payment-failed', source: 'payments', dest: 'checkout', eventName: 'PaymentSessionFailed',   detail: 'Saga: StockReserved → Compensating',                  kind: 'compensation', signalsStep: 'payment_failed' },
    { id: 'comp-release',        source: 'checkout', dest: 'catalog',  eventName: 'StockReleaseRequested', detail: 'Compensation: return reserved stock to inventory',     kind: 'compensation', signalsStep: 'compensated' },
  ],
};

function SagaSequenceView({
  sagaState,
  localEvents,
}: {
  sagaState: string;
  localEvents: SagaStepEvent[];
}) {
  const completedSteps = new Set(localEvents.map((e) => e.step));
  // Active step = the most recent SignalR event we've seen, falls back
  // to whatever sagaState says when the events list is empty.
  const activeStep = localEvents[0]?.step ?? sagaState;

  // Add compensation rows when a failure step has been observed.
  const hops: SagaHop[] = [...SAGA_HAPPY_PATH];
  for (const [trigger, comp] of Object.entries(SAGA_COMPENSATION_PATHS)) {
    if (completedSteps.has(trigger) || sagaState === trigger) {
      hops.push(...comp);
    }
  }

  // Index for quick lane-position lookup when drawing the arrow.
  const laneIndex = Object.fromEntries(
    SAGA_LANES.map((l, i) => [l.id, i] as const),
  ) as Record<SagaLaneId, number>;

  return (
    <div className="font-mono">
      {/* Header: lane labels for orientation */}
      <div className="grid gap-0 mb-4 pb-3 border-b border-white/10"
           style={{ gridTemplateColumns: `repeat(${SAGA_LANES.length}, 1fr)` }}>
        {SAGA_LANES.map((lane) => (
          <div key={lane.id} className="text-[9px] uppercase tracking-[0.2em] text-muted/60 text-center font-bold">
            {lane.label}
          </div>
        ))}
      </div>

      <div className="space-y-1">
        {hops.map((hop, idx) => {
          const isDone = hop.signalsStep ? completedSteps.has(hop.signalsStep) : idx < 2 && (sagaState !== 'Initial' || localEvents.length > 0);
          const isActive = hop.signalsStep === activeStep && !isDone;
          const isCompensation = hop.kind === 'compensation';
          const dim = !isDone && !isActive;

          return (
            <SagaSequenceRow
              key={hop.id}
              hop={hop}
              laneIndex={laneIndex}
              laneCount={SAGA_LANES.length}
              isDone={isDone}
              isActive={isActive}
              isCompensation={isCompensation}
              dim={dim}
            />
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-white/10 text-[9px] text-muted/60 uppercase tracking-widest space-y-1">
        <div>http = direct HTTP call · event = published via RabbitMQ outbox</div>
        <div>compensation = saga's failure-recovery path (red rows)</div>
      </div>
    </div>
  );
}

function SagaSequenceRow({
  hop,
  laneIndex,
  laneCount,
  isDone,
  isActive,
  isCompensation,
  dim,
}: {
  hop: SagaHop;
  laneIndex: Record<SagaLaneId, number>;
  laneCount: number;
  isDone: boolean;
  isActive: boolean;
  isCompensation: boolean;
  dim: boolean;
}) {
  const fromIdx = laneIndex[hop.source];
  const toIdx = laneIndex[hop.dest];
  const left = Math.min(fromIdx, toIdx);
  const span = Math.abs(toIdx - fromIdx) + 1;
  const reversed = toIdx < fromIdx;

  const tone = isCompensation
    ? 'text-error border-error/30'
    : isActive
      ? 'text-accent border-accent/40'
      : isDone
        ? 'text-success border-success/30'
        : 'text-muted/40 border-white/5';

  return (
    <div
      className={`grid gap-0 items-stretch transition-all duration-300 ${dim ? 'opacity-30' : 'opacity-100'}`}
      style={{ gridTemplateColumns: `repeat(${laneCount}, 1fr)` }}
    >
      {Array.from({ length: laneCount }).map((_, i) => {
        const isInArrow = i >= left && i < left + span;
        const isStart = !reversed ? i === fromIdx : i === fromIdx;
        const isEnd = i === toIdx;
        const showArrow = isInArrow;
        return (
          <div
            key={i}
            className={`relative h-12 flex items-center justify-center px-2 border-l-2 first:border-l-0 ${
              showArrow ? tone : 'border-transparent'
            }`}
          >
            {showArrow && (
              <div className="absolute inset-0 flex items-center justify-center">
                {/* The arrow line spans this cell */}
                <div className={`absolute left-0 right-0 top-1/2 h-px ${
                  isCompensation ? 'bg-error/40' : isActive ? 'bg-accent/40' : isDone ? 'bg-success/40' : 'bg-white/5'
                }`} />
                {isStart && (
                  <div className={`absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${
                    isCompensation ? 'bg-error' : isActive ? 'bg-accent animate-pulse' : isDone ? 'bg-success' : 'bg-muted/40'
                  }`} />
                )}
                {isEnd && (
                  <div className={`absolute right-0 top-1/2 -translate-y-1/2 ${
                    isCompensation ? 'text-error' : isActive ? 'text-accent' : isDone ? 'text-success' : 'text-muted/40'
                  }`}>
                    {reversed ? '◄' : '►'}
                  </div>
                )}
                {/* Label + detail centered above the arrow line on the start cell */}
                {isStart && (
                  <div
                    className="absolute -top-1 z-10 flex flex-col items-start gap-0.5 leading-tight"
                    style={{
                      left: '8px',
                      // Span across the cells the arrow occupies so the
                      // label doesn't get clipped by the cell border.
                      width: `calc(${span * 100}% + ${(span - 1) * 2}px)`,
                    }}
                  >
                    <span className={`text-[10.5px] font-bold tracking-tight ${
                      isCompensation ? 'text-error' : isActive ? 'text-accent' : isDone ? 'text-secondary' : 'text-muted/50'
                    }`}>
                      {hop.kind === 'http' ? '→ ' : ''}
                      {hop.eventName}
                    </span>
                    <span className="text-[9px] text-muted/60">
                      {hop.detail}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VerticalSagaLadder({ sagaState }: { sagaState: string }) {
  const steps = [...SAGA_STEPS] as Array<{ id: string; label: string }>;
  if (sagaState === 'stock_failed' || sagaState === 'payment_failed' || sagaState === 'compensated') {
    steps.push({ id: 'compensated', label: 'Compensation in flight' });
  }

  const getStepIndex = (state: string) => {
    if (state === 'Initial') return -1;
    if (state === 'stock_failed' || state === 'payment_failed') return 4; // Map failures to the Abandoned/Compensated slot
    return steps.findIndex((s) => s.id === state);
  };

  const currentIndex = getStepIndex(sagaState);

  const SAGA_IN_FLIGHT_LABELS: Record<string, { label: string; tooltip: string }> = {
    initiated: { label: "Order created. Now reserving stock.", tooltip: "First step of the saga." },
    stock_reserved: { label: "Stock reserved on catalog-svc.", tooltip: "The catalog replica that handled this. Aspire runs two — load-balances across them." },
    payment_ready: { label: "Payment session created with Stripe.", tooltip: "If the next step fails, the saga rolls back the stock." },
    completed: { label: "Order completed.", tooltip: "" },
    compensated: { label: "Compensation flow firing — releasing stock.", tooltip: "The saga's whole point. State that was reserved is now being given back." },
  };

  return (
    <div className="space-y-6">
      {steps.map((step, i) => {
        const isFinished =
          i < currentIndex || (i === currentIndex && (sagaState === 'completed' || sagaState === 'finalized'));
        const isActive = i === currentIndex && !isFinished;
        const isPending = i > currentIndex;
        const inFlight = SAGA_IN_FLIGHT_LABELS[step.id];

        return (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: isPending ? 0.3 : 1, x: 0 }}
            className="flex items-center gap-4 relative"
          >
            <div
              className={`w-8 h-8 rounded-none border flex items-center justify-center transition-all duration-500 ${
                isFinished
                  ? 'border-success bg-success/10 text-success'
                  : isActive
                  ? 'border-accent bg-accent/10 text-accent ring-4 ring-accent/20'
                  : 'border-white/10 text-muted/40'
              }`}
            >
              {isFinished ? (
                <Check className="w-4 h-4" />
              ) : isActive ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span className="text-[10px] font-black">{i + 1}</span>
              )}
            </div>
            <div className="flex-1">
              <div className="text-[9px] font-mono text-muted/50 uppercase tracking-widest">{step.id}</div>
              <div className={`text-sm font-bold transition-colors ${isActive ? 'text-accent' : 'text-primary'}`}>
                {step.label}
              </div>
            </div>
            
            <AnimatePresence>
              {isActive && inFlight && (
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute left-full ml-4 whitespace-nowrap text-[10px] font-bold text-accent-light bg-accent/5 px-2 py-1 border border-accent/20"
                >
                  {inFlight.tooltip ? (
                    <abbr title={inFlight.tooltip} className="no-underline cursor-help">
                      {inFlight.label}
                    </abbr>
                  ) : (
                    inFlight.label
                  )}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

const formatOrderId = (id: string | null) => {
  if (!id) return '---';
  const clean = id.replace(/-/g, '').toUpperCase();
  return `${clean.slice(0, 6)}-${clean.slice(6, 9)}`;
};

// Maps the wire-format saga step name to a human-readable summary that fits
// alongside it in the audit log. The raw step is still displayed underneath
// (in monospace) so the technical reader can correlate with backend code.
const SAGA_STEP_LABELS: Record<string, string> = {
  initiated: 'Checkout started',
  stock_reserved: 'Stock reserved',
  stock_failed: 'Stock unavailable',
  payment_ready: 'Payment session created',
  payment_failed: 'Payment failed',
  compensated: 'Stock released (compensation)',
  completed: 'Order completed',
  finalized: 'Order finalized',
};

function describeSagaStep(step: string): string {
  return SAGA_STEP_LABELS[step] ?? step.replace(/_/g, ' ');
}

function StatusBadge({ status }: { status: SagaStepEvent['status'] }) {
  const tone =
    status === 'success'
      ? 'text-success'
      : status === 'failed'
      ? 'text-error'
      : status === 'compensating'
      ? 'text-warning'
      : 'text-info';
  return (
    <span className={`text-[10px] font-black uppercase tracking-tighter ${tone}`}>
      {status}
    </span>
  );
}
