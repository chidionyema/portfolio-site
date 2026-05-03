import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, Database, RefreshCcw, Key, ShieldCheck, Server, AlertCircle, Zap, Loader2 } from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';

interface RequestLog {
  id: string;
  timestamp: Date;
  status: 'created' | 'duplicate' | 'error';
  cached: boolean;
  key: string;
}

export function IdempotencyDemo() {
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID().split('-')[0].toUpperCase());
  const [localRequests, setLocalRequests] = useState<RequestLog[]>([]);
  const [ordersCreated, setOrdersCreated] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [ttl, setTtl] = useState(0);

  const { executeCommand, events, isConnected, sessionId } = useDemoSession('idempotency');

  const generateKey = () => setIdempotencyKey(crypto.randomUUID().split('-')[0].toUpperCase());

  useEffect(() => {
     if (events.length > 0) {
        const lastEvent = events[0];
        if (lastEvent.action === 'idempotency_check' && lastEvent.resourceId === idempotencyKey) {
           setTtl(600); // 10 min matches backend expectation
        }
     }
  }, [events, idempotencyKey]);

  useEffect(() => {
     if (ttl <= 0) return;
     const interval = setInterval(() => setTtl(t => Math.max(0, t - 1)), 1000);
     return () => clearInterval(interval);
  }, [ttl]);

  const sendRequest = useCallback(async () => {
    setIsLoading(true);
    try {
      // The backend expects X-Idempotency-Key header. 
      // Our executeCommand needs to support custom headers or we use fetch directly.
      const response = await fetch(`${import.meta.env.PUBLIC_API_URL || 'http://localhost:5000'}/api/demo/idempotency/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Demo-Session': sessionId,
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({ action: 'CreateOrder', payload: { item: 'Widget', quantity: 1 } }),
      });

      const result = await response.json();

      const newRequest: RequestLog = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        status: result.isDuplicate ? 'duplicate' : 'created',
        cached: result.isDuplicate,
        key: idempotencyKey,
      };

      setLocalRequests(prev => [newRequest, ...prev.slice(0, 15)]);
      if (!result.isDuplicate) {
        setOrdersCreated(prev => prev + 1);
        setTtl(600);
      }
    } catch (err) {
    } finally {
      setIsLoading(false);
    }
  }, [idempotencyKey, sessionId]);

  const formatTime = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 1 });

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
            <Fingerprint className="w-4 h-4 text-accent" />
            Deterministic_Identity_Subsystem
          </h3>
        </div>

        <div className="surface p-8 shadow-2xl space-y-10 font-mono">
           <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-muted/40">Request_Header: X-Idempotency-Key</label>
              <div className="flex gap-2 p-1 bg-white/5 border border-white/5 rounded-2xl">
                 <div className="flex-1 bg-black/40 px-6 py-4 rounded-xl font-mono text-base text-primary flex items-center justify-between shadow-inner">
                    <span className="font-bold tracking-widest">{idempotencyKey}</span>
                    <Key className="w-5 h-5 opacity-20" />
                 </div>
                 <button 
                   onClick={generateKey}
                   disabled={isLoading}
                   className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-20"
                 >
                    <RefreshCcw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                 </button>
              </div>
           </div>

           <button
             onClick={sendRequest}
             disabled={isLoading || !isConnected}
             className="w-full py-5 bg-white text-black font-black text-sm uppercase rounded-2xl hover:bg-slate-100 transition-all shadow-[0_20px_40px_-12px_rgba(255,255,255,0.2)] disabled:opacity-20 flex items-center justify-center gap-3"
           >
             {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
             Execute_Atomic_Transaction
           </button>

           <div className="space-y-6 pt-6 border-t border-white/5">
              <div className="flex items-center justify-between px-2">
                 <div className="flex items-center gap-3">
                    <Database className="w-4 h-4 text-muted/40" />
                    <span className="text-[11px] font-bold text-secondary uppercase tracking-[0.2em]">Distributed_Key_Cache</span>
                 </div>
                 <AnimatePresence>
                    {ttl > 0 && (
                       <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] font-black text-success tracking-widest">KEY_ACTIVE</motion.span>
                    )}
                 </AnimatePresence>
              </div>
              
              <div className="glass-subtle p-6 relative overflow-hidden min-h-[80px] flex flex-col justify-center">
                 {ttl > 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 relative z-10">
                       <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                          <span className="text-secondary opacity-60">IDM_KEY: {idempotencyKey}</span>
                          <span className="text-warning tabular-nums">{ttl}S_TTL</span>
                       </div>
                       <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-success/60 shadow-[0_0_10px_rgba(34,197,94,0.5)]" 
                            initial={{ width: '100%' }}
                            animate={{ width: `${(ttl / 60) * 100}%` }}
                            transition={{ duration: 1, ease: 'linear' }}
                          />
                       </div>
                    </motion.div>
                 ) : (
                    <div className="text-center text-[10px] text-muted/20 font-black uppercase tracking-[0.6em] italic">Cache_Register_Empty</div>
                 )}
              </div>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-6 font-mono">
           <div className="surface p-6 flex flex-col items-center">
              <div className="text-3xl font-black text-primary tabular-nums tracking-tighter leading-none">{localRequests.length.toString().padStart(2, '0')}</div>
              <div className="text-[9px] uppercase font-bold text-muted tracking-widest mt-2">Total_Requests</div>
           </div>
           <div className="surface p-6 flex flex-col items-center">
              <div className="text-3xl font-black text-success tabular-nums tracking-tighter leading-none">{ordersCreated.toString().padStart(2, '0')}</div>
              <div className="text-[9px] uppercase font-bold text-muted tracking-widest mt-2">Unique_Commits</div>
           </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
          <Server className="w-4 h-4 text-muted" />
          Production_Ledger_Audit
        </h3>

        <div className="surface shadow-2xl h-[520px] flex flex-col overflow-hidden">
           <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between font-mono text-[10px]">
              <span className="text-muted/60 tracking-widest uppercase font-black tracking-[0.2em]">Cluster_Ingress_History</span>
              <Fingerprint className="w-4 h-4 text-accent/20" />
           </div>
           
           <div className="flex-1 overflow-y-auto font-mono text-[11px]">
              <table className="w-full text-left border-collapse">
                 <thead className="sticky top-0 bg-[#0d0d12] border-b border-white/10 z-10 text-muted/40 uppercase text-[10px] font-black tracking-widest">
                    <tr>
                       <th className="px-6 py-4">Timestamp</th>
                       <th className="px-6 py-4">Action</th>
                       <th className="px-6 py-4 text-right">State</th>
                    </tr>
                 </thead>
                 <tbody>
                    <AnimatePresence initial={false}>
                      {localRequests.length === 0 ? (
                        <tr><td colSpan={3} className="py-24 text-center text-muted/20 italic uppercase tracking-[0.4em] font-black">Null_Transaction_Set</td></tr>
                      ) : (
                        localRequests.map((req) => (
                          <motion.tr
                            key={req.id}
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                            className="group border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors"
                          >
                             <td className="px-6 py-4 text-muted/50 text-[10px]">[{formatTime(req.timestamp)}]</td>
                             <td className="px-6 py-4">
                                <span className={`font-black uppercase tracking-tighter ${req.status === 'created' ? 'text-success' : 'text-warning'}`}>
                                   {req.status === 'created' ? 'Commit_New' : 'Duplicate_Blocked'}
                                </span>
                             </td>
                             <td className="px-6 py-4 text-right">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-tighter ${
                                  req.cached ? 'border-warning/30 bg-warning/10 text-warning' : 'border-success/30 bg-success/10 text-success'
                                }`}>
                                  {req.cached ? 'Redis_Hit' : 'DB_Write'}
                                </span>
                             </td>
                          </motion.tr>
                        ))
                      )}
                    </AnimatePresence>
                 </tbody>
              </table>
           </div>
           
           <div className="p-6 glass-subtle border-t border-white/5 font-mono">
              <p className="text-[10px] text-muted/50 leading-relaxed uppercase tracking-widest text-center italic">
                Verified: X-Idempotency-Key validation layer active. Redis_TTL: 600s.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
