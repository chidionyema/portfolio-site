import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  GitBranch,
  Loader2,
  Play,
  AlertTriangle,
  Telescope,
  Check,
} from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import { useLatestTraceId } from '../../hooks/useLatestTraceId';

type Scenario = 'happyPath' | 'withFailure';

interface TraceResult {
  traceId: string;
  rootSpanId: string;
  durationMs: number;
  spanCount: number;
  scenario: Scenario;
  startedAt: Date;
}

const SCENARIO_LABEL: Record<Scenario, string> = {
  happyPath: 'Happy path',
  withFailure: 'Stripe failure',
};

const SCENARIO_HINT: Record<Scenario, string> = {
  happyPath: '7 spans across 6 services, all green. Total round-trip ~128ms.',
  withFailure: 'Stripe child span returns Error; the payments span inherits it. Look for the red band in the flame graph.',
};

export function DistributedTracingDemo() {
  const [scenario, setScenario] = useState<Scenario>('happyPath');
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<TraceResult[]>([]);
  const [showOutcome, setShowOutcome] = useState(false);

  const { executeCommand, isConnected } = useDemoSession('tracing');
  const latestTraceId = useLatestTraceId();

  const startTrace = async () => {
    setIsRunning(true);
    setShowOutcome(false);
    try {
      const result = await executeCommand('/tracing/start', { scenario });
      setHistory((prev) =>
        [
          {
            traceId: result.traceId as string,
            rootSpanId: result.rootSpanId as string,
            durationMs: result.durationMs as number,
            spanCount: result.spanCount as number,
            scenario: result.scenario as Scenario,
            startedAt: new Date(),
          },
          ...prev,
        ].slice(0, 8),
      );
      setShowOutcome(true);
    } catch {
      /* surfaced via the connection status pill */
    } finally {
      setIsRunning(false);
    }
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
            <Telescope className="w-4 h-4 text-accent" />
            A request failed somewhere in your cluster of 50 microservices. How do you find the needle in the haystack without reading 50 sets of logs?
          </h3>
          <p className="text-xs text-muted leading-relaxed">
            Press <strong>Run scenario</strong>. Watch the "Propagation" visualization as the trace-id travels through the services. When it finishes, click the <strong>Trace ID</strong> link to see the real waterfall view.
          </p>
        </div>

        <div className="surface p-8 shadow-2xl space-y-7 font-mono relative">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-muted/60">
              Scenario
            </label>
            <div
              role="radiogroup"
              aria-label="Trace scenario"
              className="grid grid-cols-2 gap-1 p-1 bg-black/40 border border-white/[0.06] rounded-xl"
            >
              {(Object.keys(SCENARIO_LABEL) as Scenario[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setScenario(s)}
                  disabled={isRunning}
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
            <p className="text-[10px] text-muted/80 leading-relaxed">
              {SCENARIO_HINT[scenario]}
            </p>
          </div>

          <div className="relative">
            <button
              onClick={startTrace}
              disabled={isRunning}
              className="focus-ring w-full py-5 bg-white text-black font-black text-sm uppercase rounded-2xl tracking-widest hover:bg-slate-100 transition-all shadow-[0_20px_40px_-12px_rgba(255,255,255,0.2)] disabled:opacity-30 flex items-center justify-center gap-3"
            >
              {isRunning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
              {isRunning ? 'Recording spans…' : 'Run scenario'}
            </button>
            
            <AnimatePresence>
              {isRunning && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute left-full ml-6 top-1/2 -translate-y-1/2 whitespace-nowrap bg-accent/5 px-2 py-1 border border-accent/20 text-[10px] font-bold text-accent-light z-20"
                >
                  <abbr title="W3C TraceContext headers (traceparent) allow the ID to survive the jump between services." className="no-underline cursor-help">
                    Context propagation: {latestTraceId?.slice(0, 8) || '...'} passed to orders-domain.
                  </abbr>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {latestTraceId && !isRunning && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-subtle p-4 flex flex-col gap-3 border border-success/20"
              >
                <div className="flex items-center gap-3">
                  <GitBranch className="w-4 h-4 text-success" />
                  <div className="flex-1">
                    <div className="text-[10px] font-black text-success uppercase tracking-[0.25em]">
                      Trace recorded
                    </div>
                    <div className="text-[10px] text-muted/80 mt-1">
                      <abbr title="Each service reports its own segment (span) to the collector." className="no-underline">
                        Span captured: {history[0]?.durationMs}ms.
                      </abbr>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-muted/60">
                    {latestTraceId.slice(0, 8)}…
                  </span>
                </div>
                {scenario === 'withFailure' && (
                  <div className="text-[9px] text-error font-black uppercase flex items-center gap-1.5 ml-7">
                    <AlertTriangle className="w-3 h-3" />
                    Error captured in span: StripeServiceException
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showOutcome && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 border border-success/30 bg-success/5 text-primary text-xs leading-relaxed shadow-xl"
              >
                ✓ The entire request lifecycle was captured; the root cause (a 503 in the shipping service) was identified in seconds. <strong>Without this pattern</strong>, you have N disconnected log files; you spend your afternoon grepping for timestamps and trying to piece together a timeline by hand while the site is still down.
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="pt-8 border-t border-white/5 font-mono text-[10px] text-muted/50 uppercase tracking-widest">
          Pattern: distributed tracing via OpenTelemetry and Tempo. Code: <code>src/BuildingBlocks/Extensions/ServiceDefaults.cs</code>.
          Today the trace is synthesised server-side for the demo; real OTel propagation across the saga is on the hiring plan as Item 1.
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-muted" />
          Trace history
        </h3>

        <div className="surface shadow-2xl h-[480px] flex flex-col overflow-hidden font-mono">
          <div className="px-6 py-4 border-b border-white/5 text-[10px] font-black text-muted uppercase tracking-[0.2em] flex items-center justify-between">
            <span>Recent traces</span>
            <span className="text-success/60">{history.length} entries</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence initial={false}>
              {history.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted/40 text-[11px] italic">
                  Fire a request from the controls above — this log will populate in real-time.
                </div>
              ) : (
                <ul className="divide-y divide-white/[0.03]">
                  {history.map((t) => (
                    <motion.li
                      key={t.traceId}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="px-6 py-4 flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-secondary font-bold truncate">
                          {t.traceId.slice(0, 12)}…
                        </div>
                        <div className="text-[9px] text-muted/60 mt-1 flex items-center gap-2">
                          <span>[{formatTime(t.startedAt)}]</span>
                          <span>·</span>
                          <span>{SCENARIO_LABEL[t.scenario]}</span>
                          <span>·</span>
                          <span className="tabular-nums">{t.spanCount} spans</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {t.scenario === 'withFailure' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-error" />
                        ) : null}
                        <span className="text-[10px] font-black tabular-nums text-accent-light">
                          {t.durationMs}ms
                        </span>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              )}
            </AnimatePresence>
          </div>
          <div className="p-4 glass-subtle border-t border-white/5 text-[10px] text-muted/60 leading-relaxed text-center font-mono">
            The TraceViewer disclosure below this panel renders the flame graph for the
            most-recent trace.
          </div>
        </div>
      </div>
    </div>
  );
}
