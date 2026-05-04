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
} from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import { signalRClient } from '../../lib/api/signalr';
import type { SagaStepEvent } from '../../lib/api/signalr';
import { ChaosButton } from './ChaosButton';

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

const SCENARIO_LABEL: Record<Scenario, string> = {
  success: 'Path_Happy',
  stockFailure: 'Fault_Stock',
  paymentFailure: 'Fault_Pay',
  stockRace: 'Stock_Race',
};

export function CheckoutDemo() {
  const [localEvents, setLocalEvents] = useState<SagaStepEvent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scenario, setScenario] = useState<Scenario>('success');
  const [sagaState, setSagaState] = useState<string>('Initial');
  const [activeSagaId, setActiveSagaId] = useState<string | null>(null);
  const [raceLanes, setRaceLanes] = useState<RaceLane[] | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const { executeCommand, events: remoteEvents, isConnected } = useDemoSession('checkout');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isProcessing && localEvents.length === 0) setShowTooltip(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [isProcessing, localEvents]);

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
    setShowTooltip(false);
    setIsProcessing(true);
    setLocalEvents([]);
    setSagaState('Initial');
    setActiveSagaId(null);
    setRaceLanes(null);

    try {
      const result = await executeCommand('/saga/start', {
        scenarioType: scenario,
        simulatedDelayMs: 500,
      });

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

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 1,
    });

  return (
    <div className="space-y-8 relative">
      {/* Scenario picker */}
      <div className="surface p-6 shadow-2xl">
        <label className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">
          Select Execution Path
        </label>
        <div
          role="radiogroup"
          aria-label="Saga scenario"
          className="grid grid-cols-2 sm:grid-cols-4 gap-1 mt-3 p-1 bg-black/40 border border-white/[0.06] rounded-xl"
        >
          {(Object.keys(SCENARIO_LABEL) as Scenario[]).map((s) => (
            <button
              key={s}
              onClick={() => setScenario(s)}
              disabled={isProcessing}
              role="radio"
              aria-checked={scenario === s}
              className={`focus-ring py-2.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                scenario === s
                  ? 'bg-accent text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                  : 'text-muted hover:text-secondary hover:bg-white/5'
              } disabled:opacity-30`}
            >
              {SCENARIO_LABEL[s]}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted/60 leading-relaxed mt-4 font-mono max-w-2xl">
          {scenario === 'stockRace'
            ? 'Two carts will be created targeting the same product after stock is seeded to 5. Each cart asks for 3 units — one cart wins, the other compensates.'
            : 'A single checkout saga runs end-to-end. Stock and payment failures simulate compensation paths.'}
        </p>
      </div>

      {/* Action row */}
      <div className="grid grid-cols-1 gap-4 relative">
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 10, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0 }}
              className="absolute -top-12 left-1/2 z-20 bg-accent text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap shadow-xl border border-white/20"
            >
              Click to start your first saga
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-accent rotate-45 border-r border-b border-white/20" />
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={runSimulation}
          disabled={isProcessing || !isConnected}
          className={`focus-ring w-full py-5 bg-white text-black font-black text-sm uppercase rounded-2xl transition-all shadow-[0_20px_40px_-12px_rgba(255,255,255,0.2)] disabled:opacity-20 flex items-center justify-center gap-3 ${
            showTooltip ? 'animate-pulse ring-4 ring-accent/30 scale-[1.02]' : 'hover:bg-slate-100'
          }`}
        >
          {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
          {isProcessing
            ? scenario === 'stockRace'
              ? 'Race_Executing...'
              : 'Saga_Executing...'
            : scenario === 'stockRace'
            ? 'Dispatch_Race'
            : 'Dispatch_New_Order'}
        </button>

        <ChaosButton scenario="inventory-kill" label="Kill Inventory Mid-Saga" durationSeconds={10} />
      </div>

      {/* Mode-specific view */}
      {lanes ? (
        <div className="grid lg:grid-cols-2 gap-6">
          {lanes.map((lane) => (
            <RaceLaneCard key={lane.sagaId} lane={lane} formatTime={formatTime} />
          ))}
        </div>
      ) : (
        <SingleSagaView
          sagaState={sagaState}
          localEvents={localEvents}
          isProcessing={isProcessing}
          formatTime={formatTime}
        />
      )}
    </div>
  );
}

interface SingleSagaViewProps {
  sagaState: string;
  localEvents: SagaStepEvent[];
  isProcessing: boolean;
  formatTime: (d: Date) => string;
}

function SingleSagaView({ sagaState, localEvents, isProcessing, formatTime }: SingleSagaViewProps) {
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-accent" />
            Distributed_Saga_Orchestrator
          </h3>
        </div>

        <div className="surface p-8 shadow-2xl">
          <div className="glass-subtle p-6 relative overflow-hidden">
            <div className="flex items-center justify-between relative z-10 text-[10px] font-bold uppercase tracking-widest text-muted/60">
              <span className={sagaState === 'Initial' || sagaState === 'initiated' ? 'text-primary' : ''}>Initial</span>
              <div className="h-px bg-white/10 flex-1 mx-4" />
              <span className={sagaState === 'stock_reserved' ? 'text-info' : ''}>Stock</span>
              <div className="h-px bg-white/10 flex-1 mx-4" />
              <span className={sagaState === 'payment_ready' ? 'text-info' : ''}>Payment</span>
              <div className="h-px bg-white/10 flex-1 mx-4" />
              <span className={sagaState === 'completed' ? 'text-success' : ''}>Done</span>
            </div>

            <AnimatePresence>
              {(sagaState === 'stock_failed' || sagaState === 'payment_failed' || sagaState === 'compensated') && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 pt-6 border-t border-white/5 flex items-center justify-center gap-3 text-warning font-black tracking-widest uppercase text-xs"
                >
                  <RefreshCcw className="w-4 h-4 animate-spin-slow" />
                  Rollback_In_Progress
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
          <Database className="w-4 h-4 text-muted" />
          Live_SignalR_Telemetry (L2)
        </h3>

        <div className="surface shadow-2xl h-[480px] flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between font-mono text-[10px]">
            <span className="text-muted font-bold uppercase">
              Buffer:{' '}
              <span className="text-accent-light">
                {isProcessing || localEvents.length > 0 ? 'f4a9b21c' : '---'}
              </span>
            </span>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
              <span className="text-success font-black">Connected</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto font-mono text-[11px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0d0d12] border-b border-white/10 z-10">
                <tr className="text-muted/60 uppercase text-[10px] font-black tracking-widest">
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">Event_Type</th>
                  <th className="px-6 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {localEvents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-24 text-center text-muted/20 italic uppercase tracking-widest font-black"
                      >
                        Awaiting_Ingress_Data...
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
                        <td className="px-6 py-4 text-muted/50 text-[10px]">
                          [{formatTime(new Date(e.timestamp))}]
                        </td>
                        <td className="px-6 py-4 text-secondary font-bold">{e.step}</td>
                        <td className="px-6 py-4 text-right">
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
      </div>
    </div>
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
            <li className="py-12 text-center text-muted/20 italic uppercase tracking-widest font-black">
              Awaiting_Stream...
            </li>
          ) : (
            lane.events.map((e, i) => (
              <li key={`${e.step}-${i}`} className="px-6 py-3 flex items-center justify-between">
                <span className="text-muted/50">[{formatTime(new Date(e.timestamp))}]</span>
                <span className="text-secondary font-bold flex-1 mx-3 truncate">{e.step}</span>
                <StatusBadge status={e.status} />
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
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
