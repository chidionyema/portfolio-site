import { useState, lazy, Suspense } from 'react';

// Lazy load all demo components for blazing fast initial load
const CheckoutDemo = lazy(() => import('./CheckoutDemo').then(m => ({ default: m.CheckoutDemo })));
const EventFlowDemo = lazy(() => import('./EventFlowDemo').then(m => ({ default: m.EventFlowDemo })));
const CircuitBreakerDemo = lazy(() => import('./CircuitBreakerDemo').then(m => ({ default: m.CircuitBreakerDemo })));
const VaultRotationDemo = lazy(() => import('./VaultRotationDemo').then(m => ({ default: m.VaultRotationDemo })));
const IdempotencyDemo = lazy(() => import('./IdempotencyDemo').then(m => ({ default: m.IdempotencyDemo })));
const CacheStampedeDemo = lazy(() => import('./CacheStampedeDemo').then(m => ({ default: m.CacheStampedeDemo })));
const CacheInvalidationDemo = lazy(() => import('./CacheInvalidationDemo').then(m => ({ default: m.CacheInvalidationDemo })));
const ConcurrencyDemo = lazy(() => import('./ConcurrencyDemo').then(m => ({ default: m.ConcurrencyDemo })));
const RateLimiterDemo = lazy(() => import('./RateLimiterDemo').then(m => ({ default: m.RateLimiterDemo })));

const tabs = [
  { id: 'checkout', label: 'Saga', icon: '🔄', desc: 'Distributed transaction orchestration' },
  { id: 'events', label: 'Events', icon: '📊', desc: 'Outbox pattern visualization' },
  { id: 'circuit', label: 'Circuit', icon: '⚡', desc: 'Resilience pattern in action' },
  { id: 'vault', label: 'Secrets', icon: '🔐', desc: 'Zero-downtime rotation' },
  { id: 'idempotency', label: 'Idempotency', icon: '🔑', desc: 'Duplicate request handling' },
  { id: 'stampede', label: 'Stampede', icon: '🦬', desc: 'Cache thundering herd prevention' },
  { id: 'cache', label: 'Cache', icon: '📦', desc: 'Invalidation with pub/sub' },
  { id: 'concurrency', label: 'Concurrency', icon: '🔀', desc: 'Optimistic locking' },
  { id: 'ratelimit', label: 'Rate Limit', icon: '🚦', desc: 'Token bucket throttling' },
];

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="h-64 bg-surface rounded-xl" />
        <div className="h-64 bg-surface rounded-xl" />
      </div>
    </div>
  );
}

export function DemoHub() {
  const [activeTab, setActiveTab] = useState('checkout');
  const activeTabData = tabs.find(t => t.id === activeTab);

  return (
    <div className="space-y-6">
      {/* Tab buttons - scrollable on mobile */}
      <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-2 min-w-max md:flex-wrap md:justify-center">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap
                transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
                ${activeTab === tab.id
                  ? 'bg-accent text-white shadow-lg shadow-accent/25'
                  : 'bg-surface text-secondary hover:text-primary hover:bg-elevated'
                }
              `}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab description */}
      <p className="text-center text-secondary text-sm">
        <span className="text-lg mr-2">{activeTabData?.icon}</span>
        <span className="font-medium text-primary">{activeTabData?.label}:</span>{' '}
        {activeTabData?.desc}
      </p>

      {/* Content area with lazy loading */}
      <div className="glass rounded-2xl p-4 md:p-6 min-h-[450px]">
        <Suspense fallback={<LoadingSkeleton />}>
          {activeTab === 'checkout' && <CheckoutDemo />}
          {activeTab === 'events' && <EventFlowDemo />}
          {activeTab === 'circuit' && <CircuitBreakerDemo />}
          {activeTab === 'vault' && <VaultRotationDemo />}
          {activeTab === 'idempotency' && <IdempotencyDemo />}
          {activeTab === 'stampede' && <CacheStampedeDemo />}
          {activeTab === 'cache' && <CacheInvalidationDemo />}
          {activeTab === 'concurrency' && <ConcurrencyDemo />}
          {activeTab === 'ratelimit' && <RateLimiterDemo />}
        </Suspense>
      </div>

      {/* Note */}
      <p className="text-center text-muted text-xs">
        These demos interface with real infrastructure.{' '}
        <a href="#architecture" className="text-accent hover:text-accent-light transition-colors">
          See the architecture →
        </a>
      </p>
    </div>
  );
}
