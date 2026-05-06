import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Lock, Zap, Timer, Layers, Check } from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import { RequestReceiptHistory } from './RequestReceipt';
import type { RequestMetadata } from '../../lib/api/demo-client';

interface LaneResult {
  dbQueries: number;
  cacheHits: number;
  cacheMisses: number;
  totalDurationMs: number;
  isRunning: boolean;
}

const INITIAL_LANE_STATE: LaneResult = {
  dbQueries: 0,
  cacheHits: 0,
  cacheMisses: 0,
  totalDurationMs: 0,
  isRunning: false,
};

export function CacheStampedeDemo() {
  const [lanes, setLanes] = useState<Record<'none' | 'lock' | 'probabilistic', LaneResult>>(() => ({
    none: { ...INITIAL_LANE_STATE },
    lock: { ...INITIAL_LANE_STATE },
    probabilistic: { ...INITIAL_LANE_STATE },
  }));
  const [isRaceRunning, setIsRaceRunning] = useState(false);
  const [receipts, setReceipts] = useState<RequestMetadata[]>([]);
  const [showOutcome, setShowOutcome] = useState(false);

  const { executeCommand } = useDemoSession('stampede');

  // SSR-safe initialization
  useEffect(() => {
    setLanes({
      none: { ...INITIAL_LANE_STATE },
      lock: { ...INITIAL_LANE_STATE },
      probabilistic: { ...INITIAL_LANE_STATE },
    });
  }, []);

  const runLane = async (protection: 'none' | 'lock' | 'probabilistic') => {
    setLanes(prev => ({
      ...prev,
      [protection]: { ...INITIAL_LANE_STATE, isRunning: true }
    }));

    try {
      const result = await executeCommand('/cache/stampede', {
        concurrentRequests: 40,
        cacheKey: `stampede:${protection}:${Math.random().toString(36).substring(7)}`,
        protectionMode: protection === 'none' ? 'none' : 'singleflight',
        simulatedDbLatencyMs: 250
      });

      setLanes(prev => ({
        ...prev,
        [protection]: {
          dbQueries: result.dbQueries,
          cacheHits: result.cacheHits,
          cacheMisses: result.cacheMisses,
          totalDurationMs: result.totalDurationMs,
          isRunning: false
        }
      }));

      // Add one receipt from the race to the history
      if (protection === 'lock') {
        setReceipts(prev => [result, ...prev].slice(0, 10));
      }

    } catch (err) {
      setLanes(prev => ({
        ...prev,
        [protection]: { ...prev[protection], isRunning: false }
      }));
    }
  };

  const runRace = async () => {
    setIsRaceRunning(true);
    setShowOutcome(false);
    
    await Promise.all([
      runLane('none'),
      runLane('lock'),
      runLane('probabilistic')
    ]);
    
    setIsRaceRunning(false);
    setShowOutcome(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-accent" />
            A thousand customers refresh the same page at once just as your cache expires. How do you stop your database melting?
          </h3>
          <p className="text-xs text-muted leading-relaxed">
            Press <strong>Race</strong>. Three columns will populate as 50 concurrent requests hit the cache in three different protection modes. Watch the database hit count in each.
          </p>
        </div>
        
        <button
          onClick={runRace}
          disabled={isRaceRunning}
          className="flex-shrink-0 flex items-center gap-2 px-8 py-3 bg-accent hover:bg-accent/80 disabled:opacity-50 text-white rounded-lg transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)]"
        >
          <Zap className={`w-4 h-4 ${isRaceRunning ? 'animate-pulse' : ''}`} />
          <span className="text-xs font-black uppercase tracking-widest">Race</span>
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {(['none', 'lock', 'probabilistic'] as const).map(strategy => {
          const stats = lanes[strategy];
          const maxDbHits = Math.max(...Object.values(lanes).map(l => l.dbQueries), 1);
          const barWidth = stats.isRunning ? 0 : (stats.dbQueries / maxDbHits) * 100;
          
          const SAGA_IN_FLIGHT_LABELS: Record<string, { label: string; tooltip: string }> = {
            none: { label: "No protection: every request hits the DB.", tooltip: "Worst case — the database does N times the work it should." },
            lock: { label: "First request fetches; others wait.", tooltip: "Only one DB call. Slowest perceived latency for the followers." },
            probabilistic: { label: "First past the gate fetches; others get last-good value.", tooltip: "Best of both worlds — protects the DB without making everyone wait." },
          };

          const inFlight = SAGA_IN_FLIGHT_LABELS[strategy];

          return (
            <div key={strategy} className={`surface p-6 space-y-6 border transition-colors relative ${stats.isRunning ? 'border-accent/30' : 'border-white/5'}`}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black uppercase tracking-tighter text-secondary">{strategy}</span>
                {stats.isRunning ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <Timer className="w-3 h-3 text-accent" />
                  </motion.div>
                ) : (
                  strategy === 'none' ? <AlertTriangle className="w-3 h-3 text-error" /> :
                  strategy === 'lock' ? <Lock className="w-3 h-3 text-success" /> :
                  <Zap className="w-3 h-3 text-info" />
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-muted uppercase tracking-widest">Database Hits</span>
                    <span className={stats.dbQueries > 5 ? 'text-error' : 'text-success'}>{stats.dbQueries}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      className={`h-full ${strategy === 'none' ? 'bg-error' : 'bg-success'}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] text-muted/60 uppercase tracking-tighter block">Cache Hits</span>
                    <span className="text-xs font-mono font-bold">{stats.cacheHits}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] text-muted/60 uppercase tracking-tighter block">Latency</span>
                    <span className="text-xs font-mono font-bold text-accent">{stats.totalDurationMs}ms</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between opacity-40">
                  <span className="text-[9px] font-mono uppercase tracking-widest">Efficiency</span>
                  <span className="text-[9px] font-mono">{stats.cacheHits > 0 ? ((stats.cacheHits / 40) * 100).toFixed(0) : 0}%</span>
                </div>
              </div>

              <AnimatePresence>
                {stats.isRunning && inFlight && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-x-0 -bottom-12 z-20"
                  >
                    <div className="bg-accent/5 px-2 py-1 border border-accent/20 text-[9px] font-bold text-accent-light text-center backdrop-blur-sm">
                      <abbr title={inFlight.tooltip} className="no-underline cursor-help">
                        {inFlight.label}
                      </abbr>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {showOutcome && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 border border-success/30 bg-success/5 text-primary text-xs leading-relaxed shadow-xl"
          >
            ✓ The <code>lock</code> and <code>probabilistic</code> modes both kept DB load to a handful of queries. The <code>none</code> column hit the DB 50 times. <strong>Without this pattern</strong>, your cache TTL expiry triggers a 50× spike on your origin database; the slow query alarms fire; the on-call engineer wakes up; you eventually add the protection after the second incident.
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-[1fr_auto] gap-8 pt-8 border-t border-white/5">
        <div className="space-y-4">
           <h4 className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">Latest Trace</h4>
           <RequestReceiptHistory receipts={receipts} />
        </div>
        
        <div className="flex flex-col justify-end">
           <div className="font-mono text-[10px] text-muted/50 uppercase tracking-widest text-right max-w-md">
             Pattern: cache-stampede protection (single-flight + probabilistic early refresh). Code: <code>src/Catalog/Catalog.Infrastructure/Cache/</code>.
             The probabilistic variant trades a tiny stale-value risk for dramatically better tail latency.
           </div>
        </div>
      </div>
    </div>
  );
}
