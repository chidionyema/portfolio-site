import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Database, MessageSquare, Check, Clock, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';

interface SagaStep {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed';
  duration?: number;
}

interface OutboxMessage {
  id: string;
  type: string;
  status: 'pending' | 'published';
  createdAt: Date;
}

interface QueueMessage {
  id: string;
  queue: string;
  count: number;
}

export function EventFlowDemo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [sagaSteps, setSagaSteps] = useState<SagaStep[]>([
    { id: '1', name: 'Checkout Started', status: 'pending' },
    { id: '2', name: 'Stock Reserved', status: 'pending' },
    { id: '3', name: 'Payment Created', status: 'pending' },
    { id: '4', name: 'Order Complete', status: 'pending' },
  ]);
  const [outboxMessages, setOutboxMessages] = useState<OutboxMessage[]>([]);
  const [queueDepths, setQueueDepths] = useState<QueueMessage[]>([
    { id: '1', queue: 'orders.created', count: 0 },
    { id: '2', queue: 'stock.reserved', count: 0 },
    { id: '3', queue: 'payments.completed', count: 0 },
  ]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        const next = prev + 1;
        if (next > sagaSteps.length) {
          setIsPlaying(false);
          return prev;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, sagaSteps.length]);

  // Update saga steps based on current step
  useEffect(() => {
    setSagaSteps((steps) =>
      steps.map((step, index) => ({
        ...step,
        status:
          index < currentStep
            ? 'completed'
            : index === currentStep
            ? 'active'
            : 'pending',
        duration: index < currentStep ? 50 + Math.random() * 100 : undefined,
      }))
    );

    // Add outbox messages
    if (currentStep > 0 && currentStep <= sagaSteps.length) {
      const eventTypes = ['OrderCreated', 'StockReserved', 'PaymentCreated', 'OrderCompleted'];
      setOutboxMessages((prev) => {
        const existing = prev.find((m) => m.type === eventTypes[currentStep - 1]);
        if (existing) return prev;
        return [
          {
            id: crypto.randomUUID(),
            type: eventTypes[currentStep - 1],
            status: 'pending',
            createdAt: new Date(),
          },
          ...prev,
        ];
      });
    }
  }, [currentStep, sagaSteps.length]);

  // Publish outbox messages
  useEffect(() => {
    const timer = setTimeout(() => {
      setOutboxMessages((messages) =>
        messages.map((m, i) => ({
          ...m,
          status: i < messages.length - 1 ? 'published' : m.status,
        }))
      );

      // Update queue depths
      setQueueDepths((queues) =>
        queues.map((q, i) => ({
          ...q,
          count: Math.max(0, currentStep - i - 1),
        }))
      );
    }, 500);

    return () => clearTimeout(timer);
  }, [outboxMessages, currentStep]);

  const reset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    setSagaSteps((steps) =>
      steps.map((s) => ({ ...s, status: 'pending', duration: undefined }))
    );
    setOutboxMessages([]);
    setQueueDepths((queues) => queues.map((q) => ({ ...q, count: 0 })));
  };

  const togglePlay = () => {
    if (currentStep >= sagaSteps.length) {
      reset();
      setTimeout(() => setIsPlaying(true), 100);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="secondary" onClick={togglePlay}>
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              {currentStep >= sagaSteps.length ? 'Replay' : 'Start'}
            </>
          )}
        </Button>
        <Button variant="ghost" onClick={reset}>
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
      </div>

      {/* Saga Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Saga Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {sagaSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <motion.div
                  className={cn(
                    'flex flex-col items-center',
                    step.status === 'pending' && 'opacity-50'
                  )}
                  animate={{
                    scale: step.status === 'active' ? 1.1 : 1,
                  }}
                >
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-colors',
                      {
                        'bg-success text-white': step.status === 'completed',
                        'bg-accent text-white animate-pulse': step.status === 'active',
                        'bg-surface text-muted': step.status === 'pending',
                      }
                    )}
                  >
                    {step.status === 'completed' ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className="mt-2 text-xs text-center max-w-[80px]">
                    {step.name}
                  </span>
                  {step.duration && (
                    <span className="text-xs text-muted mt-1">
                      {step.duration.toFixed(0)}ms
                    </span>
                  )}
                </motion.div>

                {index < sagaSteps.length - 1 && (
                  <ArrowRight
                    className={cn(
                      'w-6 h-6 mx-2',
                      sagaSteps[index + 1].status !== 'pending'
                        ? 'text-accent'
                        : 'text-muted'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Outbox Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Outbox Table
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="grid grid-cols-3 text-xs text-muted font-medium pb-2 border-b border-border">
                <span>Type</span>
                <span>Status</span>
                <span>Created</span>
              </div>
              {outboxMessages.length === 0 ? (
                <div className="py-4 text-center text-muted text-sm">
                  <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  Waiting for events...
                </div>
              ) : (
                outboxMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="grid grid-cols-3 text-sm py-2 border-b border-border/50 last:border-0"
                  >
                    <span className="font-mono text-xs truncate">
                      {msg.type}
                    </span>
                    <Badge
                      variant={msg.status === 'published' ? 'success' : 'warning'}
                      className="w-fit"
                    >
                      {msg.status === 'published' ? 'Published' : 'Pending'}
                    </Badge>
                    <span className="text-muted text-xs">
                      {msg.createdAt.toLocaleTimeString()}
                    </span>
                  </motion.div>
                ))
              )}
            </div>

            <div className="mt-4 p-3 bg-surface rounded-lg text-xs text-secondary">
              <strong className="text-primary">Transactional Outbox:</strong>{' '}
              Events are written to the database in the same transaction as your
              data, then published by a background worker. Nothing gets lost.
            </div>
          </CardContent>
        </Card>

        {/* Message Queues */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Message Queues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {queueDepths.map((queue) => (
                <div key={queue.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs text-secondary">
                      {queue.queue}
                    </span>
                    <Badge variant="outline">{queue.count}</Badge>
                  </div>
                  <div className="h-2 bg-surface rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-accent rounded-full"
                      animate={{ width: `${Math.min(queue.count * 25, 100)}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {queueDepths.reduce((sum, q) => sum + q.count, 0)}
                </div>
                <div className="text-xs text-muted">Total Messages</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">2</div>
                <div className="text-xs text-muted">Consumers</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">12/s</div>
                <div className="text-xs text-muted">Throughput</div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-surface rounded-lg text-xs text-secondary">
              <strong className="text-primary">MassTransit + RabbitMQ:</strong>{' '}
              Events are delivered reliably with automatic retries,
              dead-letter handling, and consumer scaling.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
