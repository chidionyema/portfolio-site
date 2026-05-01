import { useState, useCallback } from 'react';

interface RequestLog {
  id: string;
  timestamp: Date;
  status: 'created' | 'duplicate' | 'error';
  cached: boolean;
}

export function IdempotencyDemo() {
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID().slice(0, 8));
  const [requests, setRequests] = useState<RequestLog[]>([]);
  const [ordersCreated, setOrdersCreated] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [ttl, setTtl] = useState(0);

  const generateKey = () => setIdempotencyKey(crypto.randomUUID().slice(0, 8));

  const sendRequest = useCallback(async () => {
    setIsLoading(true);

    // Simulate API call (replace with real API when backend deployed)
    await new Promise(r => setTimeout(r, 150 + Math.random() * 100));

    const isDuplicate = requests.some(r => r.status === 'created');

    const newRequest: RequestLog = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      status: isDuplicate ? 'duplicate' : 'created',
      cached: isDuplicate,
    };

    setRequests(prev => [newRequest, ...prev.slice(0, 9)]);

    if (!isDuplicate) {
      setOrdersCreated(prev => prev + 1);
      setTtl(300); // 5 minute TTL
    }

    setIsLoading(false);
  }, [requests]);

  const reset = () => {
    setRequests([]);
    setOrdersCreated(0);
    setTtl(0);
    generateKey();
  };

  const formatTime = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Controls */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">Idempotency Key</h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted block mb-1">Current Key</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={idempotencyKey}
                onChange={e => setIdempotencyKey(e.target.value)}
                className="flex-1 px-3 py-2 bg-surface rounded-lg border border-border font-mono text-sm text-primary"
              />
              <button
                onClick={generateKey}
                className="px-3 py-2 rounded-lg bg-elevated hover:bg-border transition-colors text-sm"
              >
                New
              </button>
            </div>
          </div>

          <p className="text-sm text-secondary">
            Click "Create Order" multiple times with the same key. Only one order will be created.
          </p>

          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <button
                key={i}
                onClick={sendRequest}
                disabled={isLoading}
                className="flex-1 py-3 rounded-xl border border-accent/50 text-accent hover:bg-accent/10 transition-colors disabled:opacity-50"
              >
                {isLoading ? '...' : `Create Order`}
              </button>
            ))}
          </div>

          <button onClick={reset} className="w-full py-2 text-secondary hover:text-primary transition-colors text-sm">
            Reset Demo
          </button>
        </div>

        {/* Result */}
        <div className="mt-6 p-4 bg-surface rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-primary">{requests.length}</div>
              <div className="text-xs text-muted">Requests Sent</div>
            </div>
            <div>
              <div className={`text-3xl font-bold ${ordersCreated === 1 ? 'text-success' : 'text-primary'}`}>{ordersCreated}</div>
              <div className="text-xs text-muted">Orders Created</div>
            </div>
          </div>

          {requests.length > 1 && ordersCreated === 1 && (
            <div className="mt-4 p-3 bg-success/10 border border-success/30 rounded-lg text-sm text-success text-center">
              ✓ {requests.length - 1} duplicate requests blocked
            </div>
          )}
        </div>

        {ttl > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted mb-1">
              <span>Redis Key TTL</span>
              <span>{Math.floor(ttl / 60)}:{(ttl % 60).toString().padStart(2, '0')}</span>
            </div>
            <div className="h-1.5 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-1000"
                style={{ width: `${(ttl / 300) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Request Log */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center justify-between">
          <span>Request Log</span>
          <span className="text-xs text-muted">{requests.length} requests</span>
        </h3>

        <div className="space-y-2 max-h-[350px] overflow-y-auto">
          {requests.length === 0 ? (
            <div className="py-8 text-center text-secondary">
              <div className="text-3xl mb-2 opacity-50">🔑</div>
              <p>No requests yet</p>
              <p className="text-sm text-muted mt-1">Try creating orders with the same key</p>
            </div>
          ) : (
            requests.map((req, i) => (
              <div
                key={req.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm animate-fade-in border-l-2 ${
                  req.status === 'created' ? 'bg-success/5 border-success' :
                  req.status === 'duplicate' ? 'bg-warning/5 border-warning' : 'bg-error/5 border-error'
                }`}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <span className="text-lg">{req.status === 'created' ? '✓' : '⚡'}</span>
                <span className="font-mono text-xs text-muted w-24 shrink-0">{formatTime(req.timestamp)}</span>
                <span className="flex-1">
                  {req.status === 'created' ? 'Order Created' : 'Duplicate Blocked'}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  req.cached ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'
                }`}>
                  {req.cached ? 'Cached' : 'New'}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 p-3 bg-surface rounded-lg text-xs text-secondary">
          <strong className="text-primary">How it works:</strong> The idempotency key is stored in Redis with a TTL.
          Subsequent requests with the same key return the cached response without creating duplicates.
        </div>
      </div>
    </div>
  );
}
