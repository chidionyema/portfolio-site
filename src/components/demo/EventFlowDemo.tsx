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

    if (lastEvent.stage === 'relayed') {
      setBrokerQueue((qs) => qs.map((q) => ({ ...q, depth: Math.min(q.depth + 1, 5) })));
      setTimeout(() => {
        setBrokerQueue((qs) => qs.map((q) => ({ ...q, depth: Math.max(q.depth - 1, 0) })));
      }, 2000);
    }
  }, [events]);

  const triggerEvent = async () => {
    setIsProcessing(true);
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
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
            <Database className="w-4 h-4 text-accent" />
            Transactional outbox
          </h3>
          <RelayPill relay={relay} />
        </div>

        <div className="surface p-8 shadow-2xl space-y-8 font-mono">
          <p className="text-secondary text-sm leading-relaxed max-w-md">
            Atomic persistence for business events. <br />
            Guarantees [At-Least-Once] delivery to RabbitMQ Cluster.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={triggerEvent}
              disabled={isProcessing}
              className="focus-ring py-4 bg-white text-black font-black text-xs uppercase rounded-2xl tracking-widest hover:bg-slate-100 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
            >
              {isProcessing ? <RotateCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 fill-current" />}
              Commit event
            </button>
            <button
              onClick={toggleRelay}
              disabled={isToggling}
              title={
                relay.isPaused
                  ? 'Resumes the relay. Buffered events drain in FIFO order to the broker.'
                  : 'Stops dispatching events to the broker. Triggers fire normally but stay in a local buffer until you resume.'
              }
              aria-label={relay.isPaused ? 'Resume relay and drain buffered events' : 'Pause relay and buffer new events locally'}
              className={`focus-ring py-4 font-black text-xs uppercase tracking-widest rounded-2xl border transition-all disabled:opacity-30 flex items-center justify-center gap-2 ${
                relay.isPaused
                  ? 'bg-success/10 border-success/30 text-success hover:bg-success/15'
                  : 'bg-warning/10 border-warning/30 text-warning hover:bg-warning/15'
              }`}
            >
              {isToggling ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : relay.isPaused ? (
                <Play className="w-4 h-4" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
              {relay.isPaused ? 'Resume relay' : 'Pause relay'}
            </button>
          </div>

          <RequestReceiptHistory receipts={receipts} />

          <AnimatePresence>
            {relay.isPaused && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass-subtle p-5 border border-warning/20 flex items-center gap-4"
              >
                <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="text-[10px] font-black text-warning uppercase tracking-[0.25em]">
                    Relay paused
                  </div>
                  <div className="text-[10px] text-muted/80 leading-relaxed">
                    The broker is unreachable. New events are buffered locally and
                    will drain in FIFO order on resume.
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] uppercase tracking-widest text-muted/60">Queued</div>
                  <div className="text-2xl font-black text-warning tabular-nums">{relay.queuedCount}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted/60">
              Outbox table
            </label>
            <div className="glass-subtle overflow-hidden min-h-[220px]">
              <table className="w-full text-[10px] border-collapse">
                <thead className="bg-white/5 border-b border-white/5 text-muted/60 uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3 text-left font-black">Event ID</th>
                    <th className="px-4 py-3 text-left font-black">Status</th>
                    <th className="px-4 py-3 text-right font-black">TS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  <AnimatePresence initial={false}>
                    {outbox.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-16 text-center text-muted/20 italic uppercase tracking-[0.4em]"
                        >
                          Fire a request from the controls above — this log will populate in real-time.
                        </td>
                      </tr>
                    ) : (
                      outbox.map((m) => (
                        <motion.tr
                          key={m.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="group hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-4 py-3.5 text-secondary font-bold">{m.id.split('-')[0]}</td>
                          <td className="px-4 py-3.5">
                            <StatusPill status={m.status} />
                          </td>
                          <td className="px-4 py-3.5 text-right text-muted/60 tabular-nums">
                            [{formatTime(m.timestamp)}]
                          </td>
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

function StatusPill({ status }: { status: OutboxStatus }) {
  const tone =
    status === 'pending'
      ? 'border-warning/30 bg-warning/10 text-warning'
      : status === 'published'
      ? 'border-info/30 bg-info/10 text-info'
      : 'border-success/30 bg-success/10 text-success';
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-tighter ${tone}`}
    >
      {status}
    </span>
  );
}
