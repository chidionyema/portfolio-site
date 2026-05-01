import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { ShoppingCart, Activity, Zap, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { CircuitBreakerDemo } from './CircuitBreakerDemo';
import { VaultRotationDemo } from './VaultRotationDemo';
import { CheckoutDemo } from './CheckoutDemo';
import { EventFlowDemo } from './EventFlowDemo';

const tabs = [
  {
    id: 'checkout',
    label: 'Checkout',
    icon: ShoppingCart,
    description: 'Interactive order flow with real events',
  },
  {
    id: 'events',
    label: 'Event Flow',
    icon: Activity,
    description: 'Visualize saga and outbox patterns',
  },
  {
    id: 'circuit',
    label: 'Circuit Breaker',
    icon: Zap,
    description: 'See resilience patterns in action',
  },
  {
    id: 'vault',
    label: 'Vault Rotation',
    icon: Key,
    description: 'Zero-downtime credential rotation',
  },
];

export function DemoHub() {
  const [activeTab, setActiveTab] = useState('checkout');

  return (
    <section id="demo" className="py-24">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-primary mb-4">
            See It Working
          </h2>
          <p className="text-lg text-secondary max-w-2xl mx-auto">
            Watch real events flow through a distributed system.
            Try the interactive demos below.
          </p>
        </div>

        {/* Tabs */}
        <Tabs.Root
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-8"
        >
          {/* Tab list */}
          <Tabs.List className="flex flex-wrap justify-center gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <Tabs.Trigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    'flex items-center gap-2 px-6 py-3 rounded-xl',
                    'text-sm font-medium transition-all duration-200',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                    isActive
                      ? 'bg-accent text-white shadow-lg shadow-accent/25'
                      : 'bg-surface text-secondary hover:text-primary hover:bg-elevated'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </Tabs.Trigger>
              );
            })}
          </Tabs.List>

          {/* Tab description */}
          <div className="text-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-secondary"
              >
                {tabs.find((t) => t.id === activeTab)?.description}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Tab content */}
          <div className="glass rounded-2xl p-6 md:p-8">
            <AnimatePresence mode="wait">
              <Tabs.Content
                key={activeTab}
                value="checkout"
                asChild
                forceMount
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: activeTab === 'checkout' ? 1 : 0, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={activeTab === 'checkout' ? 'block' : 'hidden'}
                >
                  <CheckoutDemo />
                </motion.div>
              </Tabs.Content>

              <Tabs.Content
                key={`${activeTab}-events`}
                value="events"
                asChild
                forceMount
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: activeTab === 'events' ? 1 : 0, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={activeTab === 'events' ? 'block' : 'hidden'}
                >
                  <EventFlowDemo />
                </motion.div>
              </Tabs.Content>

              <Tabs.Content
                key={`${activeTab}-circuit`}
                value="circuit"
                asChild
                forceMount
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: activeTab === 'circuit' ? 1 : 0, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={activeTab === 'circuit' ? 'block' : 'hidden'}
                >
                  <CircuitBreakerDemo />
                </motion.div>
              </Tabs.Content>

              <Tabs.Content
                key={`${activeTab}-vault`}
                value="vault"
                asChild
                forceMount
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: activeTab === 'vault' ? 1 : 0, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={activeTab === 'vault' ? 'block' : 'hidden'}
                >
                  <VaultRotationDemo />
                </motion.div>
              </Tabs.Content>
            </AnimatePresence>
          </div>
        </Tabs.Root>

        {/* Why this matters */}
        <div className="mt-12 text-center">
          <p className="text-secondary mb-4">
            These aren't simulations. They're calling a real API with real infrastructure.
          </p>
          <a
            href="#architecture"
            className="text-accent hover:text-accent-light transition-colors"
          >
            See how it's built →
          </a>
        </div>
      </div>
    </section>
  );
}
