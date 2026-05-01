import { useState } from 'react';

interface StampedeResult {
  protection: string;
  dbHits: number;
  cacheHits: number;
  totalTimeMs: number;
}

export function CacheStampedeDemo() {
  const [results, setResults] = useState<StampedeResult[]>([]);
  const [isRunning, setIsRunning] = useState<string | null>(null);
  const [requestCount] = useState(100);

  const runStampede = async (protection: 'none' | 'lock' | 'probabilistic') => {
    setIsRunning(protection);

    // Simulate the stampede with realistic behavior
    await new Promise(r => setTimeout(r, 300));

    let dbHits: number;
    let totalTimeMs: number;

    if (protection === 'none') {
      // Without protection: all requests hit DB
      dbHits = requestCount;
      totalTimeMs = 50 * requestCount / 10; // Simulated parallel with some overhead
    } else if (protection === 'lock') {
      // With lock: only 1 hits DB, others wait
      dbHits = 1;
      totalTimeMs = 50 + 10; // One DB call + lock overhead
    } else {
      // Probabilistic: a few refresh early
      dbHits = Math.floor(Math.random() * 3) + 1;
      totalTimeMs = 50 + dbHits * 5;
    }

    const result: StampedeResult = {
      protection,
      dbHits,
      cacheHits: requestCount - dbHits,
      totalTimeMs,
    };

    setResults(prev => [result, ...prev.slice(0, 5)]);
    setIsRunning(null);
  };

  const protectionLabels = {
    none: { label: 'No Protection', color: 'error', icon: '⚠️' },
    lock: { label: 'Distributed Lock', color: 'success', icon: '🔒' },
    probabilistic: { label: 'Early Refresh', color: 'info', icon: '🎲' },
  };

  const latestByType = (type: string) => results.find(r => r.protection === type);

  return (
    <div className="space-y-6">
      {/* Explanation */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-3">Cache Stampede (Thundering Herd)</h3>
        <p className="text-secondary text-sm mb-4">
          When a popular cache key expires, {requestCount} concurrent requests all see a cache miss
          and hit the database simultaneously. This can overwhelm your database.
        </p>

        <div className="flex flex-wrap gap-3">
          {(['none', 'lock', 'probabilistic'] as const).map(type => {
            const config = protectionLabels[type];
            return (
              <button
                key={type}
                onClick={() => runStampede(type)}
                disabled={isRunning !== null}
                className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                  isRunning === type ? 'opacity-50' :
                  type === 'none' ? 'border-error/50 text-error hover:bg-error/10' :
                  type === 'lock' ? 'border-success/50 text-success hover:bg-success/10' :
                  'border-info/50 text-info hover:bg-info/10'
                } disabled:cursor-not-allowed`}
              >
                {isRunning === type ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <span>{config.icon}</span>
                )}
                <span className="text-sm font-medium">{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Comparison */}
      <div className="grid md:grid-cols-3 gap-4">
        {(['none', 'lock', 'probabilistic'] as const).map(type => {
          const config = protectionLabels[type];
          const result = latestByType(type);
          const dbPercent = result ? (result.dbHits / requestCount) * 100 : 0;

          return (
            <div key={type} className="glass rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">{config.icon}</span>
                <h4 className="font-semibold text-primary">{config.label}</h4>
              </div>

              {result ? (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-secondary">DB Hits</span>
                      <span className={`font-mono font-bold ${
                        result.dbHits <= 3 ? 'text-success' : result.dbHits <= 10 ? 'text-warning' : 'text-error'
                      }`}>
                        {result.dbHits}
                      </span>
                    </div>
                    <div className="h-2 bg-surface rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          result.dbHits <= 3 ? 'bg-success' : result.dbHits <= 10 ? 'bg-warning' : 'bg-error'
                        }`}
                        style={{ width: `${Math.max(dbPercent, 2)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-secondary">Cache Hits</span>
                      <span className="font-mono text-primary">{result.cacheHits}</span>
                    </div>
                    <div className="h-2 bg-surface rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-500"
                        style={{ width: `${(result.cacheHits / requestCount) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Total Time</span>
                      <span className={`font-mono font-bold ${
                        result.totalTimeMs < 100 ? 'text-success' : result.totalTimeMs < 500 ? 'text-warning' : 'text-error'
                      }`}>
                        {result.totalTimeMs}ms
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-muted text-sm">
                  Click to test
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* How It Works */}
      <div className="glass rounded-xl p-6">
        <h4 className="font-semibold text-primary mb-3">How Protection Works</h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-secondary">
          <div className="p-3 bg-surface rounded-lg">
            <strong className="text-success">🔒 Distributed Lock:</strong>
            <p className="mt-1">First request acquires a Redis lock and rebuilds cache. Other requests wait for lock release, then read from cache.</p>
          </div>
          <div className="p-3 bg-surface rounded-lg">
            <strong className="text-info">🎲 Probabilistic Early Refresh:</strong>
            <p className="mt-1">Cache items have a "soft" TTL. Random requests refresh the cache before it expires, spreading the load.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
