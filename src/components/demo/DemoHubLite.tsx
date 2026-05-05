import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Zap, ShieldAlert, Code2, Cpu, BookOpen } from 'lucide-react';
import { DEMO_FOOTER, CLUSTER_LABEL } from '../../lib/copy';
import { DemoSidebar, DemoMobileNav, findDemo, findGroupOf, findNextDemo } from './DemoSidebar';
import { ChaosEngine } from '../system/ChaosEngine';
import { useDemoSession } from '../../hooks/useDemoSession';
import { CodeDrawer } from './CodeDrawer';
import { DemoContext } from './DemoContext';
import { TraceViewer } from './TraceViewer';
import { useLatestTraceId } from '../../hooks/useLatestTraceId';
import { traceStore } from '../../lib/trace-store';

const CheckoutDemo          = lazy(() => import('./CheckoutDemo').then(m => ({ default: m.CheckoutDemo })));
const EventFlowDemo         = lazy(() => import('./EventFlowDemo').then(m => ({ default: m.EventFlowDemo })));
const CircuitBreakerDemo    = lazy(() => import('./CircuitBreakerDemo').then(m => ({ default: m.CircuitBreakerDemo })));
const VaultRotationDemo     = lazy(() => import('./VaultRotationDemo').then(m => ({ default: m.VaultRotationDemo })));
const IdempotencyDemo       = lazy(() => import('./IdempotencyDemo').then(m => ({ default: m.IdempotencyDemo })));
const CacheStampedeDemo     = lazy(() => import('./CacheStampedeDemo').then(m => ({ default: m.CacheStampedeDemo })));
const CacheInvalidationDemo = lazy(() => import('./CacheInvalidationDemo').then(m => ({ default: m.CacheInvalidationDemo })));
const ConcurrencyDemo       = lazy(() => import('./ConcurrencyDemo').then(m => ({ default: m.ConcurrencyDemo })));
const RateLimiterDemo       = lazy(() => import('./RateLimiterDemo').then(m => ({ default: m.RateLimiterDemo })));
const DistributedTracingDemo = lazy(() => import('./DistributedTracingDemo').then(m => ({ default: m.DistributedTracingDemo })));

const DEFAULT_DEMO = 'idempotency';

function readDemoFromURL(): string {
  if (typeof window === 'undefined') return DEFAULT_DEMO;
  const param = new URLSearchParams(window.location.search).get('demo');
  return param && findDemo(param).id === param ? param : DEFAULT_DEMO;
}

function writeDemoToURL(id: string) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('demo', id);
  window.history.replaceState({}, '', url);
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-[500px] space-y-6">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
        <Zap className="w-16 h-16 text-accent opacity-20" />
      </motion.div>
      <div className="text-xs font-mono text-muted animate-pulse">
        Establishing SignalR handshake with {CLUSTER_LABEL}...
      </div>
    </div>
  );
}

function DemoContent({ id }: { id: string }) {
  switch (id) {
    case 'checkout':    return <CheckoutDemo />;
    case 'events':      return <EventFlowDemo />;
    case 'circuit':     return <CircuitBreakerDemo />;
    case 'vault':       return <VaultRotationDemo />;
    case 'idempotency': return <IdempotencyDemo />;
    case 'stampede':    return <CacheStampedeDemo />;
    case 'cache':       return <CacheInvalidationDemo />;
    case 'concurrency': return <ConcurrencyDemo />;
    case 'ratelimit':   return <RateLimiterDemo />;
    case 'tracing':     return <DistributedTracingDemo />;
    default:            return null;
  }
}

