import { useState, useEffect } from 'react';

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
  const [cacheStatus, setCacheStatus] = useState<'hit' | 'miss' | 'stale'>('hit');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [newPrice, setNewPrice] = useState('59.99');
  const [isUpdating, setIsUpdating] = useState(false);

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
    addLog('read', `GET /product/123`);
    await new Promise(r => setTimeout(r, 50));

    if (product.ttl > 0) {
      setCacheStatus('hit');
      addLog('hit', `Cache HIT - TTL: ${product.ttl}s`);
    } else {
      setCacheStatus('miss');
      addLog('miss', `Cache MISS - fetching from DB`);
      await new Promise(r => setTimeout(r, 100));
      setProduct(prev => ({
        ...prev,
        cachedAt: new Date(),
        ttl: 300
      }));
      addLog('hit', `Cache populated from DB`);
    }
  };

  const updateProduct = async () => {
    setIsUpdating(true);
    const price = parseFloat(newPrice);

    addLog('update', `PUT /product/123 - Price: £${price}`);
    await new Promise(r => setTimeout(r, 100));

    addLog('update', `Database updated`);
    await new Promise(r => setTimeout(r, 50));

    addLog('invalidate', `DEL cache:product:123`);
    await new Promise(r => setTimeout(r, 30));

    addLog('publish', `PUBLISH cache:invalidate → All instances notified`);
    await new Promise(r => setTimeout(r, 50));

    setProduct(prev => ({
      ...prev,
      price,
      version: prev.version + 1,
      cachedAt: new Date(),
      ttl: 300
    }));

    setCacheStatus('miss');
    addLog('miss', `Next read will fetch fresh data`);

    setIsUpdating(false);
  };

  const manualInvalidate = async () => {
    addLog('invalidate', `Manual invalidation triggered`);
    await new Promise(r => setTimeout(r, 30));
    addLog('publish', `PUBLISH cache:invalidate:product:123`);
    setProduct(prev => ({ ...prev, ttl: 0 }));
    setCacheStatus('stale');
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

  const actionIcons = {
    read: '📖',
    hit: '✓',
    miss: '✗',
    update: '✏️',
    invalidate: '🗑️',
    publish: '📡',
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Product State */}
      <div className="glass rounded-xl p-6">
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
        </div>
      </div>

      {/* Invalidation Log */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <span>Invalidation Log</span>
          {logs.length > 0 && <span className="w-2 h-2 rounded-full bg-success animate-pulse" />}
        </h3>

        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="py-8 text-center text-secondary">
              <div className="text-3xl mb-2 opacity-50">📋</div>
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
                <span>{actionIcons[log.action]}</span>
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
