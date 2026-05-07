import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCw,
  Send,
  Database,
  Share2,
  Server,
  Pause,
  Play,
  Power,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import type { EventFlowEvent } from '../../lib/api/signalr';
import { CLUSTER_LABEL } from '../../lib/copy';
import { RequestReceiptHistory } from './RequestReceipt';
import type { RequestMetadata } from '../../lib/api/demo-client';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:5050';

type OutboxStatus = 'pending' | 'published' | 'dispatched';

interface OutboxMessage {
  id: string;
  status: OutboxStatus;
  timestamp: Date;
  queuedWhilePaused: boolean;
}

interface RelayStatus {
  isPaused: boolean;
  queuedCount: number;
}
export function EventFlowDemo() {
  const [outbox, setOutbox] = useState<OutboxMessage[]>([]);
  const [brokerQueue, setBrokerQueue] = useState<{ name: string; depth: number }[]>([
    { name: 'orders.v1', depth: 0 },
    { name: 'inventory.v1', depth: 0 },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [relay, setRelay] = useState<RelayStatus>({ isPaused: false, queuedCount: 0 });
  const [isToggling, setIsToggling] = useState(false);
  const [receipts, setReceipts] = useState<RequestMetadata[]>([]);
  const [showOutcome, setShowOutcome] = useState(false);

  const { executeCommand, events } = useDemoSession('events');

  // Initial relay status fetch — so a refresh while paused shows the right thing.
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/demo/events/relay-status`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: RelayStatus | null) => {
        if (!cancelled && data) setRelay(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Bridge SignalR events into the outbox table view.
  const lastEventKeyRef = useRef<string>('');
  useEffect(() => {
    if (events.length === 0) return;
    const lastEvent = events[0] as EventFlowEvent;
    const eventKey = `${lastEvent.eventId}-${lastEvent.stage}`;
    if (eventKey === lastEventKeyRef.current) return;
    lastEventKeyRef.current = eventKey;

    setOutbox((prev) => {
      const idx = prev.findIndex((m) => m.id === lastEvent.eventId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          status: lastEvent.stage === 'consumed' ? 'dispatched' : 'published',
        };
        return copy;
      }
      return [
        {
          id: lastEvent.eventId,
          status:
            lastEvent.stage === 'persisted'
              ? 'pending'
              : lastEvent.stage === 'consumed'
              ? 'dispatched'
              : 'published',
          timestamp: new Date(lastEvent.timestamp),
          queuedWhilePaused: false,
        },
        ...prev.slice(0, 11),
      ];
    });

    if (lastEvent.stage === 'consumed') {
       setShowOutcome(true);
    }

    if (lastEvent.stage === 'relayed') {
      setBrokerQueue((qs) => qs.map((q) => ({ ...q, depth: Math.min(q.depth + 1, 5) })));
      setTimeout(() => {
        setBrokerQueue((qs) => qs.map((q) => ({ ...q, depth: Math.max(q.depth - 1, 0) })));
      }, 2000);
    }
  }, [events]);

  const triggerEvent = async () => {
    setIsProcessing(true);
    setShowOutcome(false);
    try {
      const result = await executeCommand('/events/trigger', {
        eventType: 'DemoOutboxEvent',
        payload: { message: 'Atomic Commit Test', triggeredAt: new Date().toISOString() },
      });
      setReceipts(prev => [result, ...prev].slice(0, 10));
      if (result?.queuedCount !== undefined) {
        setRelay({ isPaused: true, queuedCount: result.queuedCount });
      }
    } catch {
      /* surfaced via UI elsewhere */
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleRelay = async () => {
    setIsToggling(true);
    try {
      const result = await executeCommand('/events/relay-pause', {
        paused: !relay.isPaused,
      });
      setReceipts(prev => [result, ...prev].slice(0, 10));
      if (result) {
        setRelay({ isPaused: !!result.isPaused, queuedCount: result.queuedCount ?? 0 });
      }
    } catch {
      /* keep prior state */
    } finally {
      setIsToggling(false);
    }
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 1,
    });

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
            <Database className="w-4 h-4 text-accent" />
            The database was updated successfully, but the confirmation email never sent. How do you ensure your side effects are as reliable as your data?
          </h3>
          <p className="text-xs text-muted leading-relaxed">
            Press <strong>Trigger event</strong>. Watch the event advance through the three stages: Persisted (in the outbox table), Relayed (to RabbitMQ), and Consumed (by the worker).
          </p>
        </div>

        <div className="surface p-8 shadow-2xl space-y-8 font-mono relative">
          <div className="flex justify-between items-center">
             <div className="text-[10px] font-black uppercase tracking-widest opacity-40">Persistence_Buffer</div>
             <RelayPill relay={relay} />
          </div>

          <div className="space-y-3">
             <button
               onClick={toggleRelay}
               disabled={isToggling}
               title={
                 relay.isPaused
                   ? 'Resumes the relay. Buffered events drain in FIFO order to the broker.'
                   : 'Stops dispatching events to the broker. Triggers fire normally but stay in a local buffer until you resume.'
               }
               className={`focus-ring w-full py-5 font-black text-sm uppercase tracking-[0.3em] rounded-2xl border-2 transition-all disabled:opacity-30 flex items-center justify-center gap-3 shadow-lg hover:scale-[1.02] active:scale-95 ${
                 relay.isPaused
                   ? 'bg-success text-white border-success shadow-[0_10px_30px_-5px_rgba(34,197,94,0.5)]'
                   : 'bg-warning/10 border-warning/30 text-warning hover:bg-warning/15'
               }`}
             >
               {isToggling ? (
                 <RotateCw className="w-5 h-5 animate-spin" />
               ) : relay.isPaused ? (
                 <Play className="w-5 h-5 fill-current" />
               ) : (
                 <Pause className="w-5 h-5 fill-current" />
               )}
               {relay.isPaused ? 'Resume_Relay' : 'Suspend_Relay'}
             </button>

             <button
               onClick={triggerEvent}
               disabled={isProcessing}
               className="focus-ring w-full py-4 bg-white/5 border border-white/10 text-muted font-black text-xs uppercase rounded-xl tracking-widest hover:text-primary hover:bg-white/10 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
             >
               {isProcessing ? <RotateCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
               Trigger event
             </button>
          </div>

          <RequestReceiptHistory receipts={receipts} />

          <AnimatePresence>
            {relay.isPaused && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass-subtle p-6 border border-warning/20 rounded-2xl shadow-xl space-y-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="relative">
                        <AlertTriangle className="w-5 h-5 text-warning" />
                        <motion.div 
                           animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                           transition={{ repeat: Infinity, duration: 2 }}
                           className="absolute inset-0 bg-warning rounded-full -z-10"
                        />
                     </div>
                     <div className="text-[10px] font-black text-warning uppercase tracking-[0.25em]">
                        Relay Suspended
                     </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="font-mono text-xl font-black text-warning tabular-nums leading-none">{relay.queuedCount}</span>
                    <span className="text-[8px] uppercase tracking-widest text-warning/60 font-bold mt-1">Events_Queued</span>
                  </div>
                </div>

                <div className="space-y-2">
                   <div className="h-3 bg-warning/5 rounded-full overflow-hidden border border-warning/10 relative">
                      {/* Threshold Markers */}
                      <div className="absolute inset-0 px-1 pointer-events-none">
                         {[10, 50].map(t => (
                            <div key={t} className="absolute top-0 bottom-0 w-px bg-warning/20" style={{ left: `${t}%` }}>
                               <span className="absolute top-full mt-1 -translate-x-1/2 text-[6px] font-black text-warning/30">{t}</span>
                            </div>
                         ))}
                         <div className="absolute right-0 top-0 bottom-0 w-px bg-warning/40">
                            <span className="absolute top-full mt-1 -translate-x-full pr-1 text-[6px] font-black text-warning/50">100</span>
                         </div>
                      </div>

                      <motion.div
                        className="h-full bg-gradient-to-r from-warning to-warning/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                        initial={{ width: '0%' }}
                        animate={{ width: `${Math.min((relay.queuedCount / 100) * 100, 100)}%` }}
                        transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                      />
                   </div>
                   <div className="flex justify-between items-center text-[8px] font-mono text-warning/40 uppercase tracking-tighter pt-3">
                      <span>Broker unreachable…</span>
                      <span>Backlog_Saturation</span>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
               <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted/60">
                 Event Lifecycle
               </label>
               <span className="text-[9px] font-mono text-muted/40 uppercase">Recent_5_Cycles</span>
            </div>
            <div className="space-y-3 min-h-[300px]">
               <AnimatePresence initial={false}>
                 {outbox.length === 0 ? (
                   <div className="py-20 text-center glass-subtle rounded-2xl border border-dashed border-white/5">
                      <p className="text-[10px] font-mono text-muted/20 italic uppercase tracking-[0.4em]">Awaiting_First_Trigger…</p>
                   </div>
                 ) : (
                   outbox.slice(0, 5).map((m) => (
                     <motion.div
                       key={m.id}
                       initial={{ opacity: 0, x: -20 }}
                       animate={{ opacity: 1, x: 0 }}
                       className="glass-subtle p-4 rounded-2xl border border-white/5 space-y-4 group relative"
                     >
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_5px_rgba(99,102,241,0.5)]" />
                             <span className="text-[10px] font-mono font-bold text-secondary">ID: {m.id.split('-')[0]}</span>
                          </div>
                          <span className="text-[9px] text-muted/40 tabular-nums">{formatTime(m.timestamp)}</span>
                       </div>

                       <div className="flex items-center gap-2">
                          {[
                             { id: 'persisted', label: 'Persisted', active: true, inFlight: m.status === 'pending', patternLabel: "Outbox: event saved in the same transaction as your data.", patternTooltip: "Atomic. If the DB update succeeds, the event is guaranteed to be there. If it fails, no event is sent." },
                             { id: 'relayed', label: 'Relayed', active: m.status === 'published' || m.status === 'dispatched', inFlight: m.status === 'published', patternLabel: "Relayed: background publisher sent to RabbitMQ.", patternTooltip: "At-least-once delivery. The publisher won't delete the outbox row until the broker acks." },
                             { id: 'consumed', label: 'Consumed', active: m.status === 'dispatched', inFlight: false, patternLabel: "Consumed: worker processed the side effect.", patternTooltip: "" }
                          ].map((stage, idx, arr) => (
                             <div key={stage.id} className="flex-1 flex items-center gap-2">
                                <div className="flex-1 space-y-1.5">
                                   <div className={`h-1 rounded-full transition-all duration-500 ${stage.active ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-white/5'}`} />
                                   <div className={`text-[8px] font-black uppercase tracking-tighter transition-colors ${stage.active ? 'text-success' : 'text-muted/20'}`}>
                                      {stage.label}
                                   </div>
                                   {stage.inFlight && (
                                     <motion.div 
                                       initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                       className="absolute top-0 right-0 -translate-y-full mb-1 bg-accent/5 px-1.5 py-0.5 border border-accent/20 text-[7px] font-bold text-accent-light whitespace-nowrap z-10"
                                     >
                                        <abbr title={stage.patternTooltip} className="no-underline cursor-help">
                                          {stage.patternLabel}
                                        </abbr>
                                     </motion.div>
                                   )}
                                </div>
                                {idx < arr.length - 1 && (
                                   <div className={`text-muted/10 font-bold mb-3 ${stage.active && !arr[idx+1].active ? 'animate-pulse text-accent/20' : ''}`}>→</div>
                                )}
                             </div>
                          ))}
                       </div>
                     </motion.div>
                   ))
                 )}
               </AnimatePresence>
            </div>
          </div>

          <AnimatePresence>
            {showOutcome && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 border border-success/30 bg-success/5 text-primary text-xs leading-relaxed shadow-xl"
              >
                ✓ The side effect (e.g. sending an email) is guaranteed to happen eventually, even if the broker is down when the user clicks save. <strong>Without this pattern</strong>, you send the email directly in your controller; if the SMTP server is slow, your user waits; if the network blips, the email is lost forever.
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="pt-8 border-t border-white/5 font-mono text-[10px] text-muted/50 uppercase tracking-widest">
          Pattern: transactional outbox + worker-side idempotency. Code: <code>src/BuildingBlocks/Outbox/</code>.
          The outbox table acts as a reliable bridge between your relational database and your asynchronous message broker.
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
          <Share2 className="w-4 h-4 text-muted" />
          Message broker
        </h3>

        <div className="surface shadow-2xl flex flex-col h-full overflow-hidden">
          <div className="p-8 space-y-10 flex-1 uppercase tracking-tighter font-mono">
            <div
              className={`flex items-center gap-6 p-6 glass-subtle transition-colors ${
                relay.isPaused ? 'border border-warning/20' : ''
              }`}
            >
              <div
                className={`p-3 rounded-2xl border ${
                  relay.isPaused
                    ? 'bg-warning/10 border-warning/30 text-warning'
                    : 'bg-white/5 border-white/10 text-accent'
                }`}
              >
                {relay.isPaused ? <Power className="w-7 h-7" /> : <Server className="w-7 h-7" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-primary tracking-widest">RabbitMQ_Primary</span>
                  <span
                    className={`text-[9px] font-bold ${
                      relay.isPaused ? 'text-warning' : 'text-success'
                    }`}
                  >
                    {relay.isPaused ? 'RELAY_DISCONNECTED' : 'HEALTH_OPTIMAL'}
                  </span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${
                      relay.isPaused
                        ? 'bg-warning/60 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                        : 'bg-success/60 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                    }`}
                    animate={{ opacity: relay.isPaused ? [0.3, 0.6, 0.3] : [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: relay.isPaused ? 1.4 : 2.5 }}
                    style={{ width: relay.isPaused ? '20%' : '100%' }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6 px-2">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-muted/30">
                Queue depth
              </label>
              <div className="space-y-6">
                {brokerQueue.map((q) => (
                  <div key={q.name} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-secondary font-bold tracking-widest">{q.name}</span>
                      <span
                        className={
                          q.depth > 0 ? 'text-warning font-black scale-110' : 'text-muted/20'
                        }
                      >
                        {q.depth.toString().padStart(2, '0')} MSG
                      </span>
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

            <div className="pt-10 border-t border-white/5 flex flex-col items-center justify-center space-y-3 text-center">
              <div
                className={`w-2 h-2 rounded-full ${
                  relay.isPaused ? 'bg-warning animate-pulse' : 'bg-success animate-pulse'
                } shadow-[0_0_12px_currentColor]`}
              />
              <p
                className={`text-[10px] max-w-[260px] leading-relaxed uppercase font-bold tracking-widest ${
                  relay.isPaused ? 'text-warning' : 'text-muted'
                }`}
              >
                {relay.isPaused
                  ? `Relay_Suspended // Buffered: ${relay.queuedCount}`
                  : `Relay_Active // ID: RL_8F2B // Lock: Node_${CLUSTER_LABEL}`}
              </p>
            </div>
          </div>

          <div className="p-5 bg-white/[0.02] border-t border-white/5 flex items-center justify-between font-mono text-[9px] font-black uppercase tracking-widest">
            <span className="text-muted/60">Cluster: cloudamqp_{CLUSTER_LABEL}</span>
            <div
              className={`flex items-center gap-2 ${relay.isPaused ? 'text-warning' : 'text-success'}`}
            >
              <div
                className={`w-1 h-1 rounded-full ${
                  relay.isPaused ? 'bg-warning' : 'bg-success'
                }`}
              />
              {relay.isPaused ? 'Holding' : 'Synchronized'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RelayPill({ relay }: { relay: RelayStatus }) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
        relay.isPaused
          ? 'border-warning/30 bg-warning/10 text-warning'
          : 'border-success/30 bg-success/10 text-success'
      }`}
    >
      Relay {relay.isPaused ? `paused (${relay.queuedCount})` : 'live'}
    </span>
  );
}
