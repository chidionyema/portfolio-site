import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Activity,
  Database,
  Trophy,
  XCircle,
  Check,
  Zap,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import { signalRClient } from '../../lib/api/signalr';
import type { SagaStepEvent } from '../../lib/api/signalr';
import { ChaosButton } from './ChaosButton';
import { RequestReceipt, RequestReceiptHistory } from './RequestReceipt';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Heading } from '../ui/Heading';
import { Stack } from '../ui/Stack';
import { Pill } from '../ui/Pill';
import { Glass } from '../ui/Glass';
import { Reveal } from '../ui/Reveal';
import { cn } from '../../lib/utils';
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

  useEffect(() => {
    if (raceLanes) return;
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
      <div className="grid lg:grid-cols-[45fr_55fr] gap-12 items-start">
        {/* Left Pane - Customer context */}
        <Stack gap={6}>
          <Heading variant="caption" level={3}>
            {CHECKOUT_COPY.ORDER_HEADER}
          </Heading>

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
                >
                  <Card variant="panel-dark" padding="lg" className="shadow-2xl space-y-8">
                    {/* Scenario picker */}
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
                          className={cn(
                            "focus-ring py-2 px-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all",
                            scenario === s
                              ? 'bg-white/10 text-white shadow-sm'
                              : 'text-muted hover:text-secondary hover:bg-white/10'
                          )}
                        >
                          {CHECKOUT_COPY.SCENARIO_LABELS[s]}
                        </button>
                      ))}
                    </div>

                    {/* Cart Item */}
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-white/10 rounded-lg flex-shrink-0" />
                      <div className="flex-1 min-w-0 font-mono">
                        <div className="flex justify-between items-start">
                          <Heading variant="panel" level={4} className="text-sm">Demo Widget</Heading>
                          <span className="text-sm font-black tabular-nums text-primary">£39.99</span>
                        </div>
                        <p className="text-[10px] text-muted uppercase tracking-widest mt-1">Qty 1</p>
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-white/5 pt-6 font-mono">
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

                    <Button
                      variant={sagaState === 'completed' || sagaState === 'finalized' ? 'primary' : 
                               sagaState === 'stock_failed' || sagaState === 'payment_failed' || sagaState === 'compensated' ? 'secondary' : 'primary'}
                      onClick={runSimulation}
                      disabled={isProcessing}
                      className={cn(
                        "w-full h-auto py-5 font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-xl",
                        sagaState === 'stock_failed' || sagaState === 'payment_failed' || sagaState === 'compensated' ? "bg-error text-white" : ""
                      )}
                    >
                      {getButtonContent(sagaState, isProcessing, orderId)}
                    </Button>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Stack>

        {/* Right Pane - Engineering context */}
        <Stack gap={6}>
          <Heading variant="caption" className="font-mono" level={3}>
            {CHECKOUT_COPY.ENGINEERING_HEADER}
          </Heading>

          {lanes ? (
            <div className="grid grid-cols-1 gap-6">
              {lanes.map((lane) => (
                <RaceLaneCard key={lane.sagaId} lane={lane} formatTime={formatTime} />
              ))}
            </div>
          ) : (
            <Stack gap={6}>
              <Card variant="panel-dark" padding="lg" className="shadow-2xl">
                <Stack gap={4}>
                  <div>
                    <Heading variant="caption" level={4} className="mb-2 font-mono tracking-[0.3em] text-secondary/90">
                      Choreography · cross-service event flow
                    </Heading>
                    <p className="text-[10px] text-secondary/90 leading-relaxed font-mono">
                      Each row is one message — direct HTTP at the top,
                      RabbitMQ events between services after that. No central transaction.
                    </p>
                  </div>
                  <SagaSequenceView sagaState={sagaState} localEvents={localEvents} />
                </Stack>
              </Card>

              <CompensationDrawer sagaState={sagaState} localEvents={localEvents} />

              <Card variant="panel-dark" padding="none" className="h-[400px] flex flex-col overflow-hidden shadow-2xl">
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between font-mono text-[10px]">
                  <span className="text-secondary font-bold uppercase italic tracking-widest">Bridge Events Log</span>
                </div>

                <div className="flex-1 overflow-y-auto font-mono text-[11px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#0d0d12] border-b border-white/10 z-10">
                      <tr className="text-secondary/90 uppercase text-[10px] font-black tracking-widest">
                        <th className="px-6 py-3">Time</th>
                        <th className="px-6 py-3">Event</th>
                        <th className="px-6 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence initial={false}>
                        {localEvents.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-24 text-center text-secondary/90 italic uppercase tracking-[0.3em]">
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
                              <td className="px-6 py-4 text-secondary/90 text-[10px] whitespace-nowrap align-top">
                                [{formatTime(new Date(e.timestamp))}]
                              </td>
                              <td className="px-6 py-4 align-top">
                                <div className="text-secondary font-bold">{describeSagaStep(e.step)}</div>
                                <div className="text-[9px] text-secondary/90 mt-0.5 font-mono uppercase tracking-widest">
                                  {e.step}
                                </div>
                                {e.description && (
                                  <div className="text-[10px] text-secondary/90 mt-1.5 font-sans italic max-w-md leading-relaxed">
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
              </Card>

              <div className="pt-6 border-t border-white/5">
                <Heading variant="caption" level={4} className="mb-4 font-mono tracking-[0.3em]">Inject failure</Heading>
                <ChaosButton scenario="inventory-kill" label="Kill Inventory Mid-Saga" durationSeconds={10} />
              </div>
            </Stack>
          )}
        </Stack>
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
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          {CHECKOUT_COPY.PAY_RESERVING}
        </span>
      );
    case 'stock_reserved':
      return (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          {CHECKOUT_COPY.PAY_CONFIRMING}
        </span>
      );
    case 'payment_ready':
      return (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          {CHECKOUT_COPY.PAY_COMPLETING}
        </span>
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
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Processing...
        </span>
      ) : CHECKOUT_COPY.PAY_IDLE;
  }
}

