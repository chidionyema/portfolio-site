import { useEffect, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { LiveTopologyMap } from '../architecture/LiveTopologyMap';
import { HeroFingerprint } from './HeroFingerprint';
import type { HeroPreviewData } from './HeroPreview';
import type { LiveMetrics } from '../../lib/api/demo-client';

interface HeroProps {
  // preview + initialMetrics kept on the props for index.astro
  // backward-compat; both are unused in the ops-console framing — the
  // metrics row, ping button, and 3-card triptych were noise. The
  // topology + dock + impact ribbon already prove cluster liveness.
  preview?: HeroPreviewData;
  initialMetrics?: LiveMetrics;
}

/**
 * Hero — ops-console framing.
 *
 * The hero is the control room, not a portfolio splash. Layout:
 *
 *   ┌────────────────────────────────────────────────────────────┐
 *   │  thin status bar: operator + cluster identity (HeroFingerprint)
 *   ├────────────────────────────────────────────────────────────┤
 *   │  Senior .NET · distributed-systems contractor                │
 *   │  This is a live cluster. Click any node to break it.         │
 *   │                                                              │
 *   │  ╔══════════════════════════════════════════════════════╗  │
 *   │  ║                                                        ║  │
 *   │  ║          full-width LiveTopologyMap                   ║  │
 *   │  ║                                                        ║  │
 *   │  ╚══════════════════════════════════════════════════════╝  │
 *   │                                                              │
 *   │             ↓ Try the patterns                               │
 *   └────────────────────────────────────────────────────────────┘
 *
 * Removed (vs prior hero):
 *  - LiveMetricsRow         (the topology already shows req/s)
 *  - Ping button            (every event the topology shows is a real ping)
 *  - GitHub repo button     (footer + per-demo source links cover this)
 *  - [LIVE_CLUSTER] label   (the topology has its own header)
 *  - HeroPreview triptych   (decorative, used simulated saga events)
 *  - Magnetic CTA           (over-engineered for one anchor link)
 *
 * The mental model the visitor lands with: "I'm sitting at a real
 * cluster's controls", not "I'm reading a CV with a sidebar of trinkets".
 */
export function Hero(_: HeroProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <section
      data-hero
      className="relative min-h-screen flex flex-col bg-base overflow-hidden border-b border-white/5"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(99,102,241,0.12),transparent_70%)]" />
      <div className="absolute inset-0 hero-dot-grid opacity-[0.08]" />

      {/* Operator status strip — one row at the top of the control room. */}
      <div className="relative z-20 border-b border-white/10 bg-black/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-mono uppercase tracking-[0.2em]">
          <span className="text-accent font-black">Operator: Chidi Onyema</span>
          <span className="text-muted/40">·</span>
          <a
            href="mailto:hello@chidionyema.dev"
            className="text-secondary hover:text-primary transition-colors"
          >
            hello@chidionyema.dev
          </a>
          <span className="text-muted/40">·</span>
          <span className="text-muted">London · open for contracts</span>
          <span className="ml-auto" />
          <HeroFingerprintInline />
        </div>
      </div>

      <div
        className={`flex-1 flex flex-col relative z-10 transition-opacity duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="flex-1 container mx-auto px-4 flex flex-col py-12 lg:py-16 gap-10">
          {/* Headline + intent. One H1, one sentence under it. No
              competing CTAs at this level. */}
          <header className="max-w-3xl">
            <h1 className="font-display text-4xl md:text-5xl xl:text-6xl text-primary font-black leading-[0.95] tracking-tighter">
              Senior .NET / distributed-systems contractor
            </h1>
            <p className="mt-6 text-lg text-secondary leading-relaxed max-w-xl">
              This is a live production cluster running every pattern below.
              Click any node to break it. Watch the demos route around the
              outage.
            </p>
          </header>

          {/* The artifact. Full width, owns the visual centre of the hero. */}
          <div className="w-full">
            <LiveTopologyMap />
          </div>

          {/* Single CTA. Anchors to the demo grid. */}
          <div className="flex justify-center">
            <a
              href="#demo"
              className="inline-flex items-center gap-3 px-6 py-3 border border-white/15 rounded-full text-sm font-bold text-secondary hover:text-primary hover:border-accent/40 transition-colors"
            >
              <ArrowDown className="w-4 h-4" />
              Try the patterns
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Compact, single-line variant of HeroFingerprint that fits inside the
 * status strip alongside the operator name. Same backing data
 * (/api/system/identity), tighter visual.
 */
function HeroFingerprintInline() {
  return <HeroFingerprint />;
}
