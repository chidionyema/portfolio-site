import { useEffect, useState } from 'react';
import { ArrowDown, Mail } from 'lucide-react';
import { GithubIcon, LinkedinIcon } from '../../lib/brand-icons';
import { useClusterState } from '../../hooks/useClusterState';
import type { HeroPreviewData } from './HeroPreview';
import type { LiveMetrics } from '../../lib/api/demo-client';

interface HeroProps {
  preview?: HeroPreviewData;
  initialMetrics?: LiveMetrics;
}

/**
 * Hero — personal, conventional, scannable in 5 seconds.
 *
 * The page goal is conversion: a hiring manager / CTO / recruiter
 * lands and emails for a contract OR notes Chidi for a recommendation.
 * That audience scans, doesn't explore. The right hero for them is a
 * CV-shaped opener — name, claim, two CTAs — not a live tech demo
 * fighting for attention.
 *
 * The live cluster, demos, and chaos still exist on the page; they
 * live below as the "Inspect the work" section. That moves the
 * technical theatre from "main artefact" to "supporting proof".
 */
export function Hero(_: HeroProps) {
  const [visible, setVisible] = useState(false);
  const { systemStatus } = useClusterState();

  useEffect(() => {
    setVisible(true);
  }, []);

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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(99,102,241,0.10),transparent_70%)]" />
      <div className="absolute inset-0 hero-dot-grid opacity-[0.05]" />

      {/* Operator pill — minimal context, top-right corner. */}
      <div className="absolute top-4 right-4 z-30">
        <div className="glass border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-3 text-[10px] font-mono">
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot} animate-pulse`} />
          <span className="text-secondary uppercase tracking-widest font-bold">
            Available · London
          </span>
        </div>
      </div>

      <div
        className={`flex-1 flex flex-col relative z-10 transition-opacity duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="flex-1 container mx-auto px-4 py-24 lg:py-32 flex flex-col justify-center max-w-4xl">
          <div className="font-mono text-sm font-black uppercase tracking-[0.4em] text-accent mb-6">
            Chidi Onyema
          </div>

          <h1 className="font-display text-4xl md:text-6xl xl:text-7xl text-primary font-black leading-[0.95] tracking-tighter mb-8">
            Senior .NET engineer<br />
            building distributed<br />
            systems that survive<br />
            production.
          </h1>

          <p className="text-lg md:text-xl text-secondary leading-relaxed max-w-2xl mb-12">
            London-based contractor. UK government services, security
            platforms at 10M+ events/day, fintech and healthtech rebuilds.
            Open for engagements building or stabilising distributed .NET
            at production scale.
          </p>

          {/* Primary CTAs — email + CV. Hiring manager's two paths. */}
          <div className="flex flex-wrap items-center gap-3 mb-16">
            <a
              href="mailto:hello@chidionyema.dev"
              className="inline-flex items-center gap-3 px-6 py-3.5 bg-primary text-black font-bold rounded-full hover:bg-white transition-all shadow-2xl"
            >
              <Mail className="w-4 h-4" />
              Email me
            </a>
            <a
              href="/cv.pdf"
              download
              className="inline-flex items-center gap-3 px-6 py-3.5 border border-white/15 text-secondary hover:text-primary hover:border-accent/40 rounded-full font-bold transition-colors"
            >
              <ArrowDown className="w-4 h-4" />
              Download CV
            </a>
            <a
              href="https://linkedin.com/in/chidionyema"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 px-4 py-3.5 text-muted hover:text-primary transition-colors"
              aria-label="LinkedIn"
            >
              <LinkedinIcon className="w-4 h-4" />
            </a>
            <a
              href="https://github.com/chidionyema"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 px-4 py-3.5 text-muted hover:text-primary transition-colors"
              aria-label="GitHub"
            >
              <GithubIcon className="w-4 h-4" />
            </a>
          </div>

          <a
            href="#demo"
            className="inline-flex items-center gap-3 text-sm font-mono uppercase tracking-[0.3em] text-muted/70 hover:text-secondary transition-colors w-fit"
          >
            <ArrowDown className="w-4 h-4" />
            <span>
              Inspect the work — this site runs on the kind of system I build
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
