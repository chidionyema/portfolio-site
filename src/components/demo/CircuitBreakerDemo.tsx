import { useState, useEffect, useMemo, useRef } from 'react';
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
  Waves,
  Play,
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
    <div className="space-y-8">
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-accent" />
            Circuit breaker
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
              {probeArmed ? 'Send probe' : 'Send request'}
            </button>
            <button
              onClick={tripBreaker}
              disabled={!isConnected || isTripping || isRequesting}
              title="Fires 3 failing requests in sequence to trip the breaker. The breaker auto-recovers via the half-open probe after the 6s cooldown."
              aria-label="Trip the breaker by firing three failing requests"
              className="focus-ring py-4 bg-error/10 hover:bg-error/20 border border-error/30 text-error font-black text-xs uppercase tracking-widest rounded-2xl transition-all disabled:opacity-30 flex items-center justify-center gap-2"
            >
              {isTripping ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
              {isTripping ? 'Tripping…' : 'Trip breaker'}
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
            Manual reset
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-error" />
          Event log
        </h3>

        <div className="surface shadow-2xl h-[540px] flex flex-col overflow-hidden font-mono">
          <div className="px-6 py-4 border-b border-white/5 text-[10px] font-black text-muted uppercase tracking-[0.2em] flex items-center justify-between">
            <span>{logs.length} entr{logs.length === 1 ? 'y' : 'ies'}</span>
            <span className="text-success/60">most recent first</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            <AnimatePresence initial={false}>
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted/40 text-[11px] italic">
                  Fire a request from the controls above — this log will populate in real-time.
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
                      <span className="opacity-30 uppercase">[{log.status.replace('-', ' ')}]</span>
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

    <JitterStorm />
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
              {inFlight ? 'Probe in flight' : 'Probe armed'}
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
        <span>Transition log</span>
        <span className="italic">No transitions observed</span>
      </div>
    );
  }
  return (
    <div className="border-t border-white/5 pt-5 space-y-3 font-mono">
      <div className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">Transition log</div>
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

// ===========================================================================
// Jitter Storm — purely client-side simulation of N retrying clients.
// Demonstrates the difference between synchronized exponential backoff
// (everyone hits the server in lockstep waves) and AWS-style "full jitter"
// (random delay drawn uniformly from [0, base * 2^attempt]). This is a
// client-side concern: jitter is something each caller chooses on its own,
// so the visualization is honest as a frontend simulation.
// ===========================================================================

const STORM_CLIENT_COUNT = 12;
const STORM_MAX_RETRIES = 4;
const STORM_BASE_DELAY_MS = 200;
const STORM_TIMELINE_MS = 4000;
const STORM_BUCKET_COUNT = 32;

interface RetryAttempt {
  clientId: number;
  attemptNumber: number;
  timestampMs: number;
}

interface StormResult {
  attempts: RetryAttempt[];
  jitterEnabled: boolean;
  generatedAt: number;
}

function generateStorm(jitterEnabled: boolean): StormResult {
  const attempts: RetryAttempt[] = [];
  for (let clientId = 0; clientId < STORM_CLIENT_COUNT; clientId++) {
    let cumulative = 0;
    // Initial attempt — every client fires at t=0 (this is the trigger event).
    attempts.push({ clientId, attemptNumber: 0, timestampMs: 0 });
    for (let attempt = 1; attempt <= STORM_MAX_RETRIES; attempt++) {
      const ceiling = STORM_BASE_DELAY_MS * Math.pow(2, attempt);
      const delay = jitterEnabled ? Math.random() * ceiling : ceiling;
      cumulative += delay;
      if (cumulative > STORM_TIMELINE_MS) break;
      attempts.push({ clientId, attemptNumber: attempt, timestampMs: cumulative });
    }
  }
  return { attempts, jitterEnabled, generatedAt: Date.now() };
}

function bucketize(attempts: RetryAttempt[]): number[] {
  const buckets = new Array<number>(STORM_BUCKET_COUNT).fill(0);
  const bucketWidth = STORM_TIMELINE_MS / STORM_BUCKET_COUNT;
  for (const a of attempts) {
    if (a.attemptNumber === 0) continue; // ignore the initial sync event; only retries are interesting
    const idx = Math.min(STORM_BUCKET_COUNT - 1, Math.floor(a.timestampMs / bucketWidth));
    buckets[idx]++;
  }
  return buckets;
}

function JitterStorm() {
  const [storm, setStorm] = useState<StormResult | null>(null);
  const [jitterEnabled, setJitterEnabled] = useState(true);

  const run = () => setStorm(generateStorm(jitterEnabled));

  // Auto-run a fresh sample whenever the toggle flips so the comparison is
  // immediate without an extra click.
  useEffect(() => {
    setStorm(generateStorm(jitterEnabled));
  }, [jitterEnabled]);

  const buckets = useMemo(() => (storm ? bucketize(storm.attempts) : []), [storm]);
  const peakBucket = useMemo(() => Math.max(1, ...buckets), [buckets]);
  const totalRetries = useMemo(() => buckets.reduce((s, b) => s + b, 0), [buckets]);

  return (
    <div className="surface p-8 shadow-2xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Waves className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em]">
            Retry storm
          </h3>
        </div>
        <div className="flex items-center gap-3 font-mono">
          <div
            role="radiogroup"
            aria-label="Jitter strategy"
            className="grid grid-cols-2 gap-1 p-1 bg-black/40 border border-white/[0.06] rounded-xl"
          >
            <button
              onClick={() => setJitterEnabled(false)}
              role="radio"
              aria-checked={!jitterEnabled}
              className={`focus-ring py-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                !jitterEnabled
                  ? 'bg-error/20 text-error shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                  : 'text-muted hover:text-secondary hover:bg-white/5'
              }`}
            >
              No jitter
            </button>
            <button
              onClick={() => setJitterEnabled(true)}
              role="radio"
              aria-checked={jitterEnabled}
              className={`focus-ring py-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                jitterEnabled
                  ? 'bg-success/20 text-success shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                  : 'text-muted hover:text-secondary hover:bg-white/5'
              }`}
            >
              Full jitter
            </button>
          </div>
          <button
            onClick={run}
            className="focus-ring flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-white/5 hover:bg-white/10 border border-white/5 text-secondary"
            title="Generate a fresh sample with the current jitter setting."
          >
            <Play className="w-3 h-3" /> Resample
          </button>
        </div>
      </div>

      <p className="text-[11px] text-muted/80 leading-relaxed font-mono max-w-3xl">
        {STORM_CLIENT_COUNT} clients hit a failing service at t=0 and back off
        exponentially (200, 400, 800, 1600ms). Without jitter every client retries
        at the same instant — synchronized waves of load that re-saturate the
        recovering service. With <em>full jitter</em> each client picks a random
        delay in [0, ceiling], spreading the load smoothly.
      </p>

      {storm && (
        <>
          {/* Density histogram across the timeline */}
          <div>
            <div className="flex items-end h-20 gap-px font-mono">
              {buckets.map((count, idx) => (
                <div
                  key={idx}
                  className="flex-1 relative group"
                  title={`${count} retr${count === 1 ? 'y' : 'ies'} in this 125ms window`}
                >
                  <motion.div
                    layout
                    className={`w-full rounded-t-sm transition-colors ${
                      jitterEnabled ? 'bg-success/40' : 'bg-error/40'
                    }`}
                    style={{ height: `${(count / peakBucket) * 100}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[9px] font-mono text-muted/60 mt-1 tabular-nums">
              <span>0ms</span>
              <span>{STORM_TIMELINE_MS / 2}ms</span>
              <span>{STORM_TIMELINE_MS}ms</span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-muted/80">
              <span className="font-black uppercase tracking-widest">
                Peak: <span className={jitterEnabled ? 'text-success' : 'text-error'}>{peakBucket}</span>
              </span>
              <span className="opacity-50">retries hit the service in a single 125ms window</span>
              <span className="ml-auto opacity-50 tabular-nums">{totalRetries} retries total</span>
            </div>
          </div>

          {/* Per-client retry lanes */}
          <div className="space-y-1 font-mono">
            {Array.from({ length: STORM_CLIENT_COUNT }).map((_, clientId) => {
              const clientAttempts = storm.attempts.filter((a) => a.clientId === clientId);
              return (
                <div key={clientId} className="flex items-center gap-3">
                  <span className="text-[9px] text-muted/40 w-8 tabular-nums">c{clientId.toString().padStart(2, '0')}</span>
                  <div className="relative flex-1 h-3 bg-white/[0.02] rounded-full">
                    {clientAttempts.map((a) => (
                      <div
                        key={a.attemptNumber}
                        className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${
                          a.attemptNumber === 0
                            ? 'bg-muted/40'
                            : jitterEnabled
                            ? 'bg-success shadow-[0_0_6px_rgba(34,197,94,0.6)]'
                            : 'bg-error shadow-[0_0_6px_rgba(239,68,68,0.6)]'
                        }`}
                        style={{
                          left: `${Math.min(99.5, (a.timestampMs / STORM_TIMELINE_MS) * 100)}%`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-muted/60 leading-relaxed font-mono italic">
            The trigger event (grey dot at t=0) is shared by every client. After
            that, each colored dot is a retry attempt. Look at the histogram bars
            above to compare the load shape: spikes vs. spread.
          </p>
        </>
      )}
    </div>
  );
}
