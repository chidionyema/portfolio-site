// SIMULATED — pattern walkthrough only. Wire to backend API: src/lib/api/cacheinvalidation.ts (see docs/UI_FEATURES_PLAN.md §5).

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Check, X, Pencil, Trash2, Radio, ClipboardList, type LucideIcon } from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import { getCachedProduct, updateProduct as apiUpdateProduct, invalidateCache as apiInvalidateCache, getDemoProduct } from '../../lib/api/demo-client';
import { RequestReceiptHistory } from './RequestReceipt';
import type { RequestMetadata } from '../../lib/api/demo-client';

interface CacheEntry {
  name: string;
  price: number;
  version: number;
  cachedAt: Date;
  ttl: number;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  action: 'read' | 'hit' | 'miss' | 'update' | 'invalidate' | 'publish';
  message: string;
}

interface CacheTier {
  id: 'L1' | 'L2' | 'DB';
  label: string;
  sublabel: string;
  hasData: boolean;
  ttl?: number;
}

export function CacheInvalidationDemo() {
  const [product, setProduct] = useState<CacheEntry>({
    name: 'Widget Pro',
    price: 49.99,
    version: 1,
    cachedAt: new Date(),
    ttl: 60,
  });
  const [demoProductId, setDemoProductId] = useState<string | null>(null);
  const [tiers, setTiers] = useState<Record<'L1' | 'L2' | 'DB', { hasData: boolean; ttl: number }>>({
    L1: { hasData: true, ttl: 60 },
    L2: { hasData: true, ttl: 300 },
    DB: { hasData: true, ttl: -1 }
  });
  const [servingTier, setServingTier] = useState<'L1' | 'L2' | 'DB' | null>(null);
  const [invalidatingTier, setInvalidatingTier] = useState<'L1' | 'L2' | 'DB' | null>(null);
  const [pubsubPulsing, setPubsubPulsing] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<'hit' | 'miss' | 'stale'>('hit');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [newPrice, setNewPrice] = useState('59.99');
  const [isUpdating, setIsUpdating] = useState(false);
  const [receipts, setReceipts] = useState<RequestMetadata[]>([]);
  const [lastAction, setLastAction] = useState<{ label: string; tooltip: string } | null>(null);
  const [showOutcome, setShowOutcome] = useState(false);

  const { events } = useDemoSession('cache-invalidation');

  // Initial load
  useEffect(() => {
    getDemoProduct().then(data => {
      setDemoProductId(data.id);
      return getCachedProduct(data.id);
    }).then(res => {
      setProduct({
        name: res.product.name,
        price: res.product.price,
        version: res.product.version,
        cachedAt: new Date(),
        ttl: 60
      });
      setTiers(prev => ({
        ...prev,
        L1: { hasData: true, ttl: 60 },
        L2: { hasData: true, ttl: 300 }
      }));
    }).catch(console.error);
  }, []);

  // Telemetry
  useEffect(() => {
    if (events.length > 0) {
      const lastEvent = events[0];
      if (lastEvent.action === 'remove' || lastEvent.action === 'remove_by_prefix' || lastEvent.action === 'publish_invalidation') {
        if (lastEvent.action === 'publish_invalidation') {
           setPubsubPulsing(true);
           setLastAction({ label: "Cache invalidation event broadcast.", tooltip: "A small message tells every web server its cached copy is now stale." });
           setTimeout(() => setPubsubPulsing(false), 2000);
        }
        addLog('invalidate', `L2 Invalidation Triggered`);
        setTiers(prev => ({
           ...prev,
           L1: { ...prev.L1, hasData: false },
           L2: { ...prev.L2, hasData: false }
        }));
      }
    }
  }, [events]);

  // TTL countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTiers(prev => ({
        ...prev,
        L1: { ...prev.L1, ttl: Math.max(0, prev.L1.ttl - 1), hasData: prev.L1.ttl > 1 ? prev.L1.hasData : false },
        L2: { ...prev.L2, ttl: Math.max(0, prev.L2.ttl - 1), hasData: prev.L2.ttl > 1 ? prev.L2.hasData : false }
      }));
      setProduct(prev => ({
        ...prev,
        ttl: Math.max(0, prev.ttl - 1)
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const addLog = (action: LogEntry['action'], message: string) => {
    setLogs(prev => [{
      id: crypto.randomUUID(),
      timestamp: new Date(),
      action,
      message
    }, ...prev.slice(0, 9)]);
  };

  const readFromCache = async () => {
    if (!demoProductId) return;
    addLog('read', `GET /api/demo/cache/product/${demoProductId.split('-')[0]}`);
    
    try {
      const res = await getCachedProduct(demoProductId);
      setReceipts(prev => [res, ...prev].slice(0, 10));
      setCacheStatus(res.cacheInfo?.isHit ? 'hit' : 'miss');
      
      const source = res.cacheInfo?.source?.toUpperCase() || 'DB';
      const tier: 'L1' | 'L2' | 'DB' = source === 'IN_MEMORY' ? 'L1' : source === 'REDIS' ? 'L2' : 'DB';
      setServingTier(tier);
      setTimeout(() => setServingTier(null), 1000);

      setProduct({
        name: res.product.name,
        price: res.product.price,
        version: res.product.version,
        cachedAt: new Date(),
        ttl: 60
      });
      setTiers(prev => ({
         ...prev,
         L1: { hasData: true, ttl: 60 },
         L2: { hasData: true, ttl: 300 }
      }));
      addLog(res.cacheInfo?.isHit ? 'hit' : 'miss', `Cache ${res.cacheInfo?.isHit ? 'HIT' : 'MISS'} (Source: ${res.cacheInfo?.source})`);
      if (showOutcome) {
         setLastAction({ label: "Customer view refreshed.", tooltip: "" });
      }
    } catch (err) {
      addLog('invalidate', 'Read failed');
    }
  };

  const runInvalidationWave = async () => {
     setInvalidatingTier('L1');
     setLastAction({ label: "L1 caches (every web server) cleared.", tooltip: "L1 = the in-process memory cache on each instance. Fastest, but every instance has its own." });
     await new Promise(r => setTimeout(r, 600));
     setInvalidatingTier('L2');
     setLastAction({ label: "L2 cache (shared Redis) cleared.", tooltip: "L2 = shared cache across all instances. Slower than L1, but consistent." });
     await new Promise(r => setTimeout(r, 600));
     setInvalidatingTier('DB');
     await new Promise(r => setTimeout(r, 300));
     setInvalidatingTier(null);
     setShowOutcome(true);
  };

  const updateProduct = async () => {
    if (!demoProductId) return;
    setIsUpdating(true);
    setShowOutcome(false);
    const price = parseFloat(newPrice);

    addLog('update', `PUT /product/${demoProductId.split('-')[0]} - Price: £${price}`);
    setLastAction({ label: "Database: new price written.", tooltip: "" });
    
    try {
      const res = await apiUpdateProduct(demoProductId, { price });
      setReceipts(prev => [res, ...prev].slice(0, 10));
      addLog('update', `Database updated`);
      addLog('publish', `PUBLISH cache:invalidate:product:${demoProductId.split('-')[0]}`);
      setCacheStatus('stale');
      setServingTier(null);
      await runInvalidationWave();
      setTiers(prev => ({
         ...prev,
         L1: { ...prev.L1, hasData: false },
         L2: { ...prev.L2, hasData: false }
      }));
      setProduct(prev => ({ ...prev, ttl: 0 }));
    } catch (err) {
      addLog('invalidate', 'Update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  const manualInvalidate = async () => {
    if (!demoProductId) return;
    addLog('invalidate', `Manual invalidation triggered`);
    try {
      const res = await apiInvalidateCache(demoProductId);
      setReceipts(prev => [res, ...prev].slice(0, 10));
      addLog('publish', `PUBLISH cache:invalidate:product:${demoProductId.split('-')[0]}`);
      setServingTier(null);
      await runInvalidationWave();
      setTiers(prev => ({
         ...prev,
         L1: { ...prev.L1, hasData: false },
         L2: { ...prev.L2, hasData: false }
      }));
      setProduct(prev => ({ ...prev, ttl: 0 }));
      setCacheStatus('stale');
    } catch (err) {}
  };

  const formatTime = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const actionColors = {
    read: 'text-info',
    hit: 'text-success',
    miss: 'text-warning',
    update: 'text-accent',
    invalidate: 'text-error',
    publish: 'text-purple-400',
  };

  const actionIcons: Record<'read' | 'hit' | 'miss' | 'update' | 'invalidate' | 'publish', LucideIcon> = {
    read: Eye,
    hit: Check,
    miss: X,
    update: Pencil,
    invalidate: Trash2,
    publish: Radio,
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
          <Radio className="w-4 h-4 text-accent" />
          Two staff members edit the same product price at the same time. Why does every customer's checkout cart show the right number a second later?
        </h3>
        <p className="text-xs text-muted leading-relaxed">
          Press <strong>Update price</strong> on the <strong>Admin</strong> tab on the left. Watch the <strong>Customer</strong> tab on the right and the three cache-tier bars below it.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Product State */}
        <div className="space-y-6">
          <div className="surface rounded-xl p-8 shadow-2xl space-y-8 relative">
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <div className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Infrastructure tiers</div>
                   <AnimatePresence>
                      {pubsubPulsing && (
                         <motion.div 
                           initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                           className="flex items-center gap-2 text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full border border-purple-400/20"
                         >
                            <Radio className="w-3 h-3 animate-pulse" />
                            <span className="text-[8px] font-black uppercase tracking-widest">PubSub Ripple</span>
                         </motion.div>
                      )}
                   </AnimatePresence>
                </div>
                
                <div className="space-y-3 relative">
                   {[
                      { id: 'L1', label: 'L1', sublabel: 'In-process cache', ...tiers.L1 },
                      { id: 'L2', label: 'L2', sublabel: 'Redis cluster', ...tiers.L2 },
                      { id: 'DB', label: 'DB', sublabel: 'PostgreSQL', ...tiers.DB }
                   ].map((tier) => (
                      <div key={tier.id} className="relative group">
                         <div className="flex items-center justify-between mb-1.5 px-1">
                            <div className="flex items-center gap-3">
                               <span className={`text-xs font-black font-mono px-2 py-0.5 rounded transition-all ${tier.hasData ? (servingTier === tier.id ? 'bg-success text-white scale-110 shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'bg-accent/20 text-accent') : 'bg-white/5 text-muted'}`}>
                                  {tier.label}
                               </span>
                               <span className="text-[10px] text-muted font-medium uppercase tracking-tighter opacity-60">{tier.sublabel}</span>
                            </div>
                            {tier.hasData && tier.ttl !== -1 && (
                               <span className="text-[10px] font-mono text-accent tabular-nums">TTL: {tier.ttl}s</span>
                            )}
                         </div>
                         <div className={`h-4 rounded-full overflow-hidden border transition-all relative ${servingTier === tier.id ? 'border-success/50 ring-2 ring-success/20' : (invalidatingTier === tier.id ? 'border-error/50 ring-2 ring-error/20' : 'border-white/5')}`}>
                            <motion.div
                              animate={{ 
                                 width: tier.hasData && invalidatingTier !== tier.id ? (tier.ttl === -1 ? '100%' : `${(tier.ttl / (tier.id === 'L1' ? 60 : 300)) * 100}%`) : '0%',
                                 backgroundColor: invalidatingTier === tier.id ? '#ef4444' : (servingTier === tier.id ? '#22c55e' : (tier.hasData ? (tier.ttl === -1 ? '#3b82f6' : '#6366f1') : 'rgba(255,255,255,0.05)'))
                              }}
                              transition={{ duration: invalidatingTier === tier.id ? 0.3 : 1 }}
                              className="h-full shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                            />
                            {(!tier.hasData || invalidatingTier === tier.id) && (
                               <div className="absolute inset-0 flex items-center justify-center">
                                  <span className={`text-[8px] font-black uppercase tracking-widest italic ${invalidatingTier === tier.id ? 'text-white' : 'text-muted/30'}`}>
                                     {invalidatingTier === tier.id ? 'Evicting...' : 'Invalidated'}
                                  </span>
                               </div>
                            )}
                         </div>
                      </div>
                   ))}

                   <AnimatePresence>
                     {lastAction && (
                       <motion.div
                         key={lastAction.label}
                         initial={{ opacity: 0, x: 20 }}
                         animate={{ opacity: 1, x: 0 }}
                         exit={{ opacity: 0 }}
                         onAnimationComplete={() => setTimeout(() => setLastAction(null), 3000)}
                         className="absolute -right-4 top-1/2 -translate-y-1/2 translate-x-full whitespace-nowrap text-[10px] font-bold text-accent-light bg-accent/5 px-2 py-1 border border-accent/20 z-30"
                       >
                         <abbr title={lastAction.tooltip} className="no-underline cursor-help">
                           {lastAction.label}
                         </abbr>
                       </motion.div>
                     )}
                   </AnimatePresence>
                </div>
             </div>

             <div className="pt-8 border-t border-white/5 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[10px] font-black text-muted uppercase tracking-widest mb-1.5">Admin view</div>
                    <div className="text-2xl font-black text-primary tracking-tighter leading-none">{product.name}</div>
                    <div className="text-[10px] font-mono text-muted/60 mt-2">UUID: {demoProductId?.split('-')[0] || '---'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black text-muted uppercase tracking-widest mb-1.5">Version</div>
                    <div className="text-2xl font-black text-accent tabular-nums leading-none">v{product.version}</div>
                  </div>
                </div>

                <div className="p-5 glass-subtle rounded-2xl border border-white/10 flex items-center justify-between">
                   <div className="space-y-1">
                      <div className="text-[10px] font-black text-muted uppercase tracking-widest opacity-60">Price_Retail</div>
                      <div className="text-3xl font-black text-primary">£{product.price.toFixed(2)}</div>
                   </div>
                   <div className={`px-4 py-2 rounded-xl border flex flex-col items-center justify-center min-w-[80px] ${
                      cacheStatus === 'hit' ? 'bg-success/10 border-success/30 text-success' :
                      cacheStatus === 'miss' ? 'bg-warning/10 border-warning/30 text-warning' :
                      'bg-error/10 border-error/30 text-error'
                   }`}>
                      <span className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-60">Status</span>
                      <span className="text-xs font-black uppercase">{cacheStatus}</span>
                   </div>
                </div>
             </div>

             <div className="space-y-4 pt-4">
                <div className="flex gap-2">
                  <button
                    onClick={readFromCache}
                    className="flex-1 py-4 bg-accent text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl shadow-[0_10px_30px_-5px_rgba(99,102,241,0.5)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    <Eye className="w-4 h-4" />
                    Read product
                  </button>
                  <button
                    onClick={manualInvalidate}
                    className="py-4 px-6 glass rounded-xl text-[10px] font-black uppercase tracking-widest text-error hover:bg-error/10 transition-all border border-error/20"
                  >
                    Clear all
                  </button>
                </div>

                <div className="p-5 glass rounded-2xl border border-white/5 space-y-4">
                  <div className="text-[10px] font-black text-muted uppercase tracking-widest">Update retail price</div>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-1 px-4 py-3 bg-white/5 rounded-xl border border-white/10">
                      <span className="text-muted/40 font-mono text-sm">£</span>
                      <input
                        type="number"
                        step="0.01"
                        value={newPrice}
                        onChange={e => setNewPrice(e.target.value)}
                        className="flex-1 bg-transparent text-primary font-black outline-none text-sm"
                      />
                    </div>
                    <button
                      onClick={updateProduct}
                      disabled={isUpdating}
                      className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-white/10 transition-all disabled:opacity-20"
                    >
                      {isUpdating ? '...' : 'Update price'}
                    </button>
                  </div>
                </div>
             </div>

             <RequestReceiptHistory receipts={receipts} />
          </div>

          <AnimatePresence>
            {showOutcome && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 border border-success/30 bg-success/5 text-primary text-xs leading-relaxed shadow-xl"
              >
                ✓ The customer sees the new price within 200ms. <strong>Without this pattern</strong>, the customer sees yesterday's price until each cache happens to expire — anywhere from seconds to hours. That's how customers end up checking out at the wrong total and you find out from a refund ticket.
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Invalidation Log */}
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
             <Radio className="w-4 h-4 text-accent" />
             Invalidation Log
          </h3>

          <div className="surface p-8 shadow-2xl space-y-6">
            <div className="space-y-1 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
              {logs.length === 0 ? (
                <div className="py-12 text-center">
                  <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-10" strokeWidth={1} />
                  <p className="text-[10px] font-mono text-muted uppercase tracking-[0.4em]">Listening for events…</p>
                </div>
              ) : (
                logs.map((log, i) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4 py-3 border-b border-white/5 group"
                  >
                    <div className={`p-2 rounded-lg ${actionColors[log.action].replace('text-', 'bg-')}/10 ${actionColors[log.action]}`}>
                       {(() => { const Icon = actionIcons[log.action]; return <Icon className="w-3.5 h-3.5" />; })()}
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${actionColors[log.action]}`}>{log.action}</span>
                          <span className="font-mono text-[9px] text-muted/40">{formatTime(log.timestamp)}</span>
                       </div>
                       <div className="text-xs font-medium text-secondary truncate">{log.message}</div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <div className="p-6 border-t border-white/5 pt-8">
              <div className="font-mono text-[10px] text-muted/50 uppercase tracking-widest">
                Pattern: cache-aside + pub/sub invalidation across L1 and L2. Code: <code>src/Catalog/Catalog.Application/Cache/ProductCacheInvalidationConsumer.cs</code>.
                The hard part wasn't the cache; it was making the invalidation message survive a broker outage — see the §3 outbox demo on the homepage.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
