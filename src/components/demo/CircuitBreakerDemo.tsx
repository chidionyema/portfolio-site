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
  Check,
} from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import type { CircuitBreakerEvent } from '../../lib/api/signalr';
import { RequestReceiptHistory } from './RequestReceipt';
import type { RequestMetadata } from '../../lib/api/demo-client';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:5050';

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
  const [baselineLogs, setBaselineLogs] = useState<ResilienceLog[]>([]);
  const [isTripping, setIsTripping] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isBaselineRequesting, setIsBaselineRequesting] = useState(false);
  const [probeArmed, setProbeArmed] = useState(false);
  const [probeInFlight, setProbeInFlight] = useState(false);
  const [receipts, setReceipts] = useState<RequestMetadata[]>([]);
  const [showOutcome, setShowOutcome] = useState(false);

  const { executeCommand, events } = useDemoSession('circuit');
  const lastEventIdRef = useRef<string>('');

  const updateCircuitLocal = (state: CircuitState, timestamp?: string) => {
    setCircuitState(state);
    setTransitions((prev) => {
      const ts = timestamp ? new Date(timestamp) : new Date();
      if (prev.length > 0 && prev[0].state === state) return prev;
      return [
        { id: crypto.randomUUID(), state, timestamp: ts },
        ...prev.slice(0, 4),
      ];
    });

    if (state === 'half-open') {
      setProbeArmed(true);
    } else if (state === 'closed' || state === 'open') {
      setProbeArmed(false);
      setProbeInFlight(false);
    }

    if (state === 'open') {
      setShowOutcome(true);
    }
  };

  // Subscribe to backend state changes
  useEffect(() => {
    if (events.length > 0) {
      const lastEvent = events[0] as CircuitBreakerEvent;
      if (!lastEvent.state || !lastEvent.timestamp) return;

      const eventKey = `${lastEvent.state}-${lastEvent.timestamp}`;
      if (eventKey === lastEventIdRef.current) return;
      lastEventIdRef.current = eventKey;

      updateCircuitLocal(lastEvent.state, lastEvent.timestamp);
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

      setReceipts(prev => [result, ...prev].slice(0, 10));

      if (result.circuitState) {
        updateCircuitLocal(result.circuitState);
      }

      const status: ResilienceLog['status'] =
        wasProbe
          ? result.success ? 'probe-success' : 'probe-failure'
          : result.success ? 'success' : result.rejectedCount > 0 ? 'rejected' : 'failure';

      const message =
        wasProbe
          ? result.success ? 'Probe succeeded — circuit closing' : 'Probe failed — circuit reopening'
          : result.success ? 'Request OK'
          : result.rejectedCount > 0 ? 'Rejected — circuit open'
          : result.error || 'Request failed';

      setLogs((prev) => [
        { id: crypto.randomUUID(), timestamp: new Date(), status, message, latency },
        ...prev.slice(0, 14),
      ]);
    } catch (err: any) {
      setLogs((prev) => [
        {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          status: 'failure',
          message: err.message || 'Network Error / Timeout',
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
    setShowOutcome(false);
    // Fires Failures to trip breaker AND Baseline failures in parallel for contrast.
    await Promise.all([
       (async () => {
          for (let i = 0; i < 3; i++) {
             await issueRequest(true);
          }
       })(),
       issueBaselineRequests()
    ]);
    setIsTripping(false);
  };

  const issueBaselineRequests = async () => {
     setIsBaselineRequesting(true);
     const requests = Array.from({ length: 6 }).map(async () => {
        const start = Date.now();
        try {
           const response = await fetch(`${API_URL}/api/demo/circuit/request`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ shouldFail: true, sessionId: 'baseline-test' })
           });
           const latency = Date.now() - start;
           setBaselineLogs(prev => [{
              id: crypto.randomUUID(),
              timestamp: new Date(),
              status: response.ok ? 'success' : 'failure',
              message: response.ok ? 'Request OK (bypass)' : 'Request Failed (bypass)',
              latency
           }, ...prev.slice(0, 14)]);
        } catch (err) {
           setBaselineLogs(prev => [{
              id: crypto.randomUUID(),
              timestamp: new Date(),
              status: 'failure',
              message: 'Timeout (bypass)',
              latency: Date.now() - start
           }, ...prev.slice(0, 14)]);
        }
     });
     await Promise.all(requests);
     setIsBaselineRequesting(false);
  };

  const resetBreaker = async () => {
    try {
      const result = await executeCommand('/circuit/reset', {});
      setReceipts(prev => [result, ...prev].slice(0, 10));
      updateCircuitLocal('closed');
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
      setBaselineLogs([]);
      setShowOutcome(false);
    } catch {}
  };

  const SAGA_IN_FLIGHT_LABELS: Record<string, { label: string; tooltip: string }> = {
    'half-open': { label: "Breaker trial: sending 1 test request.", tooltip: "The breaker is testing the waters. If this succeeds, it closes; if it fails, it re-opens." },
    'open': { label: "Breaker open: rejecting all traffic locally.", tooltip: "Fail fast. No network calls are made to the broken service, saving your resources." },
    'closed': { label: "Breaker closed: traffic allowed.", tooltip: "" },
  };

  const inFlight = SAGA_IN_FLIGHT_LABELS[circuitState];

  return (
    <div className="space-y-10">
      <div className="surface p-10 shadow-2xl flex flex-col items-center gap-8 relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-20" />
         <div className="text-center space-y-2 relative z-10">
            <h3 className="text-sm font-black text-primary uppercase tracking-[0.4em]">The shipping-label service is down. Do you let it crash your entire checkout page too?</h3>
            <p className="text-[10px] text-muted font-bold uppercase tracking-widest opacity-60">Press <strong>Trip & Hammer</strong>. Watch the right lane (with the breaker) fail fast after a few errors, while the left lane (no breaker) hangs and eventually times out for every single request.</p>
         </div>

         <div className="flex flex-wrap justify-center gap-4 relative z-10">
            <button
              onClick={tripBreaker}
              disabled={isTripping || isRequesting}
              className="px-10 py-5 bg-white text-black font-black text-xs uppercase tracking-[0.3em] rounded-2xl shadow-[0_20px_50px_rgba(255,255,255,0.15)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20 flex items-center gap-3"
            >
              {isTripping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
              Trip & Hammer
            </button>
            <button
               onClick={() => issueRequest(false)}
               disabled={isTripping || isRequesting}
               className="px-8 py-5 bg-white/5 border border-white/10 text-primary font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all disabled:opacity-20"
            >
               {probeArmed ? 'Send Probe' : 'Single Request'}
            </button>
         </div>

         <div className="w-full flex items-center justify-center gap-12 text-[9px] font-black uppercase tracking-widest text-muted/40">
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-success" />
               Threshold: 2 Errors
            </div>
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-warning" />
               Cooldown: 6s
            </div>
         </div>
         
         <AnimatePresence>
           {inFlight && (
             <motion.div
               key={circuitState}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0 }}
               className="bg-accent/5 px-3 py-1.5 border border-accent/20 rounded-lg text-[10px] font-bold text-accent-light"
             >
               <abbr title={inFlight.tooltip} className="no-underline cursor-help">
                 {inFlight.label}
               </abbr>
             </motion.div>
           )}
         </AnimatePresence>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 relative">
         <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/5 -translate-x-1/2 hidden lg:block" />

         {/* Lane: Without Breaker */}
         <div className="space-y-6">
            <div className="flex items-center justify-between">
               <h3 className="text-xs font-black text-error uppercase tracking-[0.3em] flex items-center gap-3">
                  <ShieldAlert className="w-4 h-4" />
                  Without Breaker
               </h3>
               <span className="text-[9px] font-mono text-muted/40 uppercase">Baseline_Lane</span>
            </div>

            <div className="surface p-6 shadow-xl space-y-6 h-[600px] flex flex-col">
               <div className="p-4 bg-error/5 border border-error/20 rounded-xl">
                  <p className="text-[10px] text-error/80 font-bold leading-relaxed uppercase tracking-widest">
                     System saturation. Every failing request blocks a thread for the full 3s timeout.
                  </p>
               </div>

               <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                  <AnimatePresence initial={false}>
                     {baselineLogs.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted/10 text-[11px] font-black uppercase tracking-[0.5em] italic">
                           Idle
                        </div>
                     ) : (
                        baselineLogs.map((log) => (
                           <motion.div
                              key={log.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="p-3 bg-white/[0.02] border-l-2 border-error/40 flex items-center justify-between font-mono"
                           >
                              <div className="flex items-center gap-3 text-[10px] font-bold">
                                 <span className="text-error uppercase">Failure</span>
                                 <span className="text-muted/60 uppercase">Timeout</span>
                              </div>
                              <span className="text-error font-black tabular-nums">{log.latency}ms</span>
                           </motion.div>
                        ))
                     )}
                  </AnimatePresence>
               </div>
            </div>
         </div>

         {/* Lane: With Breaker */}
         <div className="space-y-6">
            <div className="flex items-center justify-between">
               <h3 className="text-xs font-black text-success uppercase tracking-[0.3em] flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4" />
                  With Breaker
               </h3>
               <span className="text-[9px] font-mono text-muted/40 uppercase">Resilient_Lane</span>
            </div>

            <div className="surface p-8 shadow-2xl space-y-8 h-[600px] flex flex-col">
               <StateMachineDiagram state={circuitState} probeInFlight={probeInFlight} />
               
               <AnimatePresence mode="wait">
                  {probeArmed || probeInFlight ? (
                     <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <ProbeIndicator armed={probeArmed} inFlight={probeInFlight} state={circuitState} />
                     </motion.div>
                  ) : (
                     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto pr-2 space-y-1.5 custom-scrollbar">
                        {logs.length === 0 ? (
                           <div className="h-full flex items-center justify-center text-muted/10 text-[11px] font-black uppercase tracking-[0.5em] italic">
                              Monitoring
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
                                 <div className="flex items-center gap-3 text-[10px] font-bold font-mono">
                                    <span className="opacity-30 uppercase">[{log.status.replace('-', ' ')}]</span>
                                    <span className="truncate max-w-[140px] uppercase">{log.message}</span>
                                 </div>
                                 <span className="opacity-40 text-[9px] tabular-nums font-mono">{log.latency}ms</span>
                              </motion.div>
                           ))
                        )}
                     </motion.div>
                  )}
               </AnimatePresence>

               <AnimatePresence>
                 {showOutcome && (
                   <motion.div
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="p-4 border border-success/30 bg-success/5 text-primary text-[11px] leading-relaxed shadow-lg mb-4"
                   >
                     ✓ The broken service was isolated; checkout remained responsive. <strong>Without this pattern</strong>, every customer's browser hangs for 30 seconds while the server waits for a dead service; your thread pool exhausts; your entire site goes offline because of one minor dependency.
                   </motion.div>
                 )}
               </AnimatePresence>

               <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                  <button onClick={resetBreaker} className="text-[10px] font-black text-muted hover:text-primary uppercase tracking-widest flex items-center gap-2">
                     <RefreshCcw className="w-3 h-3" />
                     Reset_State
                  </button>
                  <div className="flex items-center gap-2">
                     <div className={`w-1.5 h-1.5 rounded-full ${circuitState === 'closed' ? 'bg-success' : circuitState === 'open' ? 'bg-error' : 'bg-warning'} animate-pulse`} />
                     <span className="text-[9px] font-black text-muted uppercase tracking-tighter">{circuitState}</span>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <JitterStorm />
      
      <div className="surface p-10 space-y-8">
         <RequestReceiptHistory receipts={receipts} />
         
         <div className="pt-8 border-t border-white/5 font-mono text-[10px] text-muted/50 uppercase tracking-widest text-center">
           Pattern: circuit breaker (fail-fast) with Polly. Code: <code>src/BuildingBlocks/Extensions/HttpExtensions.cs</code>.
           The hard part is tuning the thresholds — trip too early and you're fragile; trip too late and you're already dead.
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
