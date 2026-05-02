/**
 * Demo Hooks
 *
 * React hooks for each demo that handle API calls and SignalR subscriptions.
 * Each hook manages its own state and provides a clean interface for components.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '@/lib/api/demo-client';
import * as signalr from '@/lib/api/signalr';

// ============================================================================
// Saga Demo Hook
// ============================================================================

export interface SagaStep {
  name: string;
  service: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'compensating';
  timestamp?: string;
  description?: string;
}

export function useSagaDemo() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [steps, setSteps] = useState<SagaStep[]>([
    { name: 'OrderCreated', service: 'Orders', status: 'pending' },
    { name: 'StockReserved', service: 'Inventory', status: 'pending' },
    { name: 'PaymentProcessed', service: 'Payments', status: 'pending' },
    { name: 'OrderCompleted', service: 'Orders', status: 'pending' },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Subscribe to SignalR events when session starts
  useEffect(() => {
    if (!sessionId) return;

    let mounted = true;

    const setup = async () => {
      try {
        await signalr.subscribeToSession(sessionId);

        unsubscribeRef.current = await signalr.onSagaStep((event) => {
          if (!mounted || event.sessionId !== sessionId) return;

          setSteps((prev) =>
            prev.map((step) =>
              step.name === event.step
                ? {
                    ...step,
                    status: event.status,
                    timestamp: event.timestamp,
                    description: event.description,
                  }
                : step
            )
          );

          // Check for completion
          if (event.step === 'OrderCompleted' && event.status === 'completed') {
            setIsRunning(false);
          }
          if (event.status === 'failed') {
            setIsRunning(false);
          }
        });
      } catch (err) {
        console.error('[useSagaDemo] SignalR setup failed:', err);
      }
    };

    setup();

    return () => {
      mounted = false;
      unsubscribeRef.current?.();
      signalr.unsubscribeFromSession(sessionId).catch(console.error);
    };
  }, [sessionId]);

  const runSaga = useCallback(
    async (scenario: api.SagaScenario = 'success') => {
      setIsRunning(true);
      setError(null);
      setSteps((prev) => prev.map((s) => ({ ...s, status: 'pending', timestamp: undefined })));

      try {
        const response = await api.startSagaDemo(scenario);
        setSessionId(response.sessionId);
        setOrderId(response.orderId);
      } catch (err) {
        setIsRunning(false);
        setError(err instanceof Error ? err.message : 'Failed to start saga');
      }
    },
    []
  );

  const reset = useCallback(() => {
    setSessionId(null);
    setOrderId(null);
    setError(null);
    setSteps((prev) => prev.map((s) => ({ ...s, status: 'pending', timestamp: undefined })));
  }, []);

  return {
    sessionId,
    orderId,
    steps,
    isRunning,
    error,
    runSaga,
    reset,
  };
}

// ============================================================================
// Circuit Breaker Demo Hook
// ============================================================================

export function useCircuitBreakerDemo() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [state, setState] = useState<'closed' | 'open' | 'half-open'>('closed');
  const [failureCount, setFailureCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [failureMode, setFailureMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    const setup = async () => {
      await signalr.subscribeToSession(sessionId);
      unsubscribe = await signalr.onCircuitBreaker((event) => {
        if (!mounted || event.sessionId !== sessionId) return;
        setState(event.state);
        setFailureCount(event.failureCount);
        setSuccessCount(event.successCount);
        setRejectedCount(event.rejectedCount);
      });
    };

    setup();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [sessionId]);

  const sendRequest = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.circuitBreakerRequest(sessionId ?? undefined, failureMode);
      setSessionId(response.sessionId);
      setState(response.circuitState);
      setFailureCount(response.failureCount);
      setSuccessCount(response.successCount);
      setRejectedCount(response.rejectedCount);
      setLastResponse(response.success ? '200 OK' : `503 ${response.message}`);
    } catch (err) {
      if (err instanceof api.DemoApiError && err.status === 503) {
        setLastResponse('503 Circuit Open');
      } else {
        setLastResponse('Error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, failureMode]);

  const toggleFailure = useCallback(async () => {
    const newMode = !failureMode;
    setFailureMode(newMode);
    if (sessionId) {
      await api.toggleCircuitFailure(sessionId, newMode);
    }
  }, [sessionId, failureMode]);

  const reset = useCallback(async () => {
    if (sessionId) {
      await api.resetCircuit(sessionId);
    }
    setState('closed');
    setFailureCount(0);
    setSuccessCount(0);
    setRejectedCount(0);
    setFailureMode(false);
    setLastResponse(null);
  }, [sessionId]);

  return {
    state,
    failureCount,
    successCount,
    rejectedCount,
    failureMode,
    isLoading,
    lastResponse,
    sendRequest,
    toggleFailure,
    reset,
  };
}

// ============================================================================
// Idempotency Demo Hook
// ============================================================================

export function useIdempotencyDemo() {
  const [idempotencyKey, setIdempotencyKey] = useState(() => `idem_${crypto.randomUUID().slice(0, 8)}`);
  const [requestCount, setRequestCount] = useState(0);
  const [ordersCreated, setOrdersCreated] = useState(0);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [ttlSeconds, setTtlSeconds] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [requests, setRequests] = useState<
    Array<{ id: string; timestamp: Date; isDuplicate: boolean }>
  >([]);

  const sendRequest = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.processIdempotentRequest(idempotencyKey, 'CreateOrder', {
        item: 'Widget',
        quantity: 1,
      });

      setRequestCount((prev) => prev + 1);
      setIsDuplicate(response.isDuplicate);
      setTtlSeconds(response.keyInfo.ttlSeconds);

      if (!response.isDuplicate) {
        setOrdersCreated((prev) => prev + 1);
      }

      setRequests((prev) => [
        {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          isDuplicate: response.isDuplicate,
        },
        ...prev.slice(0, 19),
      ]);
    } catch (err) {
      console.error('[useIdempotencyDemo] Request failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [idempotencyKey]);

  const generateNewKey = useCallback(() => {
    setIdempotencyKey(`idem_${crypto.randomUUID().slice(0, 8)}`);
    setRequestCount(0);
    setOrdersCreated(0);
    setIsDuplicate(false);
    setTtlSeconds(null);
    setRequests([]);
  }, []);

  // TTL countdown
  useEffect(() => {
    if (ttlSeconds === null || ttlSeconds <= 0) return;

    const interval = setInterval(() => {
      setTtlSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(interval);
  }, [ttlSeconds]);

  return {
    idempotencyKey,
    requestCount,
    ordersCreated,
    isDuplicate,
    ttlSeconds,
    isLoading,
    requests,
    sendRequest,
    generateNewKey,
    setIdempotencyKey,
  };
}

// ============================================================================
// Rate Limiter Demo Hook
// ============================================================================

export function useRateLimiterDemo() {
  const [tokens, setTokens] = useState(10);
  const [maxTokens] = useState(10);
  const [retryAfter, setRetryAfter] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [requests, setRequests] = useState<
    Array<{ id: string; timestamp: Date; status: 'allowed' | 'limited'; remaining: number }>
  >([]);

  // Token refill simulation (for offline mode)
  useEffect(() => {
    const interval = setInterval(() => {
      setTokens((prev) => Math.min(prev + 1, maxTokens));
      setRetryAfter((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [maxTokens]);

  const sendRequest = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.rateLimitedRequest();
      setTokens(response.bucket.remaining);

      const status = response.allowed ? 'allowed' : 'limited';
      if (!response.allowed && response.bucket.retryAfterSeconds) {
        setRetryAfter(response.bucket.retryAfterSeconds);
      }

      setRequests((prev) => [
        {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          status,
          remaining: response.bucket.remaining,
        },
        ...prev.slice(0, 19),
      ]);
    } catch (err) {
      if (err instanceof api.DemoApiError && err.status === 429) {
        setTokens(0);
        setRetryAfter(err.details?.retryAfterSeconds as number ?? 10);
        setRequests((prev) => [
          {
            id: crypto.randomUUID(),
            timestamp: new Date(),
            status: 'limited',
            remaining: 0,
          },
          ...prev.slice(0, 19),
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendBurst = useCallback(async (count: number) => {
    for (let i = 0; i < count; i++) {
      await sendRequest();
      await new Promise((r) => setTimeout(r, 50));
    }
  }, [sendRequest]);

  const reset = useCallback(() => {
    setTokens(maxTokens);
    setRetryAfter(0);
    setRequests([]);
  }, [maxTokens]);

  return {
    tokens,
    maxTokens,
    retryAfter,
    isLoading,
    requests,
    sendRequest,
    sendBurst,
    reset,
  };
}

// ============================================================================
// Cache Demo Hook
// ============================================================================

export function useCacheDemo() {
  const [product, setProduct] = useState({
    name: 'Widget Pro',
    price: 49.99,
    version: 1,
  });
  const [cacheStatus, setCacheStatus] = useState<'hit' | 'miss' | 'stale'>('hit');
  const [ttlSeconds, setTtlSeconds] = useState(60); // 60s for demo visibility
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<
    Array<{
      id: string;
      timestamp: Date;
      action: 'read' | 'hit' | 'miss' | 'update' | 'invalidate' | 'publish';
      message: string;
    }>
  >([]);

  // TTL countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTtlSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const addLog = useCallback(
    (action: 'read' | 'hit' | 'miss' | 'update' | 'invalidate' | 'publish', message: string) => {
      setLogs((prev) => [
        { id: crypto.randomUUID(), timestamp: new Date(), action, message },
        ...prev.slice(0, 9),
      ]);
    },
    []
  );

  const readFromCache = useCallback(async () => {
    setIsLoading(true);
    addLog('read', 'GET /product/123');

    try {
      const response = await api.getCachedProduct('demo-123');
      setProduct(response.product);
      setTtlSeconds(response.cacheInfo.ttlSeconds);

      if (response.cacheInfo.isHit) {
        setCacheStatus('hit');
        addLog('hit', `Cache HIT - TTL: ${response.cacheInfo.ttlSeconds}s (${response.cacheInfo.source})`);
      } else {
        setCacheStatus('miss');
        addLog('miss', 'Cache MISS - fetching from DB');
      }
    } catch (err) {
      addLog('miss', 'Error reading from cache');
    } finally {
      setIsLoading(false);
    }
  }, [addLog]);

  const updateProduct = useCallback(
    async (newPrice: number) => {
      setIsLoading(true);
      addLog('update', `PUT /product/123 - Price: £${newPrice}`);

      try {
        const response = await api.updateProduct('demo-123', { price: newPrice });
        setProduct(response.product);
        setTtlSeconds(60);
        setCacheStatus('miss');

        addLog('update', 'Database updated');
        addLog('invalidate', `DEL cache:product:demo-123`);
        addLog('publish', `PUBLISH cache:invalidate → ${response.invalidation.instancesNotified} instances notified`);
      } catch (err) {
        addLog('invalidate', 'Error updating product');
      } finally {
        setIsLoading(false);
      }
    },
    [addLog]
  );

  const manualInvalidate = useCallback(async () => {
    addLog('invalidate', 'Manual invalidation triggered');

    try {
      await api.invalidateCache('demo-123');
      setTtlSeconds(0);
      setCacheStatus('stale');
      addLog('publish', 'PUBLISH cache:invalidate:product:demo-123');
    } catch (err) {
      console.error('[useCacheDemo] Invalidation failed:', err);
    }
  }, [addLog]);

  return {
    product,
    cacheStatus,
    ttlSeconds,
    isLoading,
    logs,
    readFromCache,
    updateProduct,
    manualInvalidate,
  };
}

// ============================================================================
// Concurrency Demo Hook
// ============================================================================

export interface UserState {
  name: string;
  readQuantity: number | null;
  readVersion: number | null;
  newQuantity: string;
  status: 'idle' | 'reading' | 'saving' | 'success' | 'conflict';
  message: string;
}

export function useConcurrencyDemo() {
  const [inventory, setInventory] = useState({ quantity: 50, version: 1 });
  const [userA, setUserA] = useState<UserState>({
    name: 'User A',
    readQuantity: null,
    readVersion: null,
    newQuantity: '',
    status: 'idle',
    message: '',
  });
  const [userB, setUserB] = useState<UserState>({
    name: 'User B',
    readQuantity: null,
    readVersion: null,
    newQuantity: '',
    status: 'idle',
    message: '',
  });
  const [isRacing, setIsRacing] = useState(false);

  const readInventory = useCallback(
    async (user: 'A' | 'B') => {
      const setUser = user === 'A' ? setUserA : setUserB;
      setUser((prev) => ({ ...prev, status: 'reading', message: 'Reading...' }));

      try {
        const response = await api.getInventory('demo-widget');
        setInventory(response.inventory);

        const suggestedNewQty = response.inventory.quantity - (user === 'A' ? 10 : 5);
        setUser((prev) => ({
          ...prev,
          readQuantity: response.inventory.quantity,
          readVersion: response.inventory.version,
          newQuantity: String(suggestedNewQty),
          status: 'idle',
          message: `Read: ${response.inventory.quantity} (v${response.inventory.version})`,
        }));
      } catch (err) {
        setUser((prev) => ({ ...prev, status: 'idle', message: 'Error reading' }));
      }
    },
    []
  );

  const saveInventory = useCallback(
    async (user: 'A' | 'B') => {
      const userState = user === 'A' ? userA : userB;
      const setUser = user === 'A' ? setUserA : setUserB;

      if (userState.readVersion === null) return;

      setUser((prev) => ({ ...prev, status: 'saving', message: 'Saving...' }));

      try {
        const response = await api.updateInventory(
          'demo-widget',
          parseInt(userState.newQuantity),
          userState.readVersion
        );

        setInventory(response.inventory);
        setUser((prev) => ({
          ...prev,
          status: 'success',
          message: `Saved: ${response.inventory.quantity} (v${response.inventory.version})`,
        }));
      } catch (err) {
        if (err instanceof api.DemoApiError && err.status === 409) {
          setUser((prev) => ({
            ...prev,
            status: 'conflict',
            message: `Conflict! Expected v${userState.readVersion}, but current is v${err.details?.currentVersion}`,
          }));

          // Update inventory state with server's current value
          if (err.details?.currentState) {
            const current = err.details.currentState as { quantity: number; version: number };
            setInventory({ quantity: current.quantity, version: current.version });
          }
        } else {
          setUser((prev) => ({ ...prev, status: 'idle', message: 'Error saving' }));
        }
      }
    },
    [userA, userB]
  );

  const raceUpdates = useCallback(async () => {
    setIsRacing(true);

    // Reset states
    setUserA((prev) => ({ ...prev, status: 'idle', message: '', readQuantity: null, readVersion: null }));
    setUserB((prev) => ({ ...prev, status: 'idle', message: '', readQuantity: null, readVersion: null }));

    // Both read simultaneously
    await Promise.all([readInventory('A'), readInventory('B')]);
    await new Promise((r) => setTimeout(r, 300));

    // User A saves first
    await saveInventory('A');
    await new Promise((r) => setTimeout(r, 200));

    // User B tries to save with stale version
    await saveInventory('B');

    setIsRacing(false);
  }, [readInventory, saveInventory]);

  const reset = useCallback(() => {
    setInventory({ quantity: 50, version: 1 });
    setUserA({
      name: 'User A',
      readQuantity: null,
      readVersion: null,
      newQuantity: '',
      status: 'idle',
      message: '',
    });
    setUserB({
      name: 'User B',
      readQuantity: null,
      readVersion: null,
      newQuantity: '',
      status: 'idle',
      message: '',
    });
  }, []);

  return {
    inventory,
    userA,
    userB,
    isRacing,
    setUserA,
    setUserB,
    readInventory,
    saveInventory,
    raceUpdates,
    reset,
  };
}
