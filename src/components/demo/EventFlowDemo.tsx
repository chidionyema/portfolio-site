import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCw, Check, ArrowRight, Send, MessagesSquare, Database, Share2, Server, AlertCircle } from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import type { EventFlowEvent } from '../../lib/api/signalr';
import { TraceViewer } from './TraceViewer';

interface OutboxMessage {
  id: string;
  type: string;
  status: 'pending' | 'published' | 'dispatched';
  timestamp: Date;
}

export function EventFlowDemo() {
  const [localOutbox, setLocalOutbox] = useState<OutboxMessage[]>([]);
  const [brokerQueue, setBrokerQueue] = useState<{name: string, depth: number}[]>([
    { name: 'orders.v1', depth: 0 },
    { name: 'inventory.v1', depth: 0 }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTraceId, setActiveTraceId] = useState<string | null>(null);

  const { executeCommand, events, isConnected } = useDemoSession('events');

  useEffect(() => {
     if (events.length > 0) {
        const lastEvent = events[0] as EventFlowEvent;
        
        setLocalOutbox(prev => {
           const exists = prev.find(m => m.id === lastEvent.eventId);
           if (exists) {
              return prev.map(m => m.id === lastEvent.eventId ? { ...m, status: lastEvent.stage === 'consumed' ? 'dispatched' : 'published' } : m);
           }
           return [{
              id: lastEvent.eventId,
              type: 'DemoOutboxEvent',
              status: lastEvent.stage === 'persisted' ? 'pending' : (lastEvent.stage === 'consumed' ? 'dispatched' : 'published'),
              timestamp: new Date(lastEvent.timestamp)
           }, ...prev.slice(0, 10)];
        });

        // Synthetic queue depth increment for the demo
        if (lastEvent.stage === 'relayed') {
           setBrokerQueue(qs => qs.map(q => ({ ...q, depth: Math.min(q.depth + 1, 5) })));
           setTimeout(() => {
              setBrokerQueue(qs => qs.map(q => ({ ...q, depth: Math.max(q.depth - 1, 0) })));
           }, 2000);
        }
     }
  }, [events]);

  const triggerEvent = async () => {
    setIsProcessing(true);
    setActiveTraceId(null);
    try {
      const response = await executeCommand('/events/trigger', {
        eventType: 'DemoOutboxEvent',
        payload: { message: "Atomic Commit Test", triggeredAt: new Date().toISOString() }
      });
      // The response has the eventId but the stream will provide the correlation
    } catch (err) {
    } finally {
       setIsProcessing(false);
    }
  };

  const formatTime = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 1 });

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
            <Database className="w-4 h-4 text-accent" />
            Transactional_Outbox_Engine
          </h3>
        </div>

        <div className="surface p-8 shadow-2xl space-y-8 font-mono">
           <p className="text-secondary text-sm leading-relaxed max-w-md">
              Atomic persistence for business events. <br/>
              Guarantees [At-Least-Once] delivery to RabbitMQ Cluster.
           </p>

           <button
             onClick={triggerEvent}
             disabled={isProcessing || !isConnected}
             className="w-full py-5 bg-white text-black font-black text-sm uppercase rounded-2xl hover:bg-slate-100 transition-all shadow-[0_20px_40px_-12px_rgba(255,255,255,0.2)] disabled:opacity-20 flex items-center justify-center gap-3"
           >
              {isProcessing ? <RotateCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 fill-current" />}
              Commit_Event_Transaction
           </button>

           <AnimatePresence>
             {activeTraceId && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                   <TraceViewer traceId={activeTraceId} />
                </motion.div>
             )}
           </AnimatePresence>

           <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted/40">Database_Outbox_Audit</label>
              <div className="glass-subtle overflow-hidden min-h-[220px]">
                 <table className="w-full text-[10px] border-collapse">
                    <thead className="bg-white/5 border-b border-white/5 text-muted/40 uppercase tracking-widest">
                       <tr>
                          <th className="px-4 py-3 text-left font-black">Event_ID</th>
                          <th className="px-4 py-3 text-left font-black">Status</th>
                          <th className="px-4 py-3 text-right font-black">TS</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                       <AnimatePresence initial={false}>
                          {localOutbox.length === 0 ? (
                             <tr><td colSpan={3} className="py-16 text-center text-muted/20 italic uppercase tracking-[0.4em]">Table_Buffer_Null</td></tr>
                          ) : (
                             localOutbox.map((m) => (
                                <motion.tr key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="group hover:bg-white/[0.02] transition-colors">
                                   <td className="px-4 py-3.5 text-secondary font-bold">{m.id.split('-')[0]}</td>
                                   <td className="px-4 py-3.5">
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-tighter ${m.status === 'pending' ? 'border-warning/30 bg-warning/10 text-warning' : 'border-success/30 bg-success/10 text-success'}`}>
                                         {m.status}
                                      </span>
                                   </td>
                                   <td className="px-4 py-3.5 text-right text-muted/40 tabular-nums">[{formatTime(m.timestamp)}]</td>
                                </motion.tr>
                             ))
                          )}
                       </AnimatePresence>
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
          <Share2 className="w-4 h-4 text-muted" />
          Message_Broker_Cluster_LHR
        </h3>

        <div className="surface shadow-2xl flex flex-col h-full overflow-hidden">
           <div className="p-8 space-y-10 flex-1 uppercase tracking-tighter font-mono">
              <div className="flex items-center gap-6 p-6 glass-subtle">
                 <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                    <Server className="w-7 h-7 text-accent" />
                 </div>
                 <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-xs font-black text-primary tracking-widest">RabbitMQ_Primary</span>
                       <span className="text-[9px] text-success font-bold">HEALTH_OPTIMAL</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                         className="h-full bg-success/60 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                         animate={{ opacity: [1, 0.4, 1] }}
                         transition={{ repeat: Infinity, duration: 2.5 }}
                         style={{ width: '100%' }}
                       />
                    </div>
                 </div>
              </div>

              <div className="space-y-6 px-2">
                 <label className="text-[10px] font-black uppercase tracking-[0.4em] text-muted/30">Exchange_Queue_Depth</label>
                 <div className="space-y-6">
                    {brokerQueue.map(q => (
                       <div key={q.name} className="space-y-3">
                          <div className="flex justify-between items-center">
                             <span className="text-secondary font-bold tracking-widest">{q.name}</span>
                             <span className={q.depth > 0 ? 'text-warning font-black scale-110' : 'text-muted/20'}>{q.depth.toString().padStart(2, '0')} MSG</span>
                          </div>
                          <div className="h-1.5 bg-white/[0.02] border border-white/5 rounded-full overflow-hidden">
                             <motion.div 
                               className="h-full bg-accent/60"
                               animate={{ width: `${Math.min(q.depth * 25, 100)}%` }}
                               transition={{ type: 'spring', stiffness: 50 }}
                             />
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

              <div className="pt-10 border-t border-white/5 flex flex-col items-center justify-center space-y-6 opacity-30 text-center grayscale">
                 <MessagesSquare className="w-12 h-12 text-muted" strokeWidth={1} />
                 <p className="text-[10px] text-muted max-w-[220px] leading-relaxed uppercase font-bold tracking-widest">
                    Relay_Active // ID: RL_8F2B // Lock: Node_LHR_01
                 </p>
              </div>
           </div>
           
           <div className="p-5 bg-white/[0.02] border-t border-white/5 flex items-center justify-between font-mono text-[9px] font-black uppercase tracking-widest">
              <span className="text-muted/60">Cluster: cloudamqp_lhr_stable</span>
              <div className="flex items-center gap-2 text-success">
                 <div className="w-1 h-1 bg-success rounded-full" />
                 Synchronized
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
