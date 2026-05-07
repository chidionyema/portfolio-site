import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { GithubIcon, LinkedinIcon } from '../../lib/brand-icons';
import { useClusterState } from '../../hooks/useClusterState';
import type { HeroPreviewData } from './HeroPreview';
import type { LiveMetrics } from '../../lib/api/demo-client';

interface HeroProps {
  preview?: HeroPreviewData;
  initialMetrics?: LiveMetrics;
}

/**
 * Hero — editorial CV opener.
 *
 * Light cream background, serif display headline, sans body, restrained
 * palette. Reads in 5 seconds: who, what, how to reach. The live
 * cluster lives below as the "Inspect the work" section so it's
 * available to technical reviewers without competing for the hiring
 * manager's first impression.
 */
export function Hero(_: HeroProps) {
  const [visible, setVisible] = useState(false);
  const { systemStatus } = useClusterState();

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <section
      data-hero
      className="relative bg-base"
    >
      {/* Operator pill — minimal status indicator, top-right corner. */}
      <div className="absolute top-6 right-6 z-30">
        <div className="bg-white/70 backdrop-blur border border-border rounded-full px-3.5 py-1.5 flex items-center gap-2 text-xs text-secondary">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              systemStatus === 'healthy'
                ? 'bg-success'
                : systemStatus === 'degraded'
                  ? 'bg-warning'
                  : 'bg-muted/40'
            } ${systemStatus === 'healthy' ? 'animate-pulse' : ''}`}
          />
          <span className="font-medium">Available · London</span>
        </div>
      </div>

      <div
        className={`container-prose px-6 lg:px-8 pt-32 pb-24 lg:pt-40 lg:pb-32 transition-opacity duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}
      >
        <p className="text-sm text-muted font-medium mb-8 tracking-wide">
          Chidi Onyema
        </p>

        <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-primary font-semibold leading-[1.05] tracking-tight mb-10">
          Senior .NET engineer.
          <br />
          <span className="text-secondary">
            I build distributed systems that survive&nbsp;production.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-secondary leading-relaxed max-w-2xl mb-12 font-normal">
          London-based contractor. UK government services, security
          platforms at 10M+ events/day, fintech and healthtech rebuilds.
          Currently open for engagements — building or stabilising
          distributed .NET at production scale.
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-16">
          <a
            href="mailto:hello@chidionyema.dev"
            className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-base font-medium rounded-md hover:bg-secondary transition-colors"
            style={{ color: 'rgb(var(--color-base))' }}
          >
            Email me
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/cv.pdf"
            download
            className="inline-flex items-center gap-2 px-5 py-3 border border-border-strong text-primary text-base font-medium rounded-md hover:bg-surface-warm transition-colors"
          >
            Download CV
          </a>
          <a
            href="https://linkedin.com/in/chidionyema"
            target="_blank"
            rel="noopener"
            className="ml-2 p-2.5 text-muted hover:text-primary transition-colors"
            aria-label="LinkedIn"
          >
            <LinkedinIcon className="w-5 h-5" />
          </a>
          <a
            href="https://github.com/chidionyema"
            target="_blank"
            rel="noopener"
            className="p-2.5 text-muted hover:text-primary transition-colors"
            aria-label="GitHub"
          >
            <GithubIcon className="w-5 h-5" />
          </a>
        </div>

        <div className="border-t border-border pt-8">
          <a
            href="#demo"
            className="inline-flex items-center gap-3 text-sm text-muted hover:text-primary transition-colors group"
          >
            <span className="w-8 h-px bg-border-strong group-hover:w-12 transition-all" />
            <span>
              The site itself runs on the kind of system I build —
              inspect it below
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
