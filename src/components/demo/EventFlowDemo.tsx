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
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Heading } from '../ui/Heading';
import { Stack } from '../ui/Stack';
import { Pill } from '../ui/Pill';
import { Glass } from '../ui/Glass';
import { cn } from '../../lib/utils';
import { CLUSTER_LABEL } from '../../lib/copy';
import { RequestReceiptHistory } from './RequestReceipt';
import type { EventFlowEvent } from '../../lib/api/signalr';
import type { RequestMetadata } from '../../lib/api/demo-client';

const API_URL = import.meta.env.PUBLIC_API_URL ?? '';

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
    <div className="grid lg:grid-cols-2 gap-12">
      <Stack gap={6}>
        <div className="flex items-center justify-between">
          <Heading variant="caption" className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-accent" />
            Transactional outbox
          </Heading>
          <Pill variant={relay.isPaused ? 'warning' : 'success'}>
            Relay {relay.isPaused ? `paused (${relay.queuedCount})` : 'live'}
          </Pill>
        </div>

        <Card variant="panel-dark" padding="lg">
          <Stack gap={8} className="font-mono">
            <p className="text-secondary text-sm leading-relaxed max-w-md">
              Atomic persistence for business events. <br />
              Guarantees [At-Least-Once] delivery to RabbitMQ Cluster.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="primary"
                onClick={triggerEvent}
                disabled={isProcessing}
                className="w-full h-auto py-4 font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2"
              >
                {isProcessing ? <RotateCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Commit event
              </Button>
              <Button
                variant="secondary"
                onClick={toggleRelay}
                disabled={isToggling}
                className={cn(
                  "w-full h-auto py-4 font-black text-xs uppercase tracking-widest rounded-2xl border transition-all flex items-center justify-center gap-2",
                  relay.isPaused ? "bg-success/10 border-success/30 text-success" : "bg-warning/10 border-warning/30 text-warning"
                )}
              >
                {isToggling ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : relay.isPaused ? (
                  <Play className="w-4 h-4" />
                ) : (
                  <Pause className="w-4 h-4" />
                )}
                {relay.isPaused ? 'Resume relay' : 'Pause relay'}
              </Button>
            </div>

            <AnimatePresence>
              {relay.isPaused && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-5 rounded-xl border border-warning/20 bg-warning/5 flex items-center gap-4"
                >
                  <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="text-[10px] font-black text-warning uppercase tracking-[0.25em]">
                      Relay paused
                    </div>
                    <div className="text-[10px] text-secondary/90 leading-relaxed uppercase">
                      Broker unreachable. New events are buffered locally.
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] uppercase tracking-widest text-secondary/90">Queued</div>
                    <div className="text-2xl font-black text-warning tabular-nums">{relay.queuedCount}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Stack gap={4}>
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary/90">
                Outbox table
              </label>
              <Glass intensity="low" className="overflow-hidden min-h-[220px] bg-white/10 border-none">
                <table className="w-full text-[10px] border-collapse">
                  <thead className="bg-white/10 border-b border-white/5 text-secondary/90 uppercase tracking-widest font-black">
                    <tr>
                      <th className="px-4 py-3 text-left">Event ID</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">TS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    <AnimatePresence initial={false}>
                      {outbox.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-16 text-center text-secondary/90 italic uppercase tracking-[0.4em]">
                            Waiting for commit...
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
                            <td className="px-4 py-3.5 text-secondary font-bold font-mono">{m.id.split('-')[0]}</td>
                            <td className="px-4 py-3.5">
                              <Pill variant={m.status === 'pending' ? 'warning' : m.status === 'published' ? 'status' : 'success'}>
                                {m.status}
                              </Pill>
                            </td>
                            <td className="px-4 py-3.5 text-right text-secondary/90 tabular-nums">
                              [{formatTime(m.timestamp)}]
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </Glass>
            </Stack>
          </Stack>
        </Card>
      </Stack>

      <Stack gap={6}>
        <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
          <Share2 className="w-4 h-4 text-muted" />
          Message broker
        </h3>

        <Card variant="panel-dark" padding="none" className="flex flex-col h-full overflow-hidden shadow-2xl">
          <div className="p-8 space-y-10 flex-1 uppercase tracking-tighter font-mono">
            <div
              className={cn(
                "flex items-center gap-6 p-6 rounded-2xl glass-subtle transition-colors",
                relay.isPaused ? "border border-warning/20 bg-warning/5" : "bg-white/10 border border-white/10"
              )}
            >
              <div
                className={cn(
                  "p-3 rounded-2xl border",
                  relay.isPaused
                    ? "bg-warning/10 border-warning/30 text-warning"
                    : "bg-accent/10 border-accent/30 text-accent"
                )}
              >
                {relay.isPaused ? <Power className="w-7 h-7" /> : <Server className="w-7 h-7" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-primary tracking-widest">RabbitMQ_Primary</span>
                  <span
                    className={cn(
                      "text-[9px] font-bold",
                      relay.isPaused ? 'text-warning' : 'text-success'
                    )}
                  >
                    {relay.isPaused ? 'RELAY_DISCONNECTED' : 'HEALTH_OPTIMAL'}
                  </span>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className={cn(
                      "h-full",
                      relay.isPaused
                        ? 'bg-warning/60 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                        : 'bg-success/60 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                    )}
                    animate={{ opacity: relay.isPaused ? [0.3, 0.6, 0.3] : [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: relay.isPaused ? 1.4 : 2.5 }}
                    style={{ width: relay.isPaused ? '20%' : '100%' }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6 px-2">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-secondary/90">
                Queue depth
              </label>
              <div className="space-y-6">
                {brokerQueue.map((q) => (
                  <div key={q.name} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-secondary font-bold tracking-widest">{q.name}</span>
                      <span
                        className={cn(
                          "font-black tabular-nums",
                          q.depth > 0 ? 'text-warning' : 'text-secondary/90'
                        )}
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
                className={cn(
                  "w-2 h-2 rounded-full animate-pulse shadow-[0_0_12px_currentColor]",
                  relay.isPaused ? "bg-warning" : "bg-success"
                )}
              />
              <p
                className={cn(
                  "text-[10px] max-w-[260px] leading-relaxed uppercase font-bold tracking-widest",
                  relay.isPaused ? 'text-warning' : 'text-muted'
                )}
              >
                {relay.isPaused
                  ? `Relay_Suspended // Buffered: ${relay.queuedCount}`
                  : `Relay_Active // ID: RL_8F2B // Lock: Node_${CLUSTER_LABEL}`}
              </p>
            </div>
          </div>

          <div className="p-5 bg-white/[0.02] border-t border-white/5 flex items-center justify-between font-mono text-[9px] font-black uppercase tracking-widest">
            <span className="text-secondary/90">Cluster: cloudamqp_${CLUSTER_LABEL}</span>
            <div
              className={cn("flex items-center gap-2", relay.isPaused ? 'text-warning' : 'text-success')}
            >
              <div
                className={cn("w-1.5 h-1.5 rounded-full", relay.isPaused ? 'bg-warning' : 'bg-success')}
              />
              {relay.isPaused ? 'Holding' : 'Synchronized'}
            </div>
          </div>
        </Card>
      </Stack>
    </div>
  );
}
