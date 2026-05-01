import { useState, useCallback } from 'react';

interface EventData {
  id: string;
  type: string;
  timestamp: Date;
  status: 'completed' | 'processing';
  context?: string;
}

export function CheckoutDemo() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  const addEvent = useCallback((type: string, context: string, status: EventData['status'] = 'completed') => {
    setEvents(prev => [{ id: crypto.randomUUID(), type, context, timestamp: new Date(), status }, ...prev]);
  }, []);

  const runSimulation = async () => {
    setIsProcessing(true);
    setOrderComplete(false);
    setEvents([]);

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    addEvent('OrderCreated', 'Orders', 'processing');
    await delay(200);
    addEvent('StockReserved', 'Inventory');
    await delay(150);
    addEvent('OutboxEventStored', 'Outbox');
    await delay(150);
    addEvent('PaymentInitiated', 'Payments');
    await delay(300);

    setEvents(prev => prev.map(e => e.type === 'OrderCreated' ? { ...e, status: 'completed' as const } : e));

    addEvent('PaymentCompleted', 'Payments');
    await delay(150);
    addEvent('OrderConfirmed', 'Orders');
    await delay(100);
    addEvent('EmailQueued', 'Notifications');
    await delay(100);
    addEvent('SagaCompleted', 'Orchestrator');

    setIsProcessing(false);
    setOrderComplete(true);
  };

  const reset = () => {
    setEvents([]);
    setOrderComplete(false);
  };

  const formatTime = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });

  const contextColors: Record<string, string> = {
    Orders: 'bg-blue-500/20 text-blue-400',
    Inventory: 'bg-amber-500/20 text-amber-400',
    Payments: 'bg-green-500/20 text-green-400',
    Outbox: 'bg-purple-500/20 text-purple-400',
    Notifications: 'bg-pink-500/20 text-pink-400',
    Orchestrator: 'bg-cyan-500/20 text-cyan-400',
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Simulation Controls */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary">Order Saga Simulation</h3>

        <div className="p-6 glass rounded-xl">
          <p className="text-secondary mb-6">
            Watch a distributed transaction flow through multiple bounded contexts using the Saga pattern with transactional outbox.
          </p>

          <div className="space-y-3 mb-6 text-sm">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-secondary">Orders Context</span>
              <span className="text-muted">→ Creates order aggregate</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-secondary">Inventory Context</span>
              <span className="text-muted">→ Reserves stock</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span className="text-secondary">Transactional Outbox</span>
              <span className="text-muted">→ Guarantees delivery</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-secondary">Payments Context</span>
              <span className="text-muted">→ Processes payment</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-pink-400" />
              <span className="text-secondary">Notifications</span>
              <span className="text-muted">→ Sends confirmation</span>
            </div>
          </div>

          {orderComplete ? (
            <div className="flex items-center justify-center gap-2 p-3 bg-success/20 border border-success/30 rounded-lg text-success animate-fade-in mb-4">
              ✓ Saga Completed Successfully
            </div>
          ) : null}

          <button
            onClick={runSimulation}
            disabled={isProcessing}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-accent to-accent-light text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-accent/25 transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <><span className="animate-spin">⏳</span> Running Saga...</>
            ) : (
              <>▶ Run Order Saga</>
            )}
          </button>

          {events.length > 0 && !isProcessing && (
            <button onClick={reset} className="w-full mt-2 py-2 text-secondary hover:text-primary transition-colors text-sm">
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Event Stream */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
          Event Stream
          {isProcessing && <span className="px-2 py-0.5 text-xs rounded-full bg-info/20 text-info animate-pulse">Live</span>}
        </h3>
        <div className="glass rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${events.length > 0 ? 'bg-success animate-pulse' : 'bg-muted'}`} />
              <span className="text-sm font-medium">Domain Events</span>
            </div>
            <span className="text-xs text-muted">{events.length} events</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {events.length === 0 ? (
              <div className="p-8 text-center text-secondary">
                <div className="text-4xl mb-2 opacity-50">📡</div>
                <p>No events yet</p>
                <p className="text-sm text-muted mt-1">Run the saga to see events flow</p>
              </div>
            ) : (
              events.map((e, i) => (
                <div
                  key={e.id}
                  className="px-4 py-3 border-b border-white/5 last:border-0 flex items-center gap-3 animate-fade-in"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${e.status === 'completed' ? 'bg-success/20 text-success' : 'bg-info/20 text-info'}`}>
                    {e.status === 'completed' ? '✓' : '○'}
                  </span>
                  <span className="text-xs font-mono text-muted w-24 shrink-0">{formatTime(e.timestamp)}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${contextColors[e.context || ''] || 'bg-gray-500/20 text-gray-400'}`}>
                    {e.context}
                  </span>
                  <span className="text-sm font-medium text-primary">{e.type}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
