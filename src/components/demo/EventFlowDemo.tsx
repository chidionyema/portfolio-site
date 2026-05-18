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
  AppWindow,
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

// Pipeline node IDs in order
type PipelineNode = 'app' | 'outbox' | 'broker' | 'consumer';

interface FlowDot {
  id: string;
  fromNode: PipelineNode;
  toNode: PipelineNode;
}

const PIPELINE_NODES: { id: PipelineNode; label: string; sublabel: string; icon: typeof Database }[] = [
  { id: 'app',      label: 'Application',    sublabel: 'Business logic',   icon: AppWindow },
  { id: 'outbox',   label: 'Outbox Table',   sublabel: 'Postgres',         icon: Database },
  { id: 'broker',   label: 'Message Broker', sublabel: 'RabbitMQ',         icon: Share2 },
  { id: 'consumer', label: 'Consumer',       sublabel: 'MassTransit',      icon: Server },
];

const NODE_SEQUENCE: PipelineNode[] = ['app', 'outbox', 'broker', 'consumer'];

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
  const [activeNode, setActiveNode] = useState<PipelineNode | null>(null);
  const [flowDots, setFlowDots] = useState<FlowDot[]>([]);

  const { executeCommand, events } = useDemoSession('events');

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/demo/events/relay-status`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: RelayStatus | null) => {
        if (!cancelled && data) setRelay(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const spawnFlowDot = (from: PipelineNode, to: PipelineNode) => {
    const dot: FlowDot = { id: crypto.randomUUID(), fromNode: from, toNode: to };
    setFlowDots(prev => [...prev, dot]);
    setTimeout(() => setFlowDots(prev => prev.filter(d => d.id !== dot.id)), 900);
  };

  const lastEventKeyRef = useRef<string>('');
  useEffect(() => {
    if (events.length === 0) return;
    const lastEvent = events[0] as EventFlowEvent;
    const eventKey = `${lastEvent.eventId}-${lastEvent.stage}`;
    if (eventKey === lastEventKeyRef.current) return;
    lastEventKeyRef.current = eventKey;

    // Light up the relevant pipeline node
    if (lastEvent.stage === 'persisted') {
      setActiveNode('outbox');
      spawnFlowDot('app', 'outbox');
      setTimeout(() => setActiveNode(null), 1200);
    } else if (lastEvent.stage === 'relayed') {
      setActiveNode('broker');
      spawnFlowDot('outbox', 'broker');
      setTimeout(() => setActiveNode(null), 1200);
    } else if (lastEvent.stage === 'consumed') {
      setActiveNode('consumer');
      spawnFlowDot('broker', 'consumer');
      setTimeout(() => setActiveNode(null), 1200);
    }

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
    setActiveNode('app');
    setTimeout(() => setActiveNode(null), 600);
    try {
      const result = await executeCommand('/events/trigger', {
        eventType: 'DemoOutboxEvent',
        payload: { message: 'Atomic Commit Test', triggeredAt: new Date().toISOString() },
      });
      setReceipts(prev => [result, ...prev].slice(0, 10));
      if (result?.queuedCount !== undefined) {
        setRelay({ isPaused: true, queuedCount: result.queuedCount });
      }
    } catch (err) {
      console.error('Failed to trigger outbox event', err);
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
    } catch (err) {
      console.error('Failed to toggle relay pause', err);
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
    <div className="space-y-8">
      {/* Pipeline diagram */}
      <Card variant="panel-dark" padding="lg">
        <div className="space-y-3">
          <div className="text-[9px] font-black uppercase tracking-[0.35em] text-muted/60 mb-4">
            Event pipeline
          </div>
          <div className="relative flex items-stretch gap-0">
            {PIPELINE_NODES.map((node, i) => {
              const Icon = node.icon;
              const isActive = activeNode === node.id;
              const isOutbox = node.id === 'outbox';
              const isBrokerLink = i === 2; // connector between outbox and broker
              const connectorPaused = relay.isPaused && i === 1; // arrow after outbox

              return (
                <div key={node.id} className="flex items-center flex-1 min-w-0">
                  {/* Node card */}
                  <motion.div
                    animate={isActive ? { scale: [1, 1.04, 1] } : {}}
                    transition={{ duration: 0.4 }}
                    className={cn(
                      "flex-1 p-3 rounded-xl border-2 transition-all duration-300 text-center relative overflow-hidden",
                      isActive
                        ? 'bg-accent/15 border-accent/60 shadow-[0_0_18px_rgba(99,102,241,0.35)]'
                        : 'bg-white/[0.02] border-white/[0.08]'
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 transition-all duration-300",
                      isActive ? 'bg-accent/20 text-accent' : 'bg-white/5 text-muted/50'
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className={cn(
                      "text-[9px] font-black uppercase tracking-widest transition-colors",
                      isActive ? 'text-accent' : 'text-muted/70'
                    )}>
                      {node.label}
                    </div>
                    <div className="text-[8px] text-muted/40 mt-0.5">{node.sublabel}</div>

                    {/* Queued count badge on outbox node */}
                    {isOutbox && relay.isPaused && relay.queuedCount > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-warning text-[8px] font-black text-black flex items-center justify-center shadow-lg"
                      >
                        {relay.queuedCount}
                      </motion.div>
                    )}

                    {isActive && (
                      <motion.div
                        layoutId="pipeline-active"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </motion.div>

                  {/* Connector arrow (not after last node) */}
                  {i < PIPELINE_NODES.length - 1 && (
                    <div className="flex items-center justify-center w-8 shrink-0 relative">
                      {/* Check if this is the outbox→broker connector and relay is paused */}
                      {i === 1 && relay.isPaused ? (
                        <motion.div
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                          className="text-warning text-[14px] font-black"
                          title="Relay paused — events queued in outbox"
                        >
                          ✕
                        </motion.div>
                      ) : (
                        <span className="text-muted/30 text-[14px]">→</span>
                      )}

                      {/* Animated flow dot */}
                      <AnimatePresence>
                        {flowDots
                          .filter(d => NODE_SEQUENCE.indexOf(d.fromNode) === i)
                          .map(dot => (
                            <motion.div
                              key={dot.id}
                              initial={{ left: '0%', opacity: 1 }}
                              animate={{ left: '100%', opacity: 0 }}
                              transition={{ duration: 0.7, ease: 'easeOut' }}
                              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accent shadow-[0_0_6px_rgba(99,102,241,0.9)]"
                            />
                          ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <AnimatePresence>
            {relay.isPaused && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-[9px] text-center text-warning font-black uppercase tracking-[0.3em] pt-1"
              >
                Outbox → Broker relay suspended · events accumulating in Postgres
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

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
              <span className="text-secondary/90">{`Cluster: cloudamqp_${CLUSTER_LABEL}`}</span>
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
    </div>
  );
}
