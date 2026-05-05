import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { GithubIcon } from '../../lib/brand-icons';
import { HeroPreview, type HeroPreviewData } from './HeroPreview';
import { EventMesh } from './EventMesh';
import { LiveMetricsRow } from '../metrics/LiveMetricsRow';
import { HERO_PRIMARY_CTA, CLUSTER_LABEL } from '../../lib/copy';
import type { LiveMetrics } from '../../lib/api/demo-client';

function useMagnetic(strength = 0.18) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * strength;
      const dy = (e.clientY - (r.top + r.height / 2)) * strength;
      el.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`;
    };
    const onLeave = () => { el.style.transform = ''; };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [strength]);
  return ref;
}

interface HeroProps {
  preview: HeroPreviewData;
  initialMetrics?: LiveMetrics;
}

export function Hero({ preview, initialMetrics }: HeroProps) {
  const [visible, setVisible] = useState(false);
  const [ping, setPing] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [pingTrigger, setPingTrigger] = useState(0);
  const ctaRef = useMagnetic();

  const runPing = async () => {
    setIsPinging(true);
    setPingTrigger(p => p + 1);
    const start = Date.now();

    try {
      await fetch(`${import.meta.env.PUBLIC_API_URL || 'http://localhost:5000'}/api/health/snapshot`);
      setPing(Date.now() - start);
    } catch (e) {
      setPing(999);
    } finally {
      setIsPinging(false);
    }
  };

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <section
      data-hero
      className="relative min-h-screen flex flex-col bg-base overflow-hidden border-b border-white/5"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(99,102,241,0.12),transparent_70%)]" />
      <div className="absolute inset-0 hero-dot-grid opacity-[0.1]" />

      <div className={`flex-1 flex flex-col relative z-10 transition-opacity duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex-1 container mx-auto px-4 flex flex-col lg:flex-row items-center gap-12 py-12">
          {/* Left: Hook */}
          <div className="w-full lg:w-[45%] text-left space-y-8">
             <div className="flex flex-col gap-1">
                <div className="font-mono text-sm font-black uppercase tracking-[0.4em] text-accent">Chidi Onyema</div>
                <h1 className="font-display text-4xl md:text-5xl xl:text-6xl text-primary font-black leading-[0.9] tracking-tighter uppercase">
                   Senior .NET <br/> Engineering.
                </h1>
             </div>

             <p className="text-secondary text-lg font-medium leading-relaxed max-w-lg opacity-80 uppercase tracking-tight font-mono">
                Distributed systems for 99.99% availability. <br/>
                Live cluster telemetry active.
             </p>

             <LiveMetricsRow initialMetrics={initialMetrics} />

             <div className="flex flex-wrap items-center gap-6">
                <a
                  ref={ctaRef}
                  href="#demo"
                  className="px-8 py-4 bg-primary text-black font-bold rounded-full hover:bg-white transition-all shadow-2xl flex items-center gap-2 group"
                >
                  {HERO_PRIMARY_CTA} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
                <button
                  onClick={runPing}
                  disabled={isPinging}
                  className="px-6 py-4 border border-white/10 rounded-full font-mono text-[10px] font-black uppercase tracking-widest text-muted hover:text-accent hover:border-accent/40 transition-all flex items-center gap-3"
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${ping ? (ping < 150 ? 'bg-success' : 'bg-warning') : 'bg-white/20'} ${isPinging ? 'animate-pulse' : ''}`} />
                  {isPinging ? `Pinging_${CLUSTER_LABEL}...` : ping ? `RTT: ${ping}ms` : `Ping_${CLUSTER_LABEL}`}
                </button>
                <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-muted">
                   <a href="https://github.com/chidionyema/haworks" target="_blank" rel="noopener" className="hover:text-primary transition-colors flex items-center gap-2">
                      <GithubIcon className="w-4 h-4" /> REPOSITORY
                   </a>
                </div>
             </div>
          </div>

          {/* Right: Live event mesh — pulses on ping + on real backend events. */}
          <div className="flex-1 w-full relative">
             <div className="font-mono text-[9px] text-accent font-black uppercase tracking-[0.4em] mb-4 opacity-40 text-center lg:text-left">
                [ LIVE_EVENT_MESH ]
             </div>
             <div className="glass p-1 aspect-square max-w-[520px] mx-auto lg:mx-0">
                <EventMesh pingTrigger={pingTrigger} />
             </div>
          </div>
        </div>

        {/* Footnote triptych — common across the hero, anchors the page. */}
        <div className="container mx-auto px-4 pb-12">
           <HeroPreview {...preview} />
        </div>
      </div>
    </section>
  );
}
