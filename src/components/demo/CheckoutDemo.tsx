import { useState, useCallback } from 'react';

interface Product {
  id: string;
  name: string;
  price: number;
  icon: string;
}

interface EventData {
  id: string;
  type: string;
  timestamp: Date;
  status: 'completed' | 'processing';
}

const products: Product[] = [
  { id: '1', name: 'API Access (Monthly)', price: 49.99, icon: '🔑' },
  { id: '2', name: 'Premium Support', price: 199.99, icon: '🛡️' },
  { id: '3', name: 'Enterprise License', price: 299.99, icon: '⚡' },
];

export function CheckoutDemo() {
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [events, setEvents] = useState<EventData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  const addToCart = (id: string) => {
    setCart(prev => new Map(prev).set(id, (prev.get(id) || 0) + 1));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => {
      const newCart = new Map(prev);
      const qty = prev.get(id) || 0;
      if (qty <= 1) newCart.delete(id);
      else newCart.set(id, qty - 1);
      return newCart;
    });
  };

  const getTotal = () => {
    let total = 0;
    cart.forEach((qty, id) => {
      const p = products.find(x => x.id === id);
      if (p) total += p.price * qty;
    });
    return total;
  };

  const addEvent = useCallback((type: string, status: EventData['status'] = 'completed') => {
    setEvents(prev => [{ id: crypto.randomUUID(), type, timestamp: new Date(), status }, ...prev]);
  }, []);

  const processCheckout = async () => {
    if (cart.size === 0) return;
    setIsProcessing(true);
    setOrderComplete(false);

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    addEvent('CheckoutInitiated', 'processing');
    await delay(200);
    addEvent('StockReserved');
    await delay(150);
    addEvent('OutboxEventCreated');
    await delay(150);
    addEvent('PaymentSessionCreated');
    await delay(300);

    setEvents(prev => prev.map(e => e.type === 'CheckoutInitiated' ? { ...e, status: 'completed' as const } : e));

    addEvent('PaymentCompleted');
    await delay(150);
    addEvent('OrderConfirmed');
    await delay(100);
    addEvent('NotificationSent');

    setIsProcessing(false);
    setOrderComplete(true);
    setCart(new Map());
  };

  const reset = () => {
    setEvents([]);
    setOrderComplete(false);
  };

  const formatTime = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Products */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary">Products</h3>
        {products.map(p => {
          const qty = cart.get(p.id) || 0;
          return (
            <div key={p.id} className="flex items-center gap-4 p-4 bg-surface rounded-xl border border-border">
              <span className="text-3xl">{p.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-primary truncate">{p.name}</div>
                <div className="text-accent font-semibold">£{p.price.toFixed(2)}</div>
              </div>
              {qty > 0 ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => removeFromCart(p.id)} className="w-8 h-8 rounded-lg bg-elevated hover:bg-border transition-colors flex items-center justify-center">−</button>
                  <span className="w-8 text-center font-medium">{qty}</span>
                  <button onClick={() => addToCart(p.id)} className="w-8 h-8 rounded-lg bg-elevated hover:bg-border transition-colors flex items-center justify-center">+</button>
                </div>
              ) : (
                <button onClick={() => addToCart(p.id)} className="px-4 py-2 rounded-lg border border-accent/50 text-accent hover:bg-accent/10 transition-colors text-sm">
                  Add
                </button>
              )}
            </div>
          );
        })}

        {/* Summary */}
        <div className="p-4 glass rounded-xl mt-6">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            🛒 Order Summary
          </h3>
          {cart.size === 0 ? (
            <p className="text-secondary text-sm">Your cart is empty</p>
          ) : (
            <div className="space-y-2 mb-4">
              {Array.from(cart.entries()).map(([id, qty]) => {
                const p = products.find(x => x.id === id)!;
                return (
                  <div key={id} className="flex justify-between text-sm">
                    <span className="text-secondary">{p.name} × {qty}</span>
                    <span className="text-primary">£{(p.price * qty).toFixed(2)}</span>
                  </div>
                );
              })}
              <div className="border-t border-border pt-2 flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-accent">£{getTotal().toFixed(2)}</span>
              </div>
            </div>
          )}

          {orderComplete ? (
            <div className="flex items-center justify-center gap-2 p-3 bg-success/20 border border-success/30 rounded-lg text-success animate-fade-in">
              ✓ Order Complete!
            </div>
          ) : (
            <button
              onClick={processCheckout}
              disabled={cart.size === 0 || isProcessing}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-accent to-accent-light text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-accent/25 transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <><span className="animate-spin">⏳</span> Processing...</>
              ) : (
                <>💳 Process Checkout</>
              )}
            </button>
          )}

          {events.length > 0 && (
            <button onClick={reset} className="w-full mt-2 py-2 text-secondary hover:text-primary transition-colors text-sm">
              Reset Demo
            </button>
          )}
        </div>
      </div>

      {/* Events */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
          Real-time Events
          {isProcessing && <span className="px-2 py-0.5 text-xs rounded-full bg-info/20 text-info animate-pulse">Processing...</span>}
        </h3>
        <div className="glass rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm font-medium">Live Stream</span>
            </div>
            <span className="text-xs text-muted">{events.length} events</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {events.length === 0 ? (
              <div className="p-8 text-center text-secondary">
                <div className="text-4xl mb-2 opacity-50">⏳</div>
                <p>Waiting for events...</p>
                <p className="text-sm text-muted mt-1">Try the checkout to see events flow</p>
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
