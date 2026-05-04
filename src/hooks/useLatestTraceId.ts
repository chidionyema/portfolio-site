import { useSyncExternalStore } from 'react';
import { traceStore } from '../lib/trace-store';

export function useLatestTraceId(): string | null {
  return useSyncExternalStore(
    traceStore.subscribe,
    () => traceStore.get(),
    () => null,
  );
}
