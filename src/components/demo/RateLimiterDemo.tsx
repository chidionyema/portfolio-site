import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gauge, Timer, Activity, Database, AlertCircle, TrendingUp, BarChart3 } from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import type { RateLimitEvent } from '../../lib/api/signalr';

interface RequestLog {
  id: string;
  timestamp: Date;
  status: 'allowed' | 'limited';
  remaining: number;
}

export function RateLimiterDemo() {
  const [tokens, setTokens] = useState(5);
  const maxTokens = 5;
  const windowSeconds = 60;
  const [localRequests, setLocalRequests] = useState<RequestLog[]>([]);
  const [retryAfter, setRetryAfter] = useState(0);

  const { executeCommand, events, isConnected } = useDemoSession('ratelimit');

  useEffect(() => {
     if (events.length > 0) {
        const lastEvent = events[0] as RateLimitEvent;
        setTokens(lastEvent.remaining);
        if (lastEvent.retryAfterSeconds) setRetryAfter(lastEvent.retryAfterSeconds);
     }
  }, [events]);

  useEffect(() => {
    if (retryAfter <= 0) return;
    const interval = setInterval(() => setRetryAfter(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(interval);
  }, [retryAfter]);

  const sendRequest = useCallback(async () => {
    const start = new Date();
    try {
      const result = await executeCommand('/ratelimit/request');
      setLocalRequests(prev => [{
        id: crypto.randomUUID(),
        timestamp: start,
        status: result.allowed ? 'allowed' : 'limited',
        remaining: result.remaining
      }, ...prev.slice(0, 15)]);
      
      setTokens(result.remaining);
      if (result.retryAfter) setRetryAfter(result.retryAfter);
    } catch (err: any) {
       if (err.status === 429) {
          setLocalRequests(prev => [{
            id: crypto.randomUUID(),
            timestamp: start,
            status: 'limited',
            remaining: 0
          }, ...prev.slice(0, 15)]);
          setTokens(0);
       }
    }
  }, [executeCommand]);

  const sendBurst = async (count: number) => {
    for (let i = 0; i < count; i++) {
      sendRequest();
      await new Promise(r => setTimeout(r, 120));
    }
  };

  const formatTime = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 1 });

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
            <Gauge className="w-4 h-4 text-accent" />
            Gateway_Traffic_Control
          </h3>
        </div>

        <div className="surface p-8 shadow-2xl relative overflow-hidden space-y-10">
           <div className="flex items-center justify-between">
              <div className="space-y-1">
                 <div className="text-lg font-bold text-primary">Token_Bucket_Reservoir</div>
                 <div className="text-xs text-muted font-medium opacity-60">Redis-backed Sliding Window Throttling</div>
              </div>
              <div className="text-right">
                 <div className={`text-4xl font-mono font-black ${tokens > 2 ? 'text-primary' : 'text-error animate-pulse'} tabular-nums leading-none mb-1`}>
                    {tokens.toString().padStart(2, '0')}
                 </div>
                 <div className="text-[10px] uppercase font-bold text-muted tracking-widest">Available_TKNS</div>
              </div>
           </div>

           <div className="flex gap-1.5 justify-center h-10">
              {[...Array(maxTokens)].map((_, i) => (
                 <motion.div
                   key={i}
                   animate={{ 
                     backgroundColor: i < tokens ? '#22c55e' : 'rgba(255,255,255,0.05)',
                     opacity: i < tokens ? 0.6 : 1
                   }}
                   className="flex-1 rounded-[4px] border border-white/5 shadow-inner"
                 />
              ))}
           </div>

           <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="grid grid-cols-3 gap-2">
                 <button 
                   onClick={() => sendBurst(1)}
                   disabled={retryAfter > 0 || !isConnected}
                   className="py-3 px-4 glass rounded-xl text-[10px] font-black uppercase tracking-widest text-muted hover:text-primary transition-all disabled:opacity-20"
                 >
                    CMD_SINGLE
                 </button>
                 <button 
                   onClick={() => sendBurst(5)}
                   disabled={retryAfter > 0 || !isConnected}
                   className="py-3 px-4 glass rounded-xl text-[10px] font-black uppercase tracking-widest text-muted hover:text-warning transition-all disabled:opacity-20"
                 >
                    CMD_BURST_5
                 </button>
                 <button 
                   onClick={() => sendBurst(12)}
                   disabled={retryAfter > 0 || !isConnected}
                   className="py-3 px-4 glass rounded-xl text-[10px] font-black uppercase tracking-widest text-muted hover:text-error transition-all disabled:opacity-20"
                 >
                    CMD_FLOOD
                 </button>
              </div>

              <AnimatePresence>
                {retryAfter > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="p-5 bg-error/10 border border-error/20 rounded-2xl space-y-4"
                  >
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-error text-[11px] font-black uppercase tracking-widest">
                           <AlertCircle className="w-4 h-4" />
                           HTTP_429_Rate_Limit_Exceeded
                        </div>
                        <span className="font-mono text-sm font-black text-error tabular-nums">{retryAfter}s</span>
                     </div>
                     <div className="h-1 bg-error/20 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-error shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                          initial={{ width: '100%' }}
                          animate={{ width: `${(retryAfter / windowSeconds) * 100}%` }}
                          transition={{ duration: 1, ease: 'linear' }}
                        />
                     </div>
                  </motion.div>
                )}
              </AnimatePresence>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
           <div className="surface p-5 flex items-center justify-between">
              <TrendingUp className="w-6 h-6 text-success opacity-40" />
              <div className="text-right">
                 <div className="text-2xl font-black text-primary tabular-nums tracking-tighter leading-none">{localRequests.filter(r => r.status === 'allowed').length}</div>
                 <div className="text-[9px] uppercase font-bold text-muted tracking-widest mt-1.5 opacity-60">Throughput_OK</div>
              </div>
           </div>
           <div className="surface p-5 flex items-center justify-between">
              <Activity className="w-6 h-6 text-error opacity-40" />
              <div className="text-right">
                 <div className="text-2xl font-black text-primary tabular-nums tracking-tighter leading-none">{localRequests.filter(r => r.status === 'limited').length}</div>
                 <div className="text-[9px] uppercase font-bold text-muted tracking-widest mt-1.5 opacity-60">Rejections_429</div>
              </div>
           </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
          <BarChart3 className="w-4 h-4 text-muted" />
          Ingress_Audit_Telemetry
        </h3>

        <div className="surface shadow-2xl h-[480px] flex flex-col overflow-hidden">
           <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between font-mono text-[10px]">
              <span className="text-muted/60 tracking-widest uppercase font-black">WAF_Policy_Stream</span>
              <div className="flex items-center gap-2 px-2 py-1 glass-subtle border border-white/5 rounded-lg">
                 <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,1)]" />
                 <span className="text-[9px] font-black text-secondary uppercase">Active</span>
              </div>
           </div>
           
           <div className="flex-1 overflow-y-auto font-mono text-[11px]">
              <table className="w-full text-left border-collapse">
                 <thead className="sticky top-0 bg-[#0d0d12] border-b border-white/10 z-10">
                    <tr className="text-muted/40 uppercase text-[9px] font-black tracking-widest">
                       <th className="px-6 py-3">Timestamp</th>
                       <th className="px-6 py-3">Result</th>
                       <th className="px-6 py-3 text-right">TKNS_REM</th>
                    </tr>
                 </thead>
                 <tbody>
                   <AnimatePresence initial={false}>
                     {localRequests.length === 0 ? (
                       <tr><td colSpan={3} className="py-24 text-center text-muted/20 italic uppercase tracking-[0.4em] font-black">No_Ingress_Traffic_Detected</td></tr>
                     ) : (
                       localRequests.map((req) => (
                         <motion.tr
                           key={req.id}
                           initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                           className="border-b border-white/[0.02] group hover:bg-white/[0.02] transition-colors"
                         >
                           <td className="px-6 py-4 text-muted/50 text-[10px]">[{formatTime(req.timestamp)}]</td>
                           <td className="px-6 py-4">
                              <span className={`text-[10px] font-black uppercase tracking-tighter ${req.status === 'allowed' ? 'text-success' : 'text-error'}`}>
                                 {req.status === 'allowed' ? '200_SUCCESS' : '429_RATE_LIM'}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-right tabular-nums text-secondary font-bold">
                              {req.remaining}
                           </td>
                         </motion.tr>
                       ))
                     )}
                   </AnimatePresence>
                 </tbody>
              </table>
           </div>
           
           <div className="p-4 glass-subtle border-t border-white/5">
              <p className="text-[10px] text-muted/60 leading-relaxed font-mono uppercase tracking-tighter text-center">
                Kernel: Sliding_Window_L2 // Provider: Redis_Cluster // Region: LHR_01
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
