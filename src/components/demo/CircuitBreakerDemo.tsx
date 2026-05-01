import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, AlertTriangle, Check, X, Clock, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { cn, formatDuration } from '../../lib/utils';

type CircuitState = 'closed' | 'open' | 'half-open';

interface RequestLog {
  id: string;
  timestamp: Date;
  status: 'success' | 'error' | 'rejected';
  duration: number;
  message: string;
}

interface CircuitBreakerDemoProps {
  apiUrl?: string;
  threshold?: number;
  resetTimeout?: number;
}

export function CircuitBreakerDemo({
  threshold = 5,
  resetTimeout = 10000,
}: CircuitBreakerDemoProps) {
  const [circuitState, setCircuitState] = useState<CircuitState>('closed');
  const [failures, setFailures] = useState(0);
  const [isSimulatingFailure, setIsSimulatingFailure] = useState(false);
  const [requestLogs, setRequestLogs] = useState<RequestLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nextRetryTime, setNextRetryTime] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for half-open state
  useEffect(() => {
    if (circuitState !== 'open' || !nextRetryTime) {
      setCountdown(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, nextRetryTime.getTime() - Date.now());
      setCountdown(remaining);

      if (remaining <= 0) {
        setCircuitState('half-open');
        setNextRetryTime(null);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [circuitState, nextRetryTime]);

  const addLog = useCallback((log: Omit<RequestLog, 'id' | 'timestamp'>) => {
    setRequestLogs((prev) => [
      {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        ...log,
      },
      ...prev.slice(0, 19), // Keep last 20 logs
    ]);
  }, []);

  const simulateRequest = useCallback(async () => {
    setIsLoading(true);

    // Simulate network delay
    const delay = 50 + Math.random() * 100;

    if (circuitState === 'open') {
      // Fast fail
      addLog({
        status: 'rejected',
        duration: 2,
        message: 'Circuit OPEN - Request rejected immediately',
      });
      setIsLoading(false);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, delay));

    if (isSimulatingFailure) {
      // Simulate failure
      const newFailures = failures + 1;
      setFailures(newFailures);

      addLog({
        status: 'error',
        duration: delay + 5000, // Simulate timeout
        message: `503 Service Unavailable (failure ${newFailures}/${threshold})`,
      });

      if (newFailures >= threshold) {
        setCircuitState('open');
        const retryTime = new Date(Date.now() + resetTimeout);
        setNextRetryTime(retryTime);
        addLog({
          status: 'error',
          duration: 0,
          message: `CIRCUIT OPENED - Will retry in ${resetTimeout / 1000}s`,
        });
      }
    } else {
      // Simulate success
      if (circuitState === 'half-open') {
        setCircuitState('closed');
        setFailures(0);
        addLog({
          status: 'success',
          duration: delay,
          message: '200 OK - Circuit recovered!',
        });
      } else {
        addLog({
          status: 'success',
          duration: delay,
          message: '200 OK',
        });
      }
    }

    setIsLoading(false);
  }, [circuitState, isSimulatingFailure, failures, threshold, resetTimeout, addLog]);

  const toggleFailureSimulation = () => {
    setIsSimulatingFailure(!isSimulatingFailure);
    if (isSimulatingFailure) {
      // Reset circuit when turning off failure simulation
      setFailures(0);
    }
  };

  const resetCircuit = () => {
    setCircuitState('closed');
    setFailures(0);
    setNextRetryTime(null);
    setIsSimulatingFailure(false);
  };

  const stateColors = {
    closed: 'bg-success',
    open: 'bg-error',
    'half-open': 'bg-warning',
  };

  const stateGlows = {
    closed: 'shadow-[0_0_30px_rgba(34,197,94,0.3)]',
    open: 'shadow-[0_0_30px_rgba(239,68,68,0.3)]',
    'half-open': 'shadow-[0_0_30px_rgba(245,158,11,0.3)]',
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Circuit State Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Circuit State</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {/* Visual circuit breaker */}
          <motion.div
            className={cn(
              'w-32 h-32 rounded-full flex items-center justify-center',
              stateColors[circuitState],
              stateGlows[circuitState]
            )}
            animate={{
              scale: circuitState === 'open' ? [1, 1.05, 1] : 1,
            }}
            transition={{
              duration: 1,
              repeat: circuitState === 'open' ? Infinity : 0,
            }}
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-white uppercase">
                {circuitState}
              </div>
              {circuitState === 'open' && countdown > 0 && (
                <div className="text-sm text-white/80 mt-1">
                  {Math.ceil(countdown / 1000)}s
                </div>
              )}
            </div>
          </motion.div>

          {/* Failure counter */}
          <div className="mt-6 text-center">
            <div className="text-sm text-secondary mb-2">Consecutive Failures</div>
            <div className="flex items-center gap-1 justify-center">
              {Array.from({ length: threshold }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-3 h-3 rounded-full transition-colors',
                    i < failures ? 'bg-error' : 'bg-border'
                  )}
                />
              ))}
            </div>
            <div className="text-xs text-muted mt-1">
              {failures} / {threshold}
            </div>
          </div>

          {/* State machine diagram */}
          <div className="mt-6 p-4 bg-surface rounded-lg w-full">
            <div className="text-xs text-secondary mb-3 text-center">State Machine</div>
            <div className="flex items-center justify-center gap-2 text-xs font-mono">
              <Badge variant={circuitState === 'closed' ? 'success' : 'outline'}>
                CLOSED
              </Badge>
              <span className="text-muted">→</span>
              <Badge variant={circuitState === 'open' ? 'error' : 'outline'}>
                OPEN
              </Badge>
              <span className="text-muted">→</span>
              <Badge variant={circuitState === 'half-open' ? 'warning' : 'outline'}>
                HALF-OPEN
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="danger"
            onClick={toggleFailureSimulation}
            className="w-full"
          >
            {isSimulatingFailure ? (
              <>
                <Check className="w-4 h-4" />
                Stop Failure Simulation
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" />
                Simulate Provider Failure
              </>
            )}
          </Button>

          <Button
            variant="secondary"
            onClick={simulateRequest}
            isLoading={isLoading}
            className="w-full"
          >
            <Zap className="w-4 h-4" />
            Send Request
          </Button>

          <Button
            variant="ghost"
            onClick={resetCircuit}
            className="w-full"
          >
            <RefreshCw className="w-4 h-4" />
            Reset Circuit
          </Button>

          {isSimulatingFailure && (
            <div className="p-3 bg-error/10 border border-error/30 rounded-lg text-sm text-error">
              Failure simulation active. Requests will fail until circuit opens.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Log */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Request Log</span>
            <Badge variant="outline">{requestLogs.length} requests</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            <AnimatePresence>
              {requestLogs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
                    'border-l-2',
                    {
                      'bg-success/5 border-success': log.status === 'success',
                      'bg-error/5 border-error': log.status === 'error',
                      'bg-warning/5 border-warning': log.status === 'rejected',
                    }
                  )}
                >
                  {log.status === 'success' && (
                    <Check className="w-4 h-4 text-success shrink-0" />
                  )}
                  {log.status === 'error' && (
                    <X className="w-4 h-4 text-error shrink-0" />
                  )}
                  {log.status === 'rejected' && (
                    <Zap className="w-4 h-4 text-warning shrink-0" />
                  )}

                  <span className="font-mono text-xs text-muted w-20 shrink-0">
                    {log.timestamp.toLocaleTimeString()}
                  </span>

                  <span className="flex-1 truncate">{log.message}</span>

                  <span className="font-mono text-xs text-muted shrink-0">
                    {formatDuration(log.duration)}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>

            {requestLogs.length === 0 && (
              <div className="text-center py-8 text-secondary">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No requests yet</p>
                <p className="text-sm text-muted">Click "Send Request" to begin</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
