import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Lock, Zap, Timer, Layers } from 'lucide-react';
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
    
    await Promise.all([
      runLane('none'),
      runLane('lock'),
      runLane('probabilistic')
    ]);
    
    setIsRaceRunning(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-accent" />
            HybridCache_Stampede_Simulator
          </h3>
          <p className="text-[10px] text-muted uppercase tracking-widest mt-1">Comparing protection strategies under high concurrency</p>
        </div>
        
        <button
          onClick={runRace}
          disabled={isRaceRunning}
          className="flex items-center gap-2 px-8 py-3 bg-accent hover:bg-accent/80 disabled:opacity-50 text-white rounded-lg transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)]"
        >
          <Zap className={`w-4 h-4 ${isRaceRunning ? 'animate-pulse' : ''}`} />
          <span className="text-xs font-black uppercase tracking-widest">Run Race (40 reqs/lane)</span>
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {(['none', 'lock', 'probabilistic'] as const).map(strategy => {
          const stats = lanes[strategy];
          const maxDbHits = Math.max(...Object.values(lanes).map(l => l.dbQueries), 1);
          const barWidth = stats.isRunning ? 0 : (stats.dbQueries / maxDbHits) * 100;
          
          return (
            <div key={strategy} className={`surface p-6 space-y-6 border transition-colors ${stats.isRunning ? 'border-accent/30' : 'border-white/5'}`}>
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
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="surface p-6 space-y-4">
           <h4 className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">Latest Trace</h4>
           <RequestReceiptHistory receipts={receipts} />
        </div>
        
        <div className="surface p-6 space-y-4">
           <h4 className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">Simulation Info</h4>
           <div className="text-[10px] text-muted/60 font-mono space-y-2 leading-relaxed">
             <p>// UNPROTECTED: Classic stampede. All concurrent misses hit the DB.</p>
             <p>// LOCKED: Uses distributed lock to allow only 1 factory run.</p>
             <p>// PROB_REFRESH: Non-blocking refresh before expiration.</p>
           </div>
        </div>
      </div>
    </div>
  );
}
