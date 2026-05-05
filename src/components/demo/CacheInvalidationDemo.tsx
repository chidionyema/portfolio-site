// SIMULATED — pattern walkthrough only. Wire to backend API: src/lib/api/cacheinvalidation.ts (see docs/UI_FEATURES_PLAN.md §5).

import { useState, useEffect } from 'react';
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
    }).catch(console.error);
  }, []);

  // Telemetry
  useEffect(() => {
    if (events.length > 0) {
      const lastEvent = events[0];
      if (lastEvent.action === 'remove' || lastEvent.action === 'remove_by_prefix') {
        addLog('invalidate', `L2 Invalidation Triggered`);
      }
    }
  }, [events]);

  // TTL countdown
  useEffect(() => {
    const interval = setInterval(() => {
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
      setProduct({
        name: res.product.name,
        price: res.product.price,
        version: res.product.version,
        cachedAt: new Date(),
        ttl: 60
      });
      addLog(res.cacheInfo?.isHit ? 'hit' : 'miss', `Cache ${res.cacheInfo?.isHit ? 'HIT' : 'MISS'} (Source: ${res.cacheInfo?.source})`);
    } catch (err) {
      addLog('invalidate', 'Read failed');
    }
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
      setProduct(prev => ({ ...prev, ttl: 0 }));
      setCacheStatus('stale');
    } catch (err) {}
  };

  const formatTime = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const ttlPercent = (product.ttl / 60) * 100;

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
      <div className="surface rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center justify-between">
          <span>Product Cache</span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${
            cacheStatus === 'hit' ? 'bg-success/20 text-success' :
            cacheStatus === 'miss' ? 'bg-warning/20 text-warning' :
            'bg-error/20 text-error'
          }`}>
            {cacheStatus.toUpperCase()}
          </span>
        </h3>

        <div className="space-y-4">
          <div className="p-4 bg-surface rounded-lg">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="text-xl font-semibold text-primary">{product.name}</div>
                <div className="text-2xl font-bold text-accent">£{product.price.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted">Version</div>
                <div className="font-mono text-primary">v{product.version}</div>
              </div>
            </div>

            <div className="text-xs text-muted">
              Cached at: {formatTime(product.cachedAt)}
            </div>
          </div>

          {/* TTL Bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-secondary">Cache TTL</span>
              <span className={`font-mono ${product.ttl > 60 ? 'text-success' : product.ttl > 10 ? 'text-warning' : 'text-error'}`}>
                {Math.floor(product.ttl / 60)}:{(product.ttl % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <div className="h-2 bg-surface rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  product.ttl > 60 ? 'bg-success' : product.ttl > 10 ? 'bg-warning' : 'bg-error'
                }`}
                style={{ width: `${ttlPercent}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={readFromCache}
              className="flex-1 py-2 rounded-lg border border-info/50 text-info hover:bg-info/10 transition-colors text-sm"
            >
              Read
            </button>
            <button
              onClick={manualInvalidate}
              className="flex-1 py-2 rounded-lg border border-error/50 text-error hover:bg-error/10 transition-colors text-sm"
            >
              Invalidate
            </button>
          </div>

          {/* Update Form */}
          <div className="p-4 bg-surface rounded-lg">
            <div className="text-sm text-secondary mb-2">Update Price (triggers invalidation)</div>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-1 px-3 py-2 bg-elevated rounded-lg">
                <span className="text-muted">£</span>
                <input
                  type="number"
                  step="0.01"
                  value={newPrice}
                  onChange={e => setNewPrice(e.target.value)}
                  className="flex-1 bg-transparent text-primary outline-none"
                />
              </div>
              <button
                onClick={updateProduct}
                disabled={isUpdating}
                className="px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent-light transition-colors text-sm disabled:opacity-50"
              >
                {isUpdating ? '...' : 'Update'}
              </button>
            </div>
          </div>

          <RequestReceiptHistory receipts={receipts} />
        </div>
      </div>

      {/* Invalidation Log */}
      <div className="surface rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <span>Invalidation Log</span>
          {logs.length > 0 && <span className="w-2 h-2 rounded-full bg-success animate-pulse" />}
        </h3>

        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="py-8 text-center text-secondary">
              <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" strokeWidth={1.5} />
              <p>No activity yet</p>
              <p className="text-sm text-muted mt-1">Read or update the product to see cache flow</p>
            </div>
          ) : (
            logs.map((log, i) => (
              <div
                key={log.id}
                className="flex items-center gap-2 px-3 py-2 text-sm animate-fade-in"
                style={{ animationDelay: `${i * 20}ms` }}
              >
                {(() => { const Icon = actionIcons[log.action]; return <Icon className={`w-3.5 h-3.5 shrink-0 ${actionColors[log.action]}`} strokeWidth={1.75} />; })()}
                <span className="font-mono text-xs text-muted w-16 shrink-0">{formatTime(log.timestamp)}</span>
                <span className={actionColors[log.action]}>{log.message}</span>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 p-3 bg-surface rounded-lg text-xs text-secondary">
          <strong className="text-primary">Pattern:</strong> Write-Through with Pub/Sub Invalidation.
          When data changes, publish an invalidation message so all service instances clear their cache.
        </div>
      </div>
    </div>
  );
}
