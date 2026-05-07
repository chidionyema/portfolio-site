import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gauge, Timer, Activity, Database, AlertCircle, TrendingUp, BarChart3 } from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import type { RateLimitEvent } from '../../lib/api/signalr';
import { CLUSTER_LABEL } from '../../lib/copy';
import { RequestReceiptHistory } from './RequestReceipt';
import type { RequestMetadata } from '../../lib/api/demo-client';

interface RequestLog {
  id: string;
  timestamp: Date;
  status: 'allowed' | 'limited';
  remaining: number;
}
export function RateLimiterDemo() {
  const [tokens, setTokens] = useState(12);
  const [displayTokens, setDisplayTokens] = useState(12);
  const [limit, setLimit] = useState(12);
  const windowSeconds = 60;
  const [localRequests, setLocalRequests] = useState<RequestLog[]>([]);
  const [retryAfter, setRetryAfter] = useState(0);
  const [resetAt, setResetAt] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<RequestMetadata[]>([]);
  const [lastAction, setLastAction] = useState<{ label: string; tooltip: string } | null>(null);

  const { executeCommand, events } = useDemoSession('ratelimit');

  useEffect(() => {
     if (events.length > 0) {
        const lastEvent = events[0] as RateLimitEvent;
        setTokens(lastEvent.remaining);
        if (lastEvent.retryAfterSeconds) setRetryAfter(lastEvent.retryAfterSeconds);
     }
  }, [events]);

  useEffect(() => {
    if (displayTokens === tokens) return;
    const timeout = setTimeout(() => {
      setDisplayTokens(prev => prev > tokens ? prev - 1 : prev + 1);
    }, 50);
    return () => clearTimeout(timeout);
  }, [tokens, displayTokens]);

  useEffect(() => {
    if (retryAfter <= 0) return;
    const interval = setInterval(() => setRetryAfter(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(interval);
  }, [retryAfter]);

  const sendRequest = useCallback(async () => {
    const start = new Date();
    try {
      const result = await executeCommand('/ratelimit/request');
      setReceipts(prev => [result, ...prev].slice(0, 10));

      setLocalRequests(prev => [{
        id: crypto.randomUUID(),
        timestamp: start,
        status: result.allowed ? 'allowed' : 'limited',
        remaining: result.bucket.remaining
      }, ...prev.slice(0, 15)]);
      
      setTokens(result.bucket.remaining);
      setLimit(result.bucket.limit);
      
      if (result.allowed) {
        setLastAction({
          label: `Token consumed: ${result.bucket.remaining} of ${result.bucket.limit} left.`,
          tooltip: "Each request 'spends' a token. Tokens refill at a steady rate."
        });
      } else {
        setLastAction({
          label: `Rate-limited. Retry in ${result.bucket.retryAfterSeconds}s.`,
          tooltip: "The server is telling the client how long to wait before trying again."
        });
      }

      if (result.bucket.retryAfterSeconds) setRetryAfter(result.bucket.retryAfterSeconds);
      if (result.bucket.resetAt) setResetAt(result.bucket.resetAt);
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
      await new Promise(r => setTimeout(r, 50));
    }
  };

  const formatTime = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 1 });

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
              <Gauge className="w-4 h-4 text-accent" />
              A bot is hammering your form. How do you stop it without making genuine customers wait?
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Press <strong>Mash for 5 seconds</strong>. Watch the token bucket drain. The third or fourth click into the spam, you'll see the rate-limit response come back instead of a success.
            </p>
          </div>
        </div>

        <div className="surface p-8 shadow-2xl relative overflow-hidden space-y-10">
           <div className="flex items-center justify-between">
              <div className="space-y-1">
                 <div className="text-lg font-bold text-primary">Token bucket</div>
                 <div className="text-xs text-muted font-medium opacity-60">Redis-backed Sliding Window Throttling</div>
              </div>
              <div className="text-right flex flex-col items-end">
                 <div className="text-[10px] uppercase font-black text-muted tracking-[0.2em] mb-1">Bucket Status</div>
                 <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${tokens > 0 ? 'bg-success/20 text-success' : 'bg-error/20 text-error animate-pulse'}`}>
                    {tokens > 0 ? 'Available' : 'Exhausted'}
                 </div>
              </div>
           </div>

           <div className="relative">
             <div className="flex flex-wrap gap-2.5 justify-center py-6 glass-subtle rounded-2xl border border-white/5">
                {[...Array(limit)].map((_, i) => (
                   <motion.div
                     key={i}
                     animate={{ 
                       backgroundColor: i < displayTokens ? '#22c55e' : 'rgba(255,255,255,0.05)',
                       scale: i < displayTokens ? 1 : 0.7,
                       opacity: i < displayTokens ? 1 : 0.15
                     }}
                     transition={{ duration: 0.15 }}
                     className="w-6 h-6 rounded-full border border-white/10 shadow-lg"
                   />
                ))}
             </div>
             
             <AnimatePresence>
               {lastAction && (
                 <motion.div
                   key={lastAction.label}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0 }}
                   onAnimationComplete={() => setTimeout(() => setLastAction(null), 2000)}
                   className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-accent-light bg-accent/5 px-2 py-1 border border-accent/20"
                 >
                   <abbr title={lastAction.tooltip} className="no-underline cursor-help">
                     {lastAction.label}
                   </abbr>
                 </motion.div>
               )}
             </AnimatePresence>
           </div>

           <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="grid grid-cols-3 gap-2">
                 <button 
                   onClick={() => sendBurst(1)}
                   disabled={retryAfter > 0}
                   className="py-3 px-4 glass rounded-xl text-[10px] font-black uppercase tracking-widest text-muted hover:text-primary transition-all disabled:opacity-20"
                 >
                    Send 1
                 </button>
                 <button 
                   onClick={() => sendBurst(5)}
                   disabled={retryAfter > 0}
                   className="py-3 px-4 glass rounded-xl text-[10px] font-black uppercase tracking-widest text-muted hover:text-warning transition-all disabled:opacity-20"
                 >
                    Send 5
                 </button>
                 <button 
                   onClick={() => sendBurst(12)}
                   disabled={retryAfter > 0}
                   className="py-3 px-4 glass rounded-xl text-[10px] font-black uppercase tracking-widest text-muted hover:text-error transition-all disabled:opacity-20"
                 >
                    Mash for 5s
                 </button>
              </div>

              <RequestReceiptHistory receipts={receipts} />

              <AnimatePresence mode="wait">
                {retryAfter > 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                    className="p-6 bg-error/10 border border-error/20 rounded-2xl shadow-xl space-y-5"
                  >
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-error text-[11px] font-black uppercase tracking-[0.2em]">
                           <div className="relative">
                              <AlertCircle className="w-5 h-5" />
                              <motion.div 
                                 animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                                 transition={{ repeat: Infinity, duration: 2 }}
                                 className="absolute inset-0 bg-error rounded-full -z-10"
                              />
                           </div>
                           HTTP 429 — Rate Limit Exceeded
                        </div>
                        <div className="flex flex-col items-end">
                           <span className="font-mono text-xl font-black text-error tabular-nums leading-none">{retryAfter}s</span>
                           <span className="text-[9px] uppercase font-bold text-error/60 tracking-widest mt-1">Retry after</span>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <div className="h-2 bg-error/10 rounded-full overflow-hidden border border-error/5">
                           <motion.div 
                             className="h-full bg-gradient-to-r from-error to-error/60 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                             initial={{ width: '0%' }}
                             animate={{ width: `${(1 - retryAfter / windowSeconds) * 100}%` }}
                             transition={{ duration: 1, ease: 'linear' }}
                           />
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-mono text-error/40 uppercase tracking-tighter">
                           <span className="flex items-center gap-1">
                             <abbr title="" className="no-underline">Tokens refilling at 1/second.</abbr>
                           </span>
                           <span>{resetAt ? new Date(resetAt).toLocaleTimeString() : '—'}</span>
                        </div>
                     </div>
                     
                     <div className="pt-4 border-t border-error/10 text-xs text-error-light leading-relaxed">
                        ✓ The bot's spam was blocked from the 6th request onward; the server told it to retry in 5 seconds. <strong>Without this pattern</strong>, the bot consumes all your downstream capacity and your real customers see slow checkouts (or, worse, errors that look like a service outage).
                     </div>
                  </motion.div>
                ) : receipts.length > 0 && tokens > 0 && (
                   <motion.div
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     className="p-4 border border-success/30 bg-success/5 text-success-light text-xs font-mono"
                   >
                     ✓ Traffic allowed. System capacity stable.
                   </motion.div>
                )}
              </AnimatePresence>
           </div>
        </div>

        <div className="pt-8 border-t border-white/5 font-mono text-[10px] text-muted/50 uppercase tracking-widest">
          Pattern: token-bucket rate limiting. Code: <code>src/BffWeb/BffWeb.Api/Controllers/DemoController.cs</code> (RateLimit handler).
          Limits per-session, not global — abusers don't poison everyone's capacity.
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
          <BarChart3 className="w-4 h-4 text-muted" />
          Request log
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
                    <tr className="text-muted/60 uppercase text-[9px] font-black tracking-widest">
                       <th className="px-6 py-3">Timestamp</th>
                       <th className="px-6 py-3">Result</th>
                       <th className="px-6 py-3 text-right">TKNS_REM</th>
                    </tr>
                 </thead>
                 <tbody>
                   <AnimatePresence initial={false}>
                     {localRequests.length === 0 ? (
                       <tr><td colSpan={3} className="py-24 text-center text-muted/20 italic uppercase tracking-[0.4em] font-black">No traffic yet — fire some requests.</td></tr>
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
                Kernel: sliding window // Provider: Redis cluster // Region: {CLUSTER_LABEL}
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
