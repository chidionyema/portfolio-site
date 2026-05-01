import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Plus, Minus, CreditCard, Check, Package } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { EventStream, type EventData } from './EventStream';
import { cn } from '../../lib/utils';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
}

const products: Product[] = [
  {
    id: '1',
    name: 'Clean Architecture Book',
    description: 'Learn how to build maintainable software',
    price: 49.99,
    image: '📚',
  },
  {
    id: '2',
    name: 'DDD Workshop',
    description: 'Domain-Driven Design workshop recording',
    price: 199.99,
    image: '🎓',
  },
  {
    id: '3',
    name: 'Event Sourcing Course',
    description: 'Master event-driven architectures',
    price: 299.99,
    image: '⚡',
  },
];

export function CheckoutDemo() {
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [events, setEvents] = useState<EventData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  const addToCart = (productId: string) => {
    setCart((prev) => {
      const newCart = new Map(prev);
      newCart.set(productId, (prev.get(productId) || 0) + 1);
      return newCart;
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const newCart = new Map(prev);
      const current = prev.get(productId) || 0;
      if (current <= 1) {
        newCart.delete(productId);
      } else {
        newCart.set(productId, current - 1);
      }
      return newCart;
    });
  };

  const getCartTotal = () => {
    let total = 0;
    cart.forEach((quantity, productId) => {
      const product = products.find((p) => p.id === productId);
      if (product) {
        total += product.price * quantity;
      }
    });
    return total;
  };

  const addEvent = useCallback((type: string, data: Record<string, unknown>, status: EventData['status'] = 'completed') => {
    const event: EventData = {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date(),
      correlationId: crypto.randomUUID().split('-')[0],
      data,
      status,
    };
    setEvents((prev) => [event, ...prev]);
  }, []);

  const processCheckout = async () => {
    if (cart.size === 0) return;

    setIsProcessing(true);
    setOrderComplete(false);

    const orderId = crypto.randomUUID().split('-')[0];
    const items = Array.from(cart.entries()).map(([productId, quantity]) => {
      const product = products.find((p) => p.id === productId)!;
      return { productId, name: product.name, quantity, price: product.price };
    });

    // Simulate the event flow
    addEvent('CheckoutInitiated', { orderId, items: items.length }, 'processing');
    await delay(300);

    addEvent('StockReserved', { orderId, items }, 'completed');
    await delay(200);

    addEvent('OutboxEventCreated', { type: 'OrderCreated', orderId }, 'completed');
    await delay(150);

    addEvent('PaymentSessionCreated', {
      orderId,
      amount: getCartTotal(),
      provider: 'Stripe',
    }, 'completed');
    await delay(500);

    // Update first event to completed
    setEvents((prev) => prev.map((e) =>
      e.type === 'CheckoutInitiated' ? { ...e, status: 'completed' as const } : e
    ));

    addEvent('PaymentCompleted', {
      orderId,
      transactionId: `txn_${Math.random().toString(36).substring(7)}`,
    }, 'completed');
    await delay(200);

    addEvent('OrderConfirmed', { orderId, status: 'PAID' }, 'completed');
    await delay(100);

    addEvent('NotificationSent', {
      type: 'email',
      template: 'order_confirmation',
    }, 'completed');

    setIsProcessing(false);
    setOrderComplete(true);
    setCart(new Map());
  };

  const resetDemo = () => {
    setEvents([]);
    setOrderComplete(false);
    setCart(new Map());
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Products */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary">Products</h3>
        <div className="grid gap-3">
          {products.map((product) => {
            const quantity = cart.get(product.id) || 0;

            return (
              <Card key={product.id} variant="solid" className="p-4">
                <div className="flex items-center gap-4">
                  <div className="text-3xl">{product.image}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-primary truncate">
                      {product.name}
                    </h4>
                    <p className="text-sm text-secondary truncate">
                      {product.description}
                    </p>
                    <p className="text-accent font-semibold mt-1">
                      £{product.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {quantity > 0 ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(product.id)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">
                          {quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => addToCart(product.id)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => addToCart(product.id)}
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Order Summary */}
        <Card variant="glass" className="p-4 mt-6">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Order Summary
          </h3>

          {cart.size === 0 ? (
            <p className="text-secondary text-sm">Your cart is empty</p>
          ) : (
            <div className="space-y-3">
              {Array.from(cart.entries()).map(([productId, quantity]) => {
                const product = products.find((p) => p.id === productId)!;
                return (
                  <div key={productId} className="flex justify-between text-sm">
                    <span className="text-secondary">
                      {product.name} x {quantity}
                    </span>
                    <span className="text-primary">
                      £{(product.price * quantity).toFixed(2)}
                    </span>
                  </div>
                );
              })}
              <div className="border-t border-border pt-3 flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-accent">£{getCartTotal().toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {orderComplete ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center justify-center gap-2 p-3 bg-success/20 border border-success/30 rounded-lg text-success"
              >
                <Check className="w-5 h-5" />
                Order Complete!
              </motion.div>
            ) : (
              <Button
                onClick={processCheckout}
                disabled={cart.size === 0}
                isLoading={isProcessing}
                className="w-full"
              >
                <CreditCard className="w-4 h-4" />
                Process Checkout
              </Button>
            )}

            {events.length > 0 && (
              <Button variant="ghost" onClick={resetDemo} className="w-full">
                Reset Demo
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Event Stream */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
          Real-time Events
          {isProcessing && (
            <Badge variant="info" className="animate-pulse">
              Processing...
            </Badge>
          )}
        </h3>
        <EventStream events={events} maxHeight="500px" />
      </div>
    </div>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
