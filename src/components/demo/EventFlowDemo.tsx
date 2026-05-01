import { useState, useEffect } from 'react';

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
}

export function EventFlowDemo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [sagaSteps, setSagaSteps] = useState<SagaStep[]>([
    { id: '1', name: 'Checkout', status: 'pending' },
    { id: '2', name: 'Stock Reserved', status: 'pending' },
    { id: '3', name: 'Payment', status: 'pending' },
    { id: '4', name: 'Complete', status: 'pending' },
  ]);
  const [outbox, setOutbox] = useState<OutboxMessage[]>([]);
  const [queues, setQueues] = useState([
    { name: 'orders.created', depth: 0 },
    { name: 'stock.reserved', depth: 0 },
    { name: 'payments.completed', depth: 0 },
  ]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= sagaSteps.length) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 800);
    return () => clearInterval(interval);
  }, [isPlaying, sagaSteps.length]);

  useEffect(() => {
    setSagaSteps(steps => steps.map((s, i) => ({
      ...s,
      status: i < currentStep ? 'completed' : i === currentStep ? 'active' : 'pending',
      duration: i < currentStep ? 30 + Math.random() * 70 : undefined,
    })));

    const types = ['OrderCreated', 'StockReserved', 'PaymentCreated', 'OrderCompleted'];
    if (currentStep > 0 && currentStep <= types.length) {
      setOutbox(prev => {
        if (prev.find(m => m.type === types[currentStep - 1])) return prev;
        return [{ id: crypto.randomUUID(), type: types[currentStep - 1], status: 'pending' }, ...prev];
      });
    }

    setTimeout(() => {
      setOutbox(msgs => msgs.map((m, i) => ({ ...m, status: i > 0 ? 'published' : m.status })));
      setQueues(qs => qs.map((q, i) => ({ ...q, depth: Math.max(0, currentStep - i - 1) })));
    }, 400);
  }, [currentStep]);

  const reset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    setSagaSteps(s => s.map(x => ({ ...x, status: 'pending', duration: undefined })));
    setOutbox([]);
    setQueues(q => q.map(x => ({ ...x, depth: 0 })));
  };

  const togglePlay = () => {
    if (currentStep >= sagaSteps.length) reset();
    setTimeout(() => setIsPlaying(true), 50);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex justify-center gap-4">
        <button onClick={togglePlay} className="px-6 py-3 rounded-xl border border-accent/50 text-accent hover:bg-accent/10 transition-colors flex items-center gap-2">
          {isPlaying ? '⏸ Pause' : currentStep >= sagaSteps.length ? '🔄 Replay' : '▶ Start'}
        </button>
        <button onClick={reset} className="px-6 py-3 rounded-xl border border-border text-secondary hover:text-primary transition-colors">
          ↺ Reset
        </button>
      </div>

      {/* Saga Flow */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-6 text-center">Saga Flow</h3>
        <div className="flex items-center justify-center gap-2 md:gap-4 flex-wrap">
          {sagaSteps.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex flex-col items-center transition-transform ${step.status === 'active' ? 'scale-110' : ''}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-colors ${
                  step.status === 'completed' ? 'bg-success text-white' :
                  step.status === 'active' ? 'bg-accent text-white animate-pulse' : 'bg-surface text-muted'
                }`}>
                  {step.status === 'completed' ? '✓' : i + 1}
                </div>
                <span className="mt-2 text-xs text-center max-w-[70px]">{step.name}</span>
                {step.duration && <span className="text-xs text-muted">{step.duration.toFixed(0)}ms</span>}
              </div>
              {i < sagaSteps.length - 1 && (
                <span className={`mx-2 text-xl ${sagaSteps[i + 1].status !== 'pending' ? 'text-accent' : 'text-muted'}`}>→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Outbox */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            📤 Outbox Table
          </h3>
          <div className="space-y-2">
            <div className="grid grid-cols-2 text-xs text-muted font-medium pb-2 border-b border-border">
              <span>Event Type</span>
              <span>Status</span>
            </div>
            {outbox.length === 0 ? (
              <div className="py-4 text-center text-muted text-sm">Waiting for events...</div>
            ) : (
              outbox.map((m, i) => (
                <div key={m.id} className="grid grid-cols-2 text-sm py-2 border-b border-border/50 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                  <span className="font-mono text-xs">{m.type}</span>
                  <span className={`px-2 py-0.5 rounded text-xs w-fit ${m.status === 'published' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                    {m.status === 'published' ? 'Published' : 'Pending'}
                  </span>
                </div>
              ))
            )}
          </div>
          <p className="text-xs text-secondary mt-4 p-3 bg-surface rounded-lg">
            <strong className="text-primary">Transactional Outbox:</strong> Events saved in same DB transaction as data. Nothing gets lost.
          </p>
        </div>

        {/* Queues */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            📨 Message Queues
          </h3>
          <div className="space-y-4">
            {queues.map(q => (
              <div key={q.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-mono text-xs text-secondary">{q.name}</span>
                  <span className="text-xs bg-surface px-2 py-0.5 rounded">{q.depth}</span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${Math.min(q.depth * 25, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6 text-center">
            <div><div className="text-2xl font-bold">{queues.reduce((s, q) => s + q.depth, 0)}</div><div className="text-xs text-muted">Messages</div></div>
            <div><div className="text-2xl font-bold">2</div><div className="text-xs text-muted">Consumers</div></div>
            <div><div className="text-2xl font-bold">12/s</div><div className="text-xs text-muted">Throughput</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
