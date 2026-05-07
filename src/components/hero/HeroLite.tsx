import { useEffect, useState, useRef } from 'react';
import { ArrowDown, Loader2, Check, Mail } from 'lucide-react';
import { LiveTopologyMap } from '../architecture/LiveTopologyMap';
import { useClusterState } from '../../hooks/useClusterState';
import type { HeroPreviewData } from './HeroPreview';
import type { LiveMetrics } from '../../lib/api/demo-client';

const API_URL =
  ((import.meta as any).env?.PUBLIC_API_URL?.replace(/\/$/, '')) ??
  'http://localhost:5050';

interface HeroProps {
  preview?: HeroPreviewData;
  initialMetrics?: LiveMetrics;
}

/**
 * Hero — one action, one artifact, no portfolio chrome.
 *
 * The page used to throw five competing things at the visitor before
 * they could parse what they were looking at: an operator strip, a
 * headline, a sub-line, the topology, a CTA. After the ops-console
 * reframe the chrome was lighter but the page still asked the visitor
 * to read first and act second.
 *
 * This collapses the hero to a single mental model:
 *
 *   - Tiny corner pill: operator name + cluster pulse. Context for
 *     "who runs this" without a full strip.
 *   - The artifact (topology). Full-width. Owns the centre.
 *   - One primary button: "Press to fire a real saga →". Click ->
 *     /api/demo/saga/start, real RabbitMQ events flow back through
 *     the cluster-store SignalR, the topology animates the saga's
 *     hops as they happen, the impact ribbon fills with real BFF
 *     events. When the saga completes, the page smooth-scrolls to
 *     the demo grid with a "now try the other patterns" callout.
 *
 * The visitor's first thought becomes "wait, this *does* something"
 * instead of "what am I reading". The dashboard view is a
 * consequence of an action they took, not a precursor.
 */
export function Hero(_: HeroProps) {
  const [visible, setVisible] = useState(false);
  const [firingSaga, setFiringSaga] = useState(false);
  const [sagaCompleted, setSagaCompleted] = useState(false);
  const { systemStatus, identity, events } = useClusterState();
  const sagaWatchRef = useRef<number | null>(null);

  useEffect(() => {
    setVisible(true);
  }, []);

  /**
   * Watch the live event stream for a successful saga POST while we're
   * waiting for ours. The /api/demo/saga/start request lands as a real
   * BFF /api/* event with status < 400 within a second or two; once
   * we see that plus enough downstream events, we declare success and
   * scroll the visitor down.
   */
  useEffect(() => {
    if (!firingSaga) return;
    if (!events.length) return;

    const sagaEvent = events.find(
      (e) =>
        (e.path?.includes('/api/demo/saga/start') ||
          e.path?.includes('/api/checkouts')) &&
        e.status < 400,
    );
    if (sagaEvent) {
      // Wait for the saga's downstream events to paint on the topology
      // before scrolling — the visual is the point.
      if (sagaWatchRef.current) window.clearTimeout(sagaWatchRef.current);
      sagaWatchRef.current = window.setTimeout(() => {
        setSagaCompleted(true);
        setFiringSaga(false);
        const demoEl = document.getElementById('demo');
        if (demoEl) demoEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 2400);
    }

    return () => {
      if (sagaWatchRef.current) window.clearTimeout(sagaWatchRef.current);
    };
  }, [events, firingSaga]);

  const fireSaga = async () => {
    if (firingSaga) return;
    setFiringSaga(true);
    setSagaCompleted(false);
    try {
      await fetch(`${API_URL}/api/demo/saga/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioType: 'success',
          simulatedDelayMs: 200,
        }),
      });
    } catch {
      // ignore — error path will show via the topology turning red
      setFiringSaga(false);
    }
  };

  const statusDot =
    systemStatus === 'healthy'
      ? 'bg-success'
      : systemStatus === 'degraded'
        ? 'bg-warning'
        : systemStatus === 'unknown'
          ? 'bg-muted/40'
          : 'bg-error';

  return (
    <section
      data-hero
      className="relative min-h-screen flex flex-col bg-base overflow-hidden border-b border-white/5"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(99,102,241,0.12),transparent_70%)]" />
      <div className="absolute inset-0 hero-dot-grid opacity-[0.06]" />

      {/* Operator pill — the only chrome at the top. Holds the bare
          minimum context: who runs this, current cluster status, a
          contact link. Everything else (sha, uptime, replica count)
          lives in the topology footer where it belongs. */}
      <div className="absolute top-4 right-4 z-30">
        <div className="glass border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-3 text-[10px] font-mono">
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot} animate-pulse`} />
          <span className="text-secondary uppercase tracking-widest font-bold">
            Chidi Onyema
          </span>
          <span className="text-muted/40">·</span>
          <a
            href="mailto:hello@chidionyema.dev"
            className="text-muted hover:text-primary transition-colors flex items-center gap-1"
          >
            <Mail className="w-3 h-3" />
            <span>contact</span>
          </a>
        </div>
      </div>

      <div
        className={`flex-1 flex flex-col relative z-10 transition-opacity duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="flex-1 container mx-auto px-4 pt-20 pb-12 lg:pt-24 lg:pb-16 flex flex-col gap-10 justify-center">
          {/* The artifact. Topology owns the centre of the viewport. */}
          <div className="w-full">
            <LiveTopologyMap />
          </div>

          {/* Single primary action. */}
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={fireSaga}
              disabled={firingSaga}
              className={`group relative px-8 py-5 rounded-full text-base font-bold transition-all flex items-center gap-3 shadow-2xl ${
                firingSaga
                  ? 'bg-accent/40 text-primary cursor-wait'
                  : sagaCompleted
                    ? 'bg-success text-black'
                    : 'bg-primary text-black hover:bg-white'
              }`}
            >
              {firingSaga ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saga in flight — watch the topology…
                </>
              ) : sagaCompleted ? (
                <>
                  <Check className="w-5 h-5" />
                  Real saga completed end-to-end
                </>
              ) : (
                <>
                  Press to fire a real saga
                  <ArrowDown className="w-4 h-4 -rotate-90 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>

            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted/60 max-w-md text-center">
              {firingSaga
                ? 'POST /api/demo/saga/start · checkout-orchestrator → catalog → payments via RabbitMQ'
                : sagaCompleted
                  ? 'Stock reserved · Payment created · Order completed. Try the other patterns ↓'
                  : 'Real RabbitMQ choreography across five services. Click and watch.'}
            </p>
          </div>

          {/* Subtle scroll affordance for visitors who don't fire the saga. */}
          {!firingSaga && !sagaCompleted && (
            <div className="flex justify-center mt-2">
              <a
                href="#demo"
                className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted/50 hover:text-secondary transition-colors flex items-center gap-2"
              >
                <ArrowDown className="w-3 h-3" />
                or skip ahead to the demos
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
