import { useEffect, useState } from 'react';

const events: Array<{ ctx: string; name: string }> = [
  { ctx: 'orders',    name: 'OrderCreated' },
  { ctx: 'inventory', name: 'StockReserved' },
  { ctx: 'outbox',    name: 'OutboxEventStored' },
  { ctx: 'payments',  name: 'PaymentAuthorised' },
  { ctx: 'notifs',    name: 'EmailQueued' },
  { ctx: 'orders',    name: 'OrderConfirmed' },
];

const ROTATE_MS = 2400;

export function EventTicker() {
  const [i, setI] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % events.length), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [reduced]);

  const e = events[i];

  return (
    <div
      className="
        inline-flex items-center gap-3 px-4 py-2 rounded-full
        surface-subtle font-mono text-xs sm:text-sm tabular-nums
        select-none
      "
      aria-label={`Live event sample: ${e.ctx} dot ${e.name}`}
    >
      <span className="relative flex w-2 h-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
        <span className="relative inline-flex rounded-full w-2 h-2 bg-success" />
      </span>
      <span className="text-muted">{e.ctx}</span>
      <span className="text-muted">·</span>
      <span key={`${i}-${e.name}`} className="text-primary animate-fade-in">
        {e.name}
      </span>
    </div>
  );
}
