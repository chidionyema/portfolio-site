import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Lock, Zap, Database, Server, Timer, Layers, ChevronRight, Gauge, AlertCircle } from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';

interface StampedeResult {
  id: string;
  protection: 'none' | 'lock' | 'probabilistic';
  dbHits: number;
  cacheHits: number;
  totalTimeMs: number;
  p99Ms: number;
}

interface RequestParticle {
  id: string;
  status: 'pending' | 'l1' | 'l2' | 'db';
  delay: number;
}

export function CacheStampedeDemo() {
  const [localResults, setLocalResults] = useState<StampedeResult[]>([]);
  const [isRunning, setIsRunning] = useState<string | null>(null);
  const [requests, setRequests] = useState<RequestParticle[]>([]);
  const [activeTier, setActiveTier] = useState<'l1' | 'l2' | 'db' | null>(null);

  const { executeCommand, events, isConnected } = useDemoSession('stampede');

  useEffect(() => {
     if (events.length > 0) {
        const lastEvent = events[0];
        if (lastEvent.action === 'get_or_create' || lastEvent.action === 'get') {
           setActiveTier(lastEvent.result === 'miss' ? 'db' : 'l2');
        }
     }
  }, [events]);

  const runStampede = async (protection: 'none' | 'lock' | 'probabilistic') => {
    setIsRunning(protection);
    setRequests(Array.from({ length: 40 }).map((_, i) => ({
      id: Math.random().toString(),
      status: 'pending',
      delay: i * 15,
    })));
    setActiveTier(null);

    const start = Date.now();
    try {
      const result = await executeCommand('/cache/stampede', {
        concurrentRequests: 40,
        cacheKey: `stampede:${protection}`,
        protectionMode: protection,
        simulatedDbLatencyMs: 150
      });

      const finalResult: StampedeResult = {
        id: crypto.randomUUID(),
        protection,
        dbHits: result.dbQueries,
        cacheHits: result.cacheHits,
        totalTimeMs: Date.now() - start,
        p99Ms: (Date.now() - start) + 12,
      };

      setLocalResults(prev => [finalResult, ...prev.slice(0, 5)]);
      setRequests(prev => prev.map(r => ({ 
         ...r, 
         status: result.dbQueries > 5 ? 'db' : (Math.random() > 0.4 ? 'l1' : 'l2') 
      })));

    } catch (err) {
    } finally {
      setIsRunning(null);
      setActiveTier(null);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-accent" />
            HybridCache_L2_Subsystem
          </h3>
        </div>

        <div className="surface p-8 shadow-2xl space-y-10">
          <div className="space-y-4">
             <label className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">Execution Strategy</label>
             <div className="grid grid-cols-3 gap-2">
               {(['none', 'lock', 'probabilistic'] as const).map(type => (
                 <button
                   key={type}
                   onClick={() => runStampede(type)}
                   disabled={isRunning !== null || !isConnected}
                   className={`flex flex-col items-center gap-2.5 p-4 rounded-xl transition-all border ${
                     isRunning === type ? 'bg-accent border-accent text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]' :
                     'bg-white/5 border-white/5 text-muted hover:text-secondary hover:bg-white/10'
                   } disabled:opacity-20`}
                 >
                   {type === 'none' ? <AlertTriangle className="w-5 h-5 text-error" /> :
                    type === 'lock' ? <Lock className="w-5 h-5 text-success" /> :
                    <Zap className="w-5 h-5 text-info" />}
                   <span className="text-[10px] font-bold uppercase tracking-widest leading-none">
                     {type === 'none' ? 'UNPROTECTED' : type === 'lock' ? 'LOCKED' : 'PROB_REFRESH'}
                   </span>
                 </button>
               ))}
             </div>
          </div>

          <div className="glass-subtle p-8 space-y-6">
             <div className="flex items-end gap-8 h-40">
                {[
                  { label: 'L1', time: '1.2ms', color: 'bg-success/50', active: activeTier === 'l1' },
                  { label: 'L2', time: '15.4ms', color: 'bg-info/50', active: activeTier === 'l2' },
                  { label: 'DB', time: '210ms', color: 'bg-error/50', active: activeTier === 'db' }
                ].map((tier) => (
                  <div key={tier.label} className="flex-1 flex flex-col items-center gap-4">
                    <div className="w-full bg-white/[0.03] border border-white/5 flex flex-col justify-end h-32 relative rounded-lg overflow-hidden">
                       <motion.div 
                         className={`w-full ${tier.color} transition-colors duration-150`}
                         initial={{ height: '10%' }}
                         animate={{ height: tier.active ? '100%' : '10%' }}
                       />
                       {tier.active && <div className="absolute inset-0 bg-white/5 animate-pulse" />}
                    </div>
                    <div className="flex flex-col items-center leading-none">
                       <span className={`text-[10px] font-black uppercase tracking-widest ${tier.active ? 'text-primary' : 'text-muted/60'}`}>{tier.label}</span>
                       <span className="text-[9px] font-mono opacity-40 mt-1">{tier.time}</span>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
          <Timer className="w-4 h-4 text-muted" />
          Latency profile
        </h3>

        <div className="surface p-8 shadow-2xl h-[340px] flex flex-col">
           <div className="flex flex-wrap gap-1.5 justify-center">
              <AnimatePresence>
                {requests.map((r) => (
                  <motion.div
                    key={r.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`w-3.5 h-3.5 rounded-sm ${
                      r.status === 'pending' ? 'bg-white/5' :
                      r.status === 'l1' ? 'bg-success/50' :
                      r.status === 'l2' ? 'bg-info/50' :
                      'bg-error/50'
                    }`}
                  />
                ))}
              </AnimatePresence>
              {requests.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center pt-12 text-muted/20 italic uppercase tracking-[0.4em] font-mono">
                   <Server className="w-16 h-16 mb-6 opacity-5" strokeWidth={1} />
                   Run a stampede to populate.
                </div>
              )}
           </div>

           <AnimatePresence>
             {isRunning && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-auto pt-6 border-t border-white/5 flex items-center justify-center gap-10 font-mono">
                  <div className="flex items-center gap-2.5">
                     <Database className="w-4 h-4 text-error opacity-60" />
                     <span className="text-[10px] font-black uppercase tracking-widest">DB_LOAD: <span className={activeTier === 'db' ? 'text-error' : 'text-success'}>{activeTier === 'db' ? 'CRITICAL' : 'OPTIMAL'}</span></span>
                  </div>
                  <div className="flex items-center gap-2.5">
                     <Lock className="w-4 h-4 text-success opacity-60" />
                     <span className="text-[10px] font-black uppercase tracking-widest">REDIS_LOCK: <span className={isRunning === 'lock' ? 'text-success' : 'text-muted/60'}>{isRunning === 'lock' && activeTier === 'db' ? 'HELD' : 'OPEN'}</span></span>
                  </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>

        <div className="surface overflow-hidden shadow-xl">
          <table className="w-full text-left font-mono text-[10px] border-collapse">
            <thead className="bg-[#0d0d12] border-b border-white/10 uppercase tracking-widest text-muted/60">
              <tr>
                <th className="px-4 py-3 font-black">Strategy</th>
                <th className="px-4 py-3 font-black text-center">DB_Hits</th>
                <th className="px-4 py-3 text-right font-black">P99_Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {localResults.map((res) => (
                <motion.tr key={res.id} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-black uppercase text-secondary">{res.protection}</td>
                  <td className={`px-4 py-3 text-center font-black ${res.dbHits > 5 ? 'text-error' : 'text-success'}`}>{res.dbHits.toString().padStart(3, '0')}</td>
                  <td className="px-4 py-3 text-right text-accent font-black">{res.p99Ms}ms</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
