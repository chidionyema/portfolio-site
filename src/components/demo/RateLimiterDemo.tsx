import { useState, useEffect, useCallback } from 'react';

interface RequestLog {
  id: string;
  timestamp: Date;
  status: 'allowed' | 'limited';
  remaining: number;
}

export function RateLimiterDemo() {
  const [tokens, setTokens] = useState(10);
  const [maxTokens] = useState(10);
  const [windowSeconds] = useState(10);
  const [requests, setRequests] = useState<RequestLog[]>([]);
  const [retryAfter, setRetryAfter] = useState(0);
  const [isRefilling, setIsRefilling] = useState(false);

  // Token refill
  useEffect(() => {
    const interval = setInterval(() => {
      setTokens(prev => {
        if (prev < maxTokens) {
          setIsRefilling(true);
          setTimeout(() => setIsRefilling(false), 300);
          return Math.min(prev + 1, maxTokens);
        }
        return prev;
      });

      setRetryAfter(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [maxTokens]);

  const sendRequest = useCallback(async () => {
    if (tokens > 0) {
      setTokens(prev => prev - 1);
      setRequests(prev => [{
        id: crypto.randomUUID(),
        timestamp: new Date(),
        status: 'allowed',
        remaining: tokens - 1
      }, ...prev.slice(0, 19)]);
    } else {
      setRetryAfter(windowSeconds);
      setRequests(prev => [{
        id: crypto.randomUUID(),
        timestamp: new Date(),
        status: 'limited',
        remaining: 0
      }, ...prev.slice(0, 19)]);
    }
  }, [tokens, windowSeconds]);

  const sendBurst = async (count: number) => {
    for (let i = 0; i < count; i++) {
      await sendRequest();
      await new Promise(r => setTimeout(r, 50));
    }
  };

  const reset = () => {
    setTokens(maxTokens);
    setRequests([]);
    setRetryAfter(0);
  };

  const formatTime = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });

  const allowedCount = requests.filter(r => r.status === 'allowed').length;
  const limitedCount = requests.filter(r => r.status === 'limited').length;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Token Bucket */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">Token Bucket</h3>

        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-secondary">Available Tokens</span>
            <span className={`font-mono font-bold ${
              tokens > 5 ? 'text-success' : tokens > 2 ? 'text-warning' : 'text-error'
            }`}>
              {tokens} / {maxTokens}
            </span>
          </div>

          {/* Visual token bucket */}
          <div className="flex gap-1.5 justify-center p-4 bg-surface rounded-lg">
            {Array.from({ length: maxTokens }).map((_, i) => (
              <div
                key={i}
                className={`w-6 h-6 rounded-full transition-all duration-300 ${
                  i < tokens
                    ? `bg-success ${isRefilling && i === tokens - 1 ? 'scale-125' : ''}`
                    : 'bg-border'
                }`}
              />
            ))}
          </div>

          <div className="text-xs text-muted text-center mt-2">
            Refills 1 token/second • {windowSeconds}s window
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => sendRequest()}
              className="flex-1 py-3 rounded-xl border border-accent/50 text-accent hover:bg-accent/10 transition-colors"
            >
              Send 1
            </button>
            <button
              onClick={() => sendBurst(5)}
              className="flex-1 py-3 rounded-xl border border-warning/50 text-warning hover:bg-warning/10 transition-colors"
            >
              Burst 5
            </button>
            <button
              onClick={() => sendBurst(15)}
              className="flex-1 py-3 rounded-xl border border-error/50 text-error hover:bg-error/10 transition-colors"
            >
              Burst 15
            </button>
          </div>

          <button
            onClick={reset}
            className="w-full py-2 text-secondary hover:text-primary transition-colors text-sm"
          >
            Reset
          </button>
        </div>

        {/* Retry After */}
        {retryAfter > 0 && (
          <div className="mt-4 p-4 bg-error/10 border border-error/30 rounded-lg animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-error font-medium">Rate Limited!</span>
              <span className="font-mono text-error">Retry-After: {retryAfter}s</span>
            </div>
            <div className="h-1.5 bg-error/20 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-error rounded-full transition-all duration-1000"
                style={{ width: `${(retryAfter / windowSeconds) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="p-3 bg-surface rounded-lg text-center">
            <div className="text-2xl font-bold text-success">{allowedCount}</div>
            <div className="text-xs text-muted">Allowed (200)</div>
          </div>
          <div className="p-3 bg-surface rounded-lg text-center">
            <div className="text-2xl font-bold text-error">{limitedCount}</div>
            <div className="text-xs text-muted">Limited (429)</div>
          </div>
        </div>
      </div>

      {/* Request Log */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center justify-between">
          <span>Request Log</span>
          <span className="text-xs text-muted">{requests.length} requests</span>
        </h3>

        <div className="space-y-1 max-h-[350px] overflow-y-auto">
          {requests.length === 0 ? (
            <div className="py-8 text-center text-secondary">
              <div className="text-3xl mb-2 opacity-50">🚦</div>
              <p>No requests yet</p>
              <p className="text-sm text-muted mt-1">Try sending requests to see rate limiting</p>
            </div>
          ) : (
            requests.map((req, i) => (
              <div
                key={req.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm animate-fade-in border-l-2 ${
                  req.status === 'allowed' ? 'bg-success/5 border-success' : 'bg-error/5 border-error'
                }`}
                style={{ animationDelay: `${i * 20}ms` }}
              >
                <span className={`text-lg ${req.status === 'allowed' ? 'text-success' : 'text-error'}`}>
                  {req.status === 'allowed' ? '✓' : '⚡'}
                </span>
                <span className="font-mono text-xs text-muted w-24 shrink-0">{formatTime(req.timestamp)}</span>
                <span className="flex-1">
                  {req.status === 'allowed' ? '200 OK' : '429 Too Many Requests'}
                </span>
                <span className={`font-mono text-xs ${
                  req.remaining > 5 ? 'text-success' : req.remaining > 0 ? 'text-warning' : 'text-error'
                }`}>
                  {req.remaining} left
                </span>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 p-3 bg-surface rounded-lg text-xs text-secondary">
          <strong className="text-primary">Pattern:</strong> Token Bucket with sliding window.
          Each client gets {maxTokens} requests per {windowSeconds} seconds. Tokens refill gradually.
        </div>
      </div>
    </div>
  );
}
