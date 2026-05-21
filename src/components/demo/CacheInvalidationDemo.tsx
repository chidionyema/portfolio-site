import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Check, X, Pencil, Trash2, Radio, ClipboardList, RefreshCcw } from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import { getCachedProduct, updateProduct as apiUpdateProduct, invalidateCache as apiInvalidateCache, getDemoProduct } from '../../lib/api/demo-client';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Heading } from '../ui/Heading';
import { Stack } from '../ui/Stack';
import { Pill } from '../ui/Pill';
import { Glass } from '../ui/Glass';
import { cn } from '../../lib/utils';
import type { RequestMetadata } from '../../lib/api/demo-client';
import { RequestReceipt } from './RequestReceipt';
import { RealSystemBanner } from './RealSystemBanner';
import { WhatToWatch } from './WhatToWatch';

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

export function CacheInvalidationDemo() {
  const [product, setProduct] = useState<CacheEntry>({
    name: 'Widget Pro',
    price: 49.99,
    version: 1,
    cachedAt: new Date(),
    ttl: 60,
  });
  const [demoProductId, setDemoProductId] = useState<string | null>(null);
  const [cacheStatus, setCacheStatus] = useState<'hit' | 'miss' | 'stale'>('hit');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [newPrice, setNewPrice] = useState('59.99');
  const [isUpdating, setIsUpdating] = useState(false);
  const [receipts, setReceipts] = useState<RequestMetadata[]>([]);
  const [receipt, setReceipt] = useState<RequestMetadata | null>(null);

  const { executeCommand, events, metadata } = useDemoSession('cache-invalidation');

  const [tiers, setTiers] = useState<Array<{ id: string; label: string; color: string; status: 'cached' | 'origin' | 'serving' }>>([
    { id: 'l1', label: 'L1 (Memory)', color: 'text-accent', status: 'cached' },
    { id: 'l2', label: 'L2 (Redis)', color: 'text-primary', status: 'cached' },
    { id: 'db', label: 'PostgreSQL', color: 'text-success', status: 'origin' },
  ]);

  const [waveActive, setWaveActive] = useState(false);

  // Seed demo product on mount
  useEffect(() => {
    getDemoProduct().then(res => {
      if (res?.id) setDemoProductId(res.id);
    }).catch(() => {});
  }, []);

  const addLog = (action: LogEntry['action'], message: string) => {
    setLogs(prev => [{
      id: crypto.randomUUID(),
      timestamp: new Date(),
      action,
      message
    }, ...prev].slice(0, 10));
  };

  const handleRead = async () => {
    setIsUpdating(true);
    addLog('read', 'GET /api/catalog/products/demo');
    try {
      if (demoProductId) {
        const p = await getCachedProduct(demoProductId);
        setReceipt(p as RequestMetadata);
        setProduct({
          name: p.product?.name ?? 'Widget Pro',
          price: p.product?.price ?? 49.99,
          version: p.product?.version ?? 1,
          cachedAt: new Date(),
          ttl: p.cacheInfo?.ttlSeconds ?? 60,
        });
        
        const source = p.cacheInfo?.source?.toLowerCase() ?? 'l1';
        setTiers(prev => prev.map(t => ({
          ...t,
          status: t.id === source ? 'serving' : (t.id === 'db' ? 'origin' : 'cached')
        })));
        
        setCacheStatus('hit');
        addLog('hit', `Returned from ${p.cacheInfo?.source ?? 'Cache'}`);
        
        setTimeout(() => {
          setTiers(prev => prev.map(t => ({
            ...t,
            status: t.id === 'db' ? 'origin' : 'cached'
          })));
        }, 1000);
      }
    } catch (e) {
      setCacheStatus('miss');
      addLog('miss', 'Cache miss. Fetched from PostgreSQL.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    addLog('update', `PUT /api/catalog/products/${demoProductId}`);
    try {
      if (demoProductId) {
        const r = await apiUpdateProduct(demoProductId, { price: parseFloat(newPrice) });
        setReceipt(r as RequestMetadata);
        
        // Start Invalidation Wave
        setWaveActive(true);
        addLog('publish', 'Committed to DB + Published ProductCacheInvalidatedEvent');
        
        // Staggered eviction animation
        setTimeout(() => addLog('invalidate', 'Pub/Sub: Evicting L1...'), 200);
        setTimeout(() => addLog('invalidate', 'Pub/Sub: Evicting L2...'), 500);
        
        setTimeout(() => {
          setWaveActive(false);
          setCacheStatus('stale');
        }, 1200);
      }
    } catch (e) {
      addLog('update', 'Failed to update database');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInvalidate = async () => {
    setIsUpdating(true);
    addLog('invalidate', 'Received MassTransit Event: Evicting cache key');
    try {
      if (demoProductId) {
        const r = await apiInvalidateCache(demoProductId);
        setReceipt(r as RequestMetadata);
        setCacheStatus('miss');
        addLog('invalidate', 'HybridCache.RemoveAsync(key) complete');
      }
    } catch (e) {
      addLog('invalidate', 'Failed to invalidate cache');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <RealSystemBanner metadata={metadata} />
      <WhatToWatch demoId="cache" />

      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5 font-mono text-[10px] text-muted">
        <span className="font-black uppercase tracking-widest text-accent">Flow:</span>
        <span>Write → Pub/Sub Event → All Nodes Evict</span>
        <span className="ml-auto text-warning/70 font-black uppercase tracking-widest whitespace-nowrap">Stale window: ~50ms while event propagates</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
      <Stack gap={6}>
        <div className="flex items-center justify-between">
          <Heading variant="caption" className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-accent" />
            Three-Tier Cache Ladder
          </Heading>
        </div>

        <Card variant="panel-dark" padding="lg">
          <Stack gap={8} className="font-mono">
            {/* Ladder UI */}
            <div className="space-y-3">
              {tiers.map((tier, i) => (
                <div key={tier.id} className="relative">
                  <div className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all duration-300",
                    tier.status === 'serving' ? "bg-accent/10 border-accent shadow-[0_0_15px_rgba(99,102,241,0.3)]" : "bg-black/40 border-white/5",
                    waveActive && i < 2 && "opacity-50"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn("w-2 h-2 rounded-full", tier.status === 'serving' ? "bg-accent animate-pulse" : "bg-white/10")} />
                      <span className={cn("text-[10px] font-black uppercase tracking-widest", tier.status === 'serving' ? "text-primary" : "text-muted")}>
                        {tier.label}
                      </span>
                    </div>
                    {tier.status === 'serving' && (
                      <Pill variant="status" className="text-[8px] px-1.5 py-0">SERVING</Pill>
                    )}
                  </div>
                  
                  {/* Wave effect */}
                  {waveActive && i < 2 && (
                    <motion.div
                      initial={{ left: 0, opacity: 0 }}
                      animate={{ left: '100%', opacity: [0, 1, 0] }}
                      transition={{ duration: 0.6, delay: i * 0.2 }}
                      className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-error/40 to-transparent z-10"
                    />
                  )}
                </div>
              ))}
            </div>

            <Stack gap={4}>
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted/90">
                <span>Product State</span>
                <Pill variant={cacheStatus === 'hit' ? 'success' : cacheStatus === 'stale' ? 'warning' : 'status'}>
                  {cacheStatus === 'hit' ? 'SYNCED' : cacheStatus === 'stale' ? 'STALE_WAITING' : 'EVICTED'}
                </Pill>
              </div>

              <div className="p-6 bg-black/40 rounded-xl border border-white/5 relative overflow-hidden">
                {cacheStatus === 'stale' && (
                  <div className="absolute inset-0 bg-warning/5 animate-pulse pointer-events-none" />
                )}
                <Stack gap={4}>
                  <div className="flex justify-between items-end">
                    <span className="text-sm text-secondary font-bold">{product.name}</span>
                    <span className={cn(
                      "text-2xl font-black tabular-nums transition-colors",
                      cacheStatus === 'stale' ? 'text-warning' : 'text-primary'
                    )}>
                      ${product.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-muted border-t border-white/10 pt-4">
                    <span>V{product.version}</span>
                    <span className="flex items-center gap-1">
                      <RefreshCcw className={cn("w-3 h-3", cacheStatus === 'miss' && 'animate-spin text-accent')} />
                      {cacheStatus === 'hit' ? 'CACHED' : 'FETCHING'}
                    </span>
                  </div>
                </Stack>
              </div>
            </Stack>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="primary"
                onClick={handleUpdate}
                disabled={isUpdating}
                className="w-full h-auto py-4 font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2"
              >
                <Pencil className="w-4 h-4" />
                Update DB
              </Button>
              <Button
                variant="secondary"
                onClick={handleInvalidate}
                disabled={isUpdating || cacheStatus !== 'stale'}
                className={cn(
                  "w-full h-auto py-4 font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2",
                  cacheStatus === 'stale' ? 'text-warning border-warning/30 hover:bg-warning/10' : ''
                )}
              >
                <Trash2 className="w-4 h-4" />
                Simulate Event
              </Button>
            </div>
            
            <Button
              variant="ghost"
              onClick={handleRead}
              disabled={isUpdating}
              className="w-full py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 bg-white/10"
            >
              <Eye className="w-4 h-4" />
              Read from Cache
            </Button>

            <RequestReceipt
              traceId={receipt?.traceId}
              latencyMs={receipt?.latencyMs}
              statusCode={receipt?.statusCode}
              service={receipt?.service}
            />
          </Stack>
        </Card>
      </Stack>

      <Stack gap={6}>
        <Heading variant="caption" className="flex items-center gap-2.5">
          <ClipboardList className="w-4 h-4 text-muted" />
          Event Log
        </Heading>

        <Card variant="panel-dark" padding="none" className="h-[440px] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto font-mono text-[11px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0d0d12] border-b border-white/10 z-10 text-muted/90 uppercase text-[10px] font-black tracking-widest">
                <tr>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Message</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-24 text-center text-muted/80 italic uppercase tracking-[0.4em] font-black">
                        Waiting for cache events...
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="group border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest",
                            log.action === 'read' ? 'bg-white/10 text-white' :
                            log.action === 'hit' ? 'bg-success/10 text-success border border-success/20' :
                            log.action === 'miss' ? 'bg-warning/10 text-warning border border-warning/20' :
                            log.action === 'update' ? 'bg-accent/10 text-accent border border-accent/20' :
                            log.action === 'invalidate' ? 'bg-error/10 text-error border border-error/20' :
                            'bg-primary/10 text-primary border border-primary/20'
                          )}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted/80 leading-relaxed">
                          {log.message}
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </Card>
      </Stack>
      </div>
    </div>
  );
}
