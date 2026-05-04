type Listener = () => void;

let currentTraceId: string | null = null;
const listeners = new Set<Listener>();

export const traceStore = {
  get(): string | null {
    return currentTraceId;
  },
  set(traceId: string | null) {
    if (traceId === currentTraceId) return;
    currentTraceId = traceId;
    listeners.forEach((fn) => fn());
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};
