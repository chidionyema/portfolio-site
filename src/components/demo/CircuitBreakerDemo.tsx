import { useState, useCallback, useEffect } from 'react';

type CircuitState = 'closed' | 'open' | 'half-open';

interface RequestLog {
  id: string;
  timestamp: Date;
  status: 'success' | 'error' | 'rejected';
  duration: number;
  message: string;
}

export function CircuitBreakerDemo() {
  const [circuitState, setCircuitState] = useState<CircuitState>('closed');
  const [failures, setFailures] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const THRESHOLD = 5;
  const RESET_TIME = 10000;

  useEffect(() => {
    if (circuitState !== 'open') return;
    const end = Date.now() + RESET_TIME;
    const interval = setInterval(() => {
      const remaining = Math.max(0, end - Date.now());
      setCountdown(remaining);
      if (remaining <= 0) {
        setCircuitState('half-open');
        setCountdown(0);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [circuitState]);

  const addLog = useCallback((log: Omit<RequestLog, 'id' | 'timestamp'>) => {
    setLogs(prev => [{ id: crypto.randomUUID(), timestamp: new Date(), ...log }, ...prev.slice(0, 19)]);
  }, []);

  const sendRequest = async () => {
    setIsLoading(true);
    const delay = 50 + Math.random() * 50;

    if (circuitState === 'open') {
      addLog({ status: 'rejected', duration: 2, message: 'Circuit OPEN - Rejected immediately' });
      setIsLoading(false);
      return;
    }

    await new Promise(r => setTimeout(r, delay));

    if (isSimulating) {
      const newFailures = failures + 1;
      setFailures(newFailures);
      addLog({ status: 'error', duration: 5000, message: `503 Error (${newFailures}/${THRESHOLD})` });

      if (newFailures >= THRESHOLD) {
        setCircuitState('open');
        addLog({ status: 'error', duration: 0, message: 'CIRCUIT OPENED' });
      }
    } else {
      if (circuitState === 'half-open') {
        setCircuitState('closed');
        setFailures(0);
        addLog({ status: 'success', duration: delay, message: '200 OK - Circuit recovered!' });
      } else {
        addLog({ status: 'success', duration: delay, message: '200 OK' });
      }
    }
    setIsLoading(false);
  };

  const reset = () => {
    setCircuitState('closed');
    setFailures(0);
    setIsSimulating(false);
    setCountdown(0);
  };

  const stateColors = { closed: 'bg-success', open: 'bg-error', 'half-open': 'bg-warning' };
  const stateGlow = { closed: 'shadow-success/30', open: 'shadow-error/30', 'half-open': 'shadow-warning/30' };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* State */}
      <div className="glass rounded-xl p-6 text-center">
        <h3 className="text-lg font-semibold text-primary mb-6">Circuit State</h3>

        <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center ${stateColors[circuitState]} shadow-[0_0_40px] ${stateGlow[circuitState]} ${circuitState === 'open' ? 'animate-pulse' : ''}`}>
          <div className="text-center text-white">
            <div className="text-xl font-bold uppercase">{circuitState}</div>
            {circuitState === 'open' && countdown > 0 && (
              <div className="text-sm opacity-80">{Math.ceil(countdown / 1000)}s</div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="text-sm text-secondary mb-2">Consecutive Failures</div>
          <div className="flex justify-center gap-1">
            {Array.from({ length: THRESHOLD }).map((_, i) => (
              <div key={i} className={`w-3 h-3 rounded-full transition-colors ${i < failures ? 'bg-error' : 'bg-border'}`} />
            ))}
          </div>
          <div className="text-xs text-muted mt-1">{failures} / {THRESHOLD}</div>
        </div>

        <div className="mt-6 p-3 bg-surface rounded-lg">
          <div className="flex items-center justify-center gap-2 text-xs font-mono">
            <span className={`px-2 py-1 rounded ${circuitState === 'closed' ? 'bg-success/20 text-success' : 'text-muted'}`}>CLOSED</span>
            <span className="text-muted">→</span>
            <span className={`px-2 py-1 rounded ${circuitState === 'open' ? 'bg-error/20 text-error' : 'text-muted'}`}>OPEN</span>
            <span className="text-muted">→</span>
            <span className={`px-2 py-1 rounded ${circuitState === 'half-open' ? 'bg-warning/20 text-warning' : 'text-muted'}`}>HALF-OPEN</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="glass rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-primary">Controls</h3>

        <button
          onClick={() => setIsSimulating(!isSimulating)}
          className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${isSimulating ? 'bg-success/20 border border-success/30 text-success' : 'bg-error/20 border border-error/30 text-error hover:bg-error/30'}`}
        >
          {isSimulating ? '✓ Stop Failure Simulation' : '⚠ Simulate Provider Failure'}
        </button>

        <button
          onClick={sendRequest}
          disabled={isLoading}
          className="w-full py-3 rounded-xl border border-accent/50 text-accent hover:bg-accent/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? '⏳ Sending...' : '⚡ Send Request'}
        </button>

        <button onClick={reset} className="w-full py-2 text-secondary hover:text-primary transition-colors text-sm">
          Reset Circuit
        </button>

        {isSimulating && (
          <div className="p-3 bg-error/10 border border-error/30 rounded-lg text-sm text-error">
            Failure simulation active. Requests will fail until circuit opens.
          </div>
        )}
      </div>

      {/* Request Log */}
      <div className="lg:col-span-2 glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center justify-between">
          <span>Request Log</span>
          <span className="text-xs text-muted">{logs.length} requests</span>
        </h3>
        <div className="max-h-[250px] overflow-y-auto space-y-1">
          {logs.length === 0 ? (
            <div className="py-8 text-center text-secondary">
              <div className="text-3xl mb-2 opacity-50">⏳</div>
              <p>No requests yet</p>
              <p className="text-sm text-muted">Click "Send Request" to begin</p>
            </div>
          ) : (
            logs.map((log, i) => (
              <div
                key={log.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm animate-fade-in border-l-2 ${
                  log.status === 'success' ? 'bg-success/5 border-success' :
                  log.status === 'error' ? 'bg-error/5 border-error' : 'bg-warning/5 border-warning'
                }`}
                style={{ animationDelay: `${i * 20}ms` }}
              >
                <span className="text-lg">{log.status === 'success' ? '✓' : log.status === 'error' ? '✗' : '⚡'}</span>
                <span className="font-mono text-xs text-muted w-20 shrink-0">{log.timestamp.toLocaleTimeString()}</span>
                <span className="flex-1">{log.message}</span>
                <span className="font-mono text-xs text-muted">{log.duration}ms</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
