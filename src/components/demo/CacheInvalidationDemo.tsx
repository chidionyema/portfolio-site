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
    } catch (err) {
      addLog('invalidate', 'Read failed');
    }
  };

  const runInvalidationWave = async () => {
     setInvalidatingTier('L1');
     await new Promise(r => setTimeout(r, 300));
     setInvalidatingTier('L2');
     await new Promise(r => setTimeout(r, 300));
     setInvalidatingTier('DB');
     await new Promise(r => setTimeout(r, 300));
     setInvalidatingTier(null);
  };

  const updateProduct = async () => {
    if (!demoProductId) return;
    setIsUpdating(true);
    const price = parseFloat(newPrice);

    addLog('update', `PUT /product/${demoProductId.split('-')[0]} - Price: £${price}`);
    
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
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Product State */}
      <div className="space-y-6">
        <div className="surface rounded-xl p-8 shadow-2xl space-y-8">
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
              
              <div className="space-y-3">
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
              </div>
           </div>

           <div className="pt-8 border-t border-white/5 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-black text-muted uppercase tracking-widest mb-1.5">Selected product</div>
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
                    {isUpdating ? '...' : 'Push Update'}
                  </button>
                </div>
              </div>
           </div>

           <RequestReceiptHistory receipts={receipts} />
        </div>
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

          <div className="p-4 bg-accent/5 border border-accent/10 rounded-xl">
            <div className="text-[10px] font-black text-accent uppercase tracking-widest mb-1.5">Pattern: Write-Through + Pub/Sub</div>
            <p className="text-[10px] text-muted font-medium leading-relaxed italic opacity-80">
               When the Database (DB) is updated, a Pub/Sub invalidation message is broadcast to all active service instances (L1) and the global cache (L2).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
