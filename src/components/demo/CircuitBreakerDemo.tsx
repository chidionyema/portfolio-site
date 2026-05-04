import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  ShieldAlert,
  Activity,
  Loader2,
  RefreshCcw,
  Zap,
  AlertTriangle,
  ArrowRight,
  Radar,
} from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import type { CircuitBreakerEvent } from '../../lib/api/signalr';

type CircuitState = 'closed' | 'open' | 'half-open';

interface ResilienceLog {
  id: string;
  timestamp: Date;
  status: 'success' | 'failure' | 'rejected' | 'probe-success' | 'probe-failure';
  message: string;
  latency: number;
}

interface StateTransition {
  id: string;
  state: CircuitState;
  timestamp: Date;
}

const STATE_NODES: { id: CircuitState; label: string; tone: string }[] = [
  { id: 'closed',    label: 'Closed',    tone: 'success' },
  { id: 'half-open', label: 'Half_Open', tone: 'warning' },
  { id: 'open',      label: 'Open',      tone: 'error' },
];

export function CircuitBreakerDemo() {
  const [circuitState, setCircuitState] = useState<CircuitState>('closed');
  const [transitions, setTransitions] = useState<StateTransition[]>([]);
  const [logs, setLogs] = useState<ResilienceLog[]>([]);
  const [isTripping, setIsTripping] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [probeArmed, setProbeArmed] = useState(false); // next request will be the probe
  const [probeInFlight, setProbeInFlight] = useState(false);

  const { executeCommand, events, isConnected } = useDemoSession('circuit');
  const lastEventIdRef = useRef<string>('');

  // Subscribe to backend state changes
  useEffect(() => {
    if (events.length === 0) return;
    const lastEvent = events[0] as CircuitBreakerEvent;
    if (!lastEvent.state || !lastEvent.timestamp) return;

    const eventKey = `${lastEvent.state}-${lastEvent.timestamp}`;
    if (eventKey === lastEventIdRef.current) return;
    lastEventIdRef.current = eventKey;

    setCircuitState(lastEvent.state);
    setTransitions((prev) => [
      { id: crypto.randomUUID(), state: lastEvent.state, timestamp: new Date(lastEvent.timestamp) },
      ...prev.slice(0, 4),
    ]);

    if (lastEvent.state === 'half-open') {
      setProbeArmed(true);
    } else if (lastEvent.state === 'closed' || lastEvent.state === 'open') {
      setProbeArmed(false);
      setProbeInFlight(false);
    }
  }, [events]);

  const issueRequest = async (shouldFail: boolean): Promise<void> => {
    const start = Date.now();
    const wasProbe = probeArmed;
    if (wasProbe) {
      setProbeInFlight(true);
      setProbeArmed(false);
    }
    setIsRequesting(true);

    try {
      const result = await executeCommand('/circuit/request', { shouldFail });
      const latency = Date.now() - start;
      const status: ResilienceLog['status'] =
        wasProbe
          ? result.success ? 'probe-success' : 'probe-failure'
          : result.success ? 'success' : result.isRejected ? 'rejected' : 'failure';

      const message =
        wasProbe
          ? result.success ? 'Probe succeeded — circuit closing' : 'Probe failed — circuit reopening'
          : result.success ? 'Request OK'
          : result.isRejected ? 'Rejected — circuit open'
          : result.error || 'Request failed';

      setLogs((prev) => [
        { id: crypto.randomUUID(), timestamp: new Date(), status, message, latency },
        ...prev.slice(0, 14),
      ]);
    } catch {
      setLogs((prev) => [
        {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          status: 'failure',
          message: 'Network Error / Timeout',
          latency: Date.now() - start,
        },
        ...prev.slice(0, 14),
      ]);
    } finally {
      setIsRequesting(false);
      setProbeInFlight(false);
    }
  };

  const tripBreaker = async () => {
    setIsTripping(true);
    // Threshold is 2 in backend, fire 3 to be deterministic.
    for (let i = 0; i < 3; i++) {
      await issueRequest(true);
    }
    setIsTripping(false);
  };

  const resetBreaker = async () => {
    try {
      await executeCommand('/circuit/reset', {});
      setLogs((prev) => [
        {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          status: 'success',
          message: 'Manual reset — breaker forced closed',
          latency: 0,
        },
        ...prev.slice(0, 14),
      ]);
    } catch {}
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-accent" />
            Circuit_Breaker_State_Machine
          </h3>
          <span className="text-[10px] font-mono text-muted uppercase tracking-widest">
            Threshold: 2 · Cooldown: 6s
          </span>
        </div>

        <div className="surface p-8 shadow-2xl space-y-8">
          <StateMachineDiagram state={circuitState} probeInFlight={probeInFlight} />

          <ProbeIndicator armed={probeArmed} inFlight={probeInFlight} state={circuitState} />

          <TransitionTimeline transitions={transitions} />

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => issueRequest(false)}
              disabled={!isConnected || isTripping || isRequesting}
              title={probeArmed ? 'Sends the half-open probe — outcome decides whether the breaker closes or reopens.' : 'Sends a single request through the breaker.'}
              aria-label={probeArmed ? 'Send half-open probe request' : 'Send single request through breaker'}
              className="focus-ring py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
            >
              {isRequesting && !isTripping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
              {probeArmed ? 'Send_Probe' : 'Send_Request'}
            </button>
            <button
              onClick={tripBreaker}
              disabled={!isConnected || isTripping || isRequesting}
              title="Fires 3 failing requests in sequence to trip the breaker. The breaker auto-recovers via the half-open probe after the 6s cooldown."
              aria-label="Trip the breaker by firing three failing requests"
              className="focus-ring py-4 bg-error/10 hover:bg-error/20 border border-error/30 text-error font-black text-xs uppercase tracking-widest rounded-2xl transition-all disabled:opacity-30 flex items-center justify-center gap-2"
            >
              {isTripping ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
              {isTripping ? 'Tripping...' : 'Trip_Breaker'}
            </button>
          </div>

          <button
            onClick={resetBreaker}
            disabled={!isConnected}
            title="Forces the breaker back to Closed without waiting for the cooldown. Discards the cached policy so the next call rebuilds with no failure history."
            aria-label="Manually reset the breaker to Closed"
            className="focus-ring w-full py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-secondary font-bold text-[10px] uppercase tracking-[0.3em] rounded-xl transition-all disabled:opacity-30 flex items-center justify-center gap-2"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Manual_Reset
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-error" />
          Resilience_Audit_Trail
        </h3>

        <div className="surface shadow-2xl h-[540px] flex flex-col overflow-hidden font-mono">
          <div className="px-6 py-4 border-b border-white/5 text-[10px] font-black text-muted uppercase tracking-[0.2em] flex items-center justify-between">
            <span>Event_Log</span>
            <span className="text-success/60">{logs.length} entries</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            <AnimatePresence initial={false}>
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted/20 text-[10px] font-black uppercase tracking-[0.4em] italic">
                  Pipeline_Idle
                </div>
              ) : (
                logs.map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center justify-between p-3 rounded-lg border-l-2 bg-white/[0.01] ${
                      log.status === 'success' || log.status === 'probe-success'
                        ? 'border-success/40 text-success/80'
                        : log.status === 'rejected'
                        ? 'border-warning/40 text-warning/80'
                        : 'border-error/40 text-error/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 text-[10px] font-bold">
                      <span className="opacity-30 uppercase">[{log.status.replace('-', '_')}]</span>
                      <span className="truncate max-w-[220px] uppercase">{log.message}</span>
                    </div>
                    <span className="opacity-40 text-[9px] tabular-nums">{log.latency}ms</span>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StateMachineDiagramProps {
  state: CircuitState;
  probeInFlight: boolean;
}

function StateMachineDiagram({ state, probeInFlight }: StateMachineDiagramProps) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-3">
        {STATE_NODES.map((node, idx) => {
          const isActive = node.id === state;
          const toneClass =
            node.tone === 'success'
              ? 'border-success/50 bg-success/10 text-success'
              : node.tone === 'warning'
              ? 'border-warning/50 bg-warning/10 text-warning'
              : 'border-error/50 bg-error/10 text-error';
          return (
            <div key={node.id} className="flex items-center flex-1 last:flex-initial gap-3">
              <motion.div
                animate={{
                  scale: isActive ? 1.05 : 1,
                  opacity: isActive ? 1 : 0.35,
                }}
                transition={{ duration: 0.25 }}
                className={`flex-1 px-4 py-5 rounded-xl border-2 text-center font-mono ${toneClass}`}
              >
                <div className="text-[9px] font-black uppercase tracking-[0.3em] opacity-70">State</div>
                <div className="text-sm font-black uppercase mt-2">{node.label}</div>
                {isActive && (
                  <div className="mt-2 w-1.5 h-1.5 rounded-full bg-current mx-auto animate-pulse shadow-[0_0_10px_currentColor]" />
                )}
              </motion.div>
              {idx < STATE_NODES.length - 1 && (
                <ArrowRight
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    (idx === 0 && state === 'half-open') || (idx === 1 && state === 'open')
                      ? 'text-accent-light'
                      : 'text-white/10'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      <AnimatePresence>
        {probeInFlight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
          >
            <Radar className="w-12 h-12 text-warning/60 animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ProbeIndicatorProps {
  armed: boolean;
  inFlight: boolean;
  state: CircuitState;
}

function ProbeIndicator({ armed, inFlight, state }: ProbeIndicatorProps) {
  const visible = armed || inFlight;
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="glass-subtle p-4 flex items-center gap-3 border border-warning/20"
        >
          <Radar className={`w-4 h-4 text-warning ${inFlight ? 'animate-spin-slow' : 'animate-pulse'}`} />
          <div className="flex-1">
            <div className="text-[10px] font-black text-warning uppercase tracking-[0.25em]">
              {inFlight ? 'Probe_In_Flight' : 'Probe_Armed'}
            </div>
            <div className="text-[10px] text-muted font-mono mt-1">
              {inFlight
                ? 'Single test request admitted. Outcome decides next state.'
                : `Cooldown elapsed — circuit is half-open. The next request is the probe.`}
            </div>
          </div>
          <Zap className="w-3.5 h-3.5 text-warning/60" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface TransitionTimelineProps {
  transitions: StateTransition[];
}

function TransitionTimeline({ transitions }: TransitionTimelineProps) {
  if (transitions.length === 0) {
    return (
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-muted/60 border-t border-white/5 pt-5">
        <span>Transition_Log</span>
        <span className="italic">No transitions observed</span>
      </div>
    );
  }
  return (
    <div className="border-t border-white/5 pt-5 space-y-3 font-mono">
      <div className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">Transition_Log</div>
      <ul className="space-y-1.5">
        {transitions.map((t, idx) => (
          <li
            key={t.id}
            className={`flex items-center justify-between text-[10px] ${
              idx === 0 ? 'text-primary' : 'text-muted/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="opacity-40 tabular-nums">[{formatTime(t.timestamp)}]</span>
              <span
                className={`font-black uppercase tracking-widest ${
                  t.state === 'open'
                    ? 'text-error'
                    : t.state === 'half-open'
                    ? 'text-warning'
                    : 'text-success'
                }`}
              >
                {t.state.replace('-', '_')}
              </span>
            </div>
            {idx === 0 && (
              <span className="text-[9px] uppercase tracking-widest text-accent-light">current</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 1,
  });
}