function ConfirmationCard({ orderId, onReset }: { orderId: string | null; onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Card variant="panel-dark" padding="lg" className="shadow-2xl text-center space-y-6 border border-success/20 bg-success/[0.02]">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
            <Check className="w-8 h-8 text-success" />
          </div>
        </div>

        <div className="space-y-2">
          <Heading variant="panel" level={3} className="uppercase tracking-tight">{CHECKOUT_COPY.RECEIPT_HEADER}</Heading>
          <p className="text-sm font-black tabular-nums text-success font-mono">#{formatOrderId(orderId)}</p>
        </div>

        <p className="text-sm text-muted leading-relaxed">{CHECKOUT_COPY.RECEIPT_EMAIL_LINE}</p>

        <div className="pt-4 space-y-6">
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="block text-xs font-bold text-accent hover:underline decoration-accent/30 underline-offset-4 cursor-not-allowed"
          >
            {CHECKOUT_COPY.RECEIPT_VIEW_LINK}
          </a>

          <button
            onClick={onReset}
            className="text-[10px] font-black uppercase tracking-widest text-muted hover:text-primary transition-colors border-t border-white/5 pt-6 w-full font-mono"
          >
            {CHECKOUT_COPY.RUN_ANOTHER}
          </button>
        </div>
      </Card>
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
          <Card key={lane.sagaId} padding="sm" className={cn("surface border transition-colors shadow-lg", tone)}>
            <div className="flex justify-between items-center mb-3 font-mono">
              <Heading variant="caption" level={4} className="text-[10px] font-black text-primary uppercase tracking-widest">{lane.label}</Heading>
              <span className="text-[9px] text-secondary/90">#{lane.sagaId.slice(0, 4)}</span>
            </div>

            <div className="flex justify-between items-center mb-4">
              <span className="text-xs text-primary font-mono">1 unit · £39.99</span>
              {lane.status && <StatusBadge status={lane.status} />}
            </div>

            <div
              className={cn(
                "w-full py-2.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-2 font-mono",
                isWon ? 'bg-success text-white' : isLost ? 'bg-error text-white' : 'bg-white/10 text-muted'
              )}
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
          </Card>
        );
      })}

      {allFinished && !isProcessing && (
        <button
          onClick={onReset}
          className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-muted hover:text-primary transition-colors border border-dashed border-white/10 rounded-xl mt-2 font-mono"
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
          <Stack gap={4} className="pt-4">
            <Heading variant="caption" level={4} className="font-mono tracking-[0.3em]">
              {CHECKOUT_COPY.COMPENSATION_HEADER}
            </Heading>
            <Card padding="lg" className="border border-warning/30 bg-warning/5 space-y-4">
              <ul className="space-y-2 list-none font-mono">
                <li className="text-xs text-primary flex items-center gap-2">
                  <Check className="w-3 h-3 text-success" />
                  Stock release: ✓ 1 unit returned to inventory
                </li>
                <li className="text-xs text-primary flex items-center gap-2">
                  <Activity className="w-3 h-3 text-accent" />
                  Published{' '}
                  <span className="font-mono text-[10px] bg-white/10 px-1">StockReleaseRequestedEvent</span> to RabbitMQ
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
            </Card>
          </Stack>
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
    <Card variant="panel-dark" padding="none" className={cn("shadow-2xl border flex flex-col overflow-hidden", tone)}>
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between font-mono">
        <div className="flex items-center gap-3">
          {won ? (
            <Trophy className="w-4 h-4 text-success" />
          ) : lost ? (
            <XCircle className="w-4 h-4 text-error" />
          ) : (
            <Loader2 className="w-4 h-4 animate-spin text-muted" />
          )}
          <Heading variant="panel" level={4} className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">{lane.label}</Heading>
        </div>
        <span className="text-[9px] text-secondary/90">#{lane.sagaId.slice(0, 8)}…</span>
      </div>

      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between font-mono">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-secondary/90">
          <span>Step</span>
          <span className="text-secondary font-black">{lane.step}</span>
        </div>
        {lane.status && <StatusBadge status={lane.status} />}
      </div>

      <div className="flex-1 overflow-y-auto font-mono text-[10px] min-h-[280px] max-h-[340px]">
        <ul className="divide-y divide-white/[0.03]">
          {lane.events.length === 0 ? (
            <li className="py-12 text-center text-secondary/90 italic">
              Awaiting cluster events…
            </li>
          ) : (
            lane.events.map((e, i) => (
              <li key={`${e.step}-${i}`} className="px-6 py-3 flex items-center justify-between">
                <span className="text-secondary/90">[{formatTime(new Date(e.timestamp))}]</span>
                <span className="text-secondary font-bold flex-1 mx-3 truncate" title={e.step}>
                  {describeSagaStep(e.step)}
                </span>
                <StatusBadge status={e.status} />
              </li>
            ))
          )}
        </ul>
      </div>
    </Card>
  );
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

type SagaLaneId = 'browser' | 'bff' | 'checkout' | 'catalog' | 'payments';

interface SagaHop {
  id: string;
  source: SagaLaneId;
  dest: SagaLaneId;
  eventName: string;
  detail: string;
  signalsStep: string | null;
  kind: 'http' | 'event' | 'compensation';
}

function SagaSequenceView({
  sagaState,
  localEvents,
}: {
  sagaState: string;
  localEvents: SagaStepEvent[];
}) {
  const completedSteps = new Set(localEvents.map((e) => e.step));
  const activeStep = localEvents[0]?.step ?? sagaState;

  const hops: SagaHop[] = [...SAGA_HAPPY_PATH];
  for (const [trigger, comp] of Object.entries(SAGA_COMPENSATION_PATHS)) {
    if (completedSteps.has(trigger) || sagaState === trigger) {
      hops.push(...comp);
    }
  }

  const laneIndex = Object.fromEntries(
    SAGA_LANES.map((l, i) => [l.id, i] as const),
  ) as Record<SagaLaneId, number>;

  return (
    <div className="font-mono">
      <div className="grid gap-0 mb-4 pb-3 border-b border-white/10"
           style={{ gridTemplateColumns: `repeat(${SAGA_LANES.length}, 1fr)` }}>
        {SAGA_LANES.map((lane) => (
          <div key={lane.id} className="text-[9px] uppercase tracking-[0.2em] text-secondary/90 text-center font-bold">
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

      <div className="mt-4 pt-3 border-t border-white/10 text-[9px] text-secondary/90 uppercase tracking-widest space-y-1">
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
        : 'text-secondary/90 border-white/5';

  return (
    <div
      className={cn("grid gap-0 items-stretch transition-all duration-300", dim ? 'opacity-60' : 'opacity-100')}
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
            className={cn(
              "relative h-12 flex items-center justify-center px-2 border-l-2 first:border-l-0",
              showArrow ? tone : 'border-transparent'
            )}
          >
            {showArrow && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={cn(
                  "absolute left-0 right-0 top-1/2 h-px",
                  isCompensation ? 'bg-error/40' : isActive ? 'bg-accent/40' : isDone ? 'bg-success/40' : 'bg-white/10'
                )} />
                {isStart && (
                  <div className={cn(
                    "absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full",
                    isCompensation ? 'bg-error' : isActive ? 'bg-accent animate-pulse' : isDone ? 'bg-success' : 'bg-muted/40'
                  )} />
                )}
                {isEnd && (
                  <div className={cn(
                    "absolute right-0 top-1/2 -translate-y-1/2",
                    isCompensation ? 'text-error' : isActive ? 'text-accent' : isDone ? 'text-success' : 'text-secondary/90'
                  )}>
                    {reversed ? '◄' : '►'}
                  </div>
                )}
                {isStart && (
                  <div
                    className="absolute -top-1 z-10 flex flex-col items-start gap-0.5 leading-tight"
                    style={{
                      left: '8px',
                      width: `calc(${span * 100}% + ${(span - 1) * 2}px)`,
                    }}
                  >
                    <span className={cn(
                      "text-[10.5px] font-bold tracking-tight",
                      isCompensation ? 'text-error' : isActive ? 'text-accent' : isDone ? 'text-secondary' : 'text-secondary/90'
                    )}>
                      {hop.kind === 'http' ? '→ ' : ''}
                      {hop.eventName}
                    </span>
                    <span className="text-[9px] text-secondary/90">
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

const formatOrderId = (id: string | null) => {
  if (!id) return '---';
  const clean = id.replace(/-/g, '').toUpperCase();
  return `${clean.slice(0, 6)}-${clean.slice(6, 9)}`;
};

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
  const variant =
    status === 'success'
      ? 'success'
      : status === 'failed'
      ? 'error'
      : status === 'compensating'
      ? 'warning'
      : 'status';
  return (
    <Pill variant={variant as any} className="text-[10px] px-2 py-0.5">
      {status}
    </Pill>
  );
}
