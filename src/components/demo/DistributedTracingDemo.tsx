import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  GitBranch,
  Loader2,
  Play,
  AlertTriangle,
  Telescope,
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

  const { executeCommand, isConnected } = useDemoSession('tracing');
  const latestTraceId = useLatestTraceId();

  const startTrace = async () => {
    setIsRunning(true);
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
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
            <Telescope className="w-4 h-4 text-accent" />
            Cross-service trace
          </h3>
          <span className="text-[10px] font-mono text-muted uppercase tracking-widest">
            6 services · 7 spans
          </span>
        </div>

        <div className="surface p-8 shadow-2xl space-y-7 font-mono">
          <p className="text-secondary text-sm leading-relaxed max-w-md">
            One request fans out to <span className="text-primary">orders-domain</span>,{' '}
            <span className="text-primary">inventory-service</span>,{' '}
            <span className="text-primary">payments-service</span> (which itself calls{' '}
            <span className="text-primary">external-stripe</span>),{' '}
            <span className="text-primary">notifications</span>, and{' '}
            <span className="text-primary">shared-outbox</span>. Spans are recorded server-side
            and replayed below.
          </p>

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

          <button
            onClick={startTrace}
            disabled={isRunning || !isConnected}
            className="focus-ring w-full py-5 bg-white text-black font-black text-sm uppercase rounded-2xl tracking-widest hover:bg-slate-100 transition-all shadow-[0_20px_40px_-12px_rgba(255,255,255,0.2)] disabled:opacity-30 flex items-center justify-center gap-3"
          >
            {isRunning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
            {isRunning ? 'Recording spans…' : 'Start trace'}
          </button>

          <AnimatePresence>
            {latestTraceId && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-subtle p-4 flex items-center gap-3 border border-success/20"
              >
                <GitBranch className="w-4 h-4 text-success" />
                <div className="flex-1">
                  <div className="text-[10px] font-black text-success uppercase tracking-[0.25em]">
                    Trace recorded
                  </div>
                  <div className="text-[10px] text-muted/80 mt-1">
                    Open the <span className="text-primary">distributed trace</span> disclosure below to see the flame graph.
                  </div>
                </div>
                <span className="text-[9px] font-mono text-muted/60">
                  {latestTraceId.slice(0, 8)}…
                </span>
              </motion.div>
            )}
          </AnimatePresence>
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
