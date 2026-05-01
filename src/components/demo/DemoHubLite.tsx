import { useState, lazy, Suspense } from 'react';

// Lazy load heavy demo components
const CheckoutDemo = lazy(() => import('./CheckoutDemo').then(m => ({ default: m.CheckoutDemo })));
const EventFlowDemo = lazy(() => import('./EventFlowDemo').then(m => ({ default: m.EventFlowDemo })));
const CircuitBreakerDemo = lazy(() => import('./CircuitBreakerDemo').then(m => ({ default: m.CircuitBreakerDemo })));
const VaultRotationDemo = lazy(() => import('./VaultRotationDemo').then(m => ({ default: m.VaultRotationDemo })));

const tabs = [
  { id: 'checkout', label: 'Checkout', icon: '🛒' },
  { id: 'events', label: 'Event Flow', icon: '📊' },
  { id: 'circuit', label: 'Circuit Breaker', icon: '⚡' },
  { id: 'vault', label: 'Vault Rotation', icon: '🔐' },
];

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="h-64 bg-surface rounded-xl" />
        <div className="h-64 bg-surface rounded-xl" />
      </div>
      <div className="h-48 bg-surface rounded-xl" />
    </div>
  );
}

export function DemoHub() {
  const [activeTab, setActiveTab] = useState('checkout');

  return (
    <div className="space-y-8">
      {/* Tab buttons - Pure CSS, no framer-motion */}
      <div className="flex flex-wrap justify-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium
              transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
              ${activeTab === tab.id
                ? 'bg-accent text-white shadow-lg shadow-accent/25'
                : 'bg-surface text-secondary hover:text-primary hover:bg-elevated'
              }
            `}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab description */}
      <p className="text-center text-secondary">
        {activeTab === 'checkout' && 'Interactive order flow with real-time events'}
        {activeTab === 'events' && 'Visualize saga and outbox patterns'}
        {activeTab === 'circuit' && 'See resilience patterns in action'}
        {activeTab === 'vault' && 'Zero-downtime credential rotation'}
      </p>

      {/* Content area with lazy loading */}
      <div className="glass rounded-2xl p-6 md:p-8 min-h-[500px]">
        <Suspense fallback={<LoadingSkeleton />}>
          {activeTab === 'checkout' && <CheckoutDemo />}
          {activeTab === 'events' && <EventFlowDemo />}
          {activeTab === 'circuit' && <CircuitBreakerDemo />}
          {activeTab === 'vault' && <VaultRotationDemo />}
        </Suspense>
      </div>

      {/* Note */}
      <p className="text-center text-secondary text-sm">
        These aren't simulations. They call a real API with real infrastructure.{' '}
        <a href="#architecture" className="text-accent hover:text-accent-light transition-colors">
          See how it's built →
        </a>
      </p>
    </div>
  );
}