export function DemoHub() {
  const [activeId, setActiveId] = useState(DEFAULT_DEMO);
  const [isChaosOpen, setIsChaosOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'live' | 'source'>('live');
  const { chaos, updateChaos, isConnected, error: connectionError, lastSuccessAt } = useDemoSession();
  const [isOffline, setIsOffline] = useState(false);
  const latestTraceId = useLatestTraceId();
  const traceRef = useRef<HTMLDivElement>(null);

  const isChaosActive = chaos.latencyMs > 0 || chaos.brokerDown || chaos.serviceFaulty;

  useEffect(() => {
    const timer = setInterval(() => {
      if (lastSuccessAt) {
        setIsOffline(Date.now() - lastSuccessAt > 30000);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [lastSuccessAt]);

  const handleRetry = async () => {
    try {
      await import('../../lib/api/demo-client').then(m => m.getHealthSnapshot());
      window.location.reload(); // Hard reset on recovery
    } catch (e) {
      console.error('Retry failed', e);
    }
  };

  useEffect(() => {
    if (latestTraceId && !localStorage.getItem('ha_trace_scrolled')) {
      setTimeout(() => {
        traceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        localStorage.setItem('ha_trace_scrolled', 'true');
      }, 800);
    }
  }, [latestTraceId]);

  useEffect(() => {
    setActiveId(readDemoFromURL());
  }, []);

  const handleSelect = (id: string) => {
    setActiveId(id);
    writeDemoToURL(id);
    setViewMode('live');
    traceStore.set(null);
  };

  useEffect(() => {
    const onPop = () => setActiveId(readDemoFromURL());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const demo = findDemo(activeId);
  const group = findGroupOf(activeId);

  return (
    <div className="space-y-6 relative">
      <DemoMobileNav activeId={activeId} onSelect={handleSelect} />

      <ChaosEngine
        isOpen={isChaosOpen}
        onClose={() => setIsChaosOpen(false)}
        onStateChange={(s) => updateChaos(s)}
      />

      <div className="glass overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row relative">
          <DemoSidebar activeId={activeId} onSelect={handleSelect} />

          <div className="flex-1 min-w-0 p-8 md:p-12 lg:p-16 bg-white/[0.01]">
            <header className="mb-16 relative">
               <div className="flex flex-wrap items-center justify-between gap-4 mb-12 border-b border-white/5 pb-8 font-mono text-[10px] font-bold uppercase tracking-[0.2em]">
                  <div className="flex items-center gap-8">
                     <button
                       onClick={isOffline ? handleRetry : undefined}
                       className={`flex items-center gap-2.5 transition-colors ${
                         isConnected && !isOffline ? 'text-success' : !isOffline && connectionError ? 'text-warning' : 'text-error'
                       } ${isOffline ? 'cursor-pointer hover:bg-white/5 px-2 -ml-2 py-1 rounded' : 'cursor-default'}`}
                       title={
                         isConnected && !isOffline
                           ? 'SignalR live — events streaming'
                           : !isOffline && connectionError
                           ? 'Realtime stream unavailable; updates via REST polling.'
                           : 'Cluster unreachable. Click to retry.'
                       }
                     >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            isConnected && !isOffline
                              ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse'
                              : !isOffline && connectionError
                              ? 'bg-warning shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                              : 'bg-error shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                          }`}
                        >
                          {isOffline && <span className="absolute inset-0 flex items-center justify-center text-[8px] leading-none">✕</span>}
                        </div>
                        <span className="tracking-normal font-black">
                           {isConnected && !isOffline ? 'live' : !isOffline && connectionError ? 'polling' : 'offline'}
                        </span>
                     </button>
                     <div className="flex items-center gap-2.5">
                        <span className="text-muted">Node:</span>
                        <span className="text-primary tracking-normal opacity-70">{CLUSTER_LABEL}</span>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                     <div className="flex p-1 bg-black/40 rounded-xl border border-white/5 mr-2">
                        <button
                          onClick={() => setViewMode('live')}
                          aria-pressed={viewMode === 'live'}
                          className={`focus-ring flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'live' ? 'bg-accent text-white shadow-lg' : 'text-muted hover:text-secondary'}`}
                        >
                           <Cpu className="w-3 h-3" /> System
                        </button>
                        <button
                          onClick={() => setViewMode('source')}
                          aria-pressed={viewMode === 'source'}
                          className={`focus-ring flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'source' ? 'bg-accent text-white shadow-lg' : 'text-muted hover:text-secondary'}`}
                        >
                           <Code2 className="w-3 h-3" /> Source
                        </button>
                     </div>

                     <button
                       onClick={() => setIsChaosOpen(true)}
                       aria-label="Open chaos engine controls"
                       title="Opens chaos controls. You can inject latency, simulate broker outages, or kill specific services. Chaos resets when you close the panel."
                       className={`focus-ring flex items-center gap-2 px-4 py-2 rounded-xl transition-all group ${
                         isChaosActive 
                           ? 'bg-error text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] border-error' 
                           : 'bg-error/10 hover:bg-error/20 border border-error/20 text-error'
                       }`}
                     >
                        <div className="relative">
                           <ShieldAlert className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                           {isChaosActive && (
                              <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-pulse" />
                           )}
                        </div>
                        <span className="tracking-widest font-black text-[10px]">
                           {isChaosActive ? 'FAULT_INJECTED' : 'FAULT_INJECTION'}
                        </span>
                     </button>
                  </div>
               </div>

               <div className="flex items-start gap-6">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl shrink-0 shadow-xl text-accent">
                     <demo.Icon className="w-10 h-10" strokeWidth={1.5} />
                  </div>
                  <div className="space-y-2">
                     <div className="flex items-center gap-3 mb-2">
                        <div className="text-xs font-bold uppercase tracking-[0.4em] text-accent-light">{group.label}</div>
                        <div className="h-px w-4 bg-white/10" />
                        <motion.div
                          key={`${activeId}-pill`}
                          initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                          className="px-2 py-0.5 bg-success/10 border border-success/20 rounded text-[9px] font-black uppercase tracking-widest text-success"
                        >
                           {demo.valueProp}
                        </motion.div>
                     </div>
                     <h3 className="font-display text-5xl text-primary leading-none tracking-tight font-bold">
                        {demo.label}
                     </h3>
                     <p className="text-secondary text-lg font-medium leading-relaxed max-w-2xl pt-4">
                        {demo.desc}
                     </p>
                     {demo.deepDiveSlug && (
                        <a
                          href={`/deep-dives/${demo.deepDiveSlug}`}
                          className="inline-flex items-center gap-2 mt-4 px-3 py-2 bg-accent/10 hover:bg-accent/20 border border-accent/20 rounded-lg text-[10px] font-black uppercase tracking-widest text-accent-light hover:text-white transition-all group/link"
                        >
                           <BookOpen className="w-3 h-3" />
                           <span>Read the spec</span>
                           <ArrowRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                        </a>
                     )}
                  </div>
               </div>
            </header>

            <div className="relative min-h-[500px]">
               <AnimatePresence mode="wait" initial={false}>
                  {viewMode === 'live' ? (
                     <motion.div
                       key={`${activeId}-live`}
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                     >
                        <DemoContext demoId={activeId} />
                        <Suspense fallback={<LoadingSkeleton />}>
                           <DemoContent id={activeId} />
                        </Suspense>
                        <AnimatePresence>
                          {latestTraceId && (
                            <motion.div
                              ref={traceRef}
                              key={latestTraceId}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="mt-8"
                            >
                              <TraceViewer traceId={latestTraceId} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                     </motion.div>
                  ) : (
                     <motion.div
                       key={`${activeId}-source`}
                       initial={{ opacity: 0, scale: 0.98 }}
                       animate={{ opacity: 1, scale: 1 }}
                       exit={{ opacity: 0, scale: 1.02 }}
                       transition={{ duration: 0.2 }}
                       className="h-full min-h-[600px]"
                     >
                        <CodeDrawer demoId={activeId} />
                     </motion.div>
                  )}
               </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {(() => {
         const next = findNextDemo(activeId);
         return (
           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 py-6 font-mono text-[10px] text-muted">
              <span className="uppercase tracking-[0.3em]">{DEMO_FOOTER}</span>
              <div className="flex items-center gap-6">
                 {next && (
                    <button
                      onClick={() => handleSelect(next.id)}
                      className="focus-ring bg-primary text-black px-5 py-2.5 rounded-full font-black transition-all flex items-center gap-2 group uppercase tracking-[0.15em] shadow-xl hover:bg-white hover:scale-105 active:scale-95"
                    >
                       <span className="opacity-50 text-[9px]">Try next:</span>
                       <span className="text-[10px]">{next.label}</span>
                       <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </button>
                 )}
                 <a href="#deep-dives" className="text-accent-light hover:text-white transition-colors flex items-center gap-2 group uppercase tracking-[0.3em]">
                    Read the deep dives <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                 </a>
              </div>
           </div>
         );
      })()}
    </div>
  );
}
