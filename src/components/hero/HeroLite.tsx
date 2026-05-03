import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ArrowRight, Monitor, Layout, Columns } from 'lucide-react';
import { GithubIcon } from '../../lib/brand-icons';
import { EventTicker } from './EventTicker';
import { HeroPreview, type HeroPreviewData } from './HeroPreview';
import { SystemTopology } from './SystemTopology';
import { EventMesh } from './EventMesh';
import { LiveMetricsRow } from '../metrics/LiveMetricsRow';
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
  const [layoutMode, setLayoutMode] = useState<'split' | 'immersive'>('split');
  const ctaRef = useMagnetic();

  useEffect(() => {
    setVisible(true);
    const saved = localStorage.getItem('hero_layout_mode');
    if (saved === 'split' || saved === 'immersive') setLayoutMode(saved);
  }, []);

  const toggleLayout = () => {
    const next = layoutMode === 'split' ? 'immersive' : 'split';
    setLayoutMode(next);
    localStorage.setItem('hero_layout_mode', next);
  };

  return (
    <section
      data-hero
      className="relative min-h-screen flex flex-col bg-base overflow-hidden border-b border-white/5"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(99,102,241,0.12),transparent_70%)]" />
      <div className="absolute inset-0 hero-dot-grid opacity-[0.1]" />

      {/* Meta-Toggle: Showcase frontend craft + agency */}
      <div className="absolute top-6 right-6 z-50">
         <button 
           onClick={toggleLayout}
           className="flex items-center gap-2 px-3 py-1.5 glass rounded-full text-[10px] font-bold uppercase tracking-widest text-muted hover:text-primary transition-all border border-white/10"
         >
            {layoutMode === 'split' ? <Layout className="w-3 h-3" /> : <Columns className="w-3 h-3" />}
            Layout: {layoutMode}
         </button>
      </div>
      
      <div className={`flex-1 flex flex-col relative z-10 transition-opacity duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        
        <AnimatePresence mode="wait">
          {layoutMode === 'split' ? (
            <motion.div 
              key="split"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="flex-1 container mx-auto px-4 flex flex-col lg:flex-row items-center gap-12 py-12"
            >
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
                       PROVE_SYSTEM_STATE <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                     </a>
                     <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-muted">
                        <a href="https://github.com/chidionyema/haworks" target="_blank" rel="noopener" className="hover:text-primary transition-colors flex items-center gap-2">
                           <GithubIcon className="w-4 h-4" /> REPOSITORY
                        </a>
                     </div>
                  </div>
               </div>

               {/* Right: Proof */}
               <div className="flex-1 w-full relative">
                  <div className="font-mono text-[9px] text-accent font-black uppercase tracking-[0.4em] mb-4 opacity-40 text-center lg:text-left">
                     [ LIVE_TOPOLOGY_LHR_01 ]
                  </div>
                  <div className="glass p-1">
                     <SystemTopology />
                  </div>
               </div>
            </motion.div>
          ) : (
            <motion.div 
              key="immersive"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
              className="flex-1 relative flex items-center justify-center p-4 md:p-12"
            >
               {/* Background Mesh Viz */}
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                  <EventMesh />
               </div>

               {/* Foreground Console */}
               <div className="relative z-10 max-w-3xl w-full">
                  <div className="glass p-8 md:p-16 text-center space-y-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] border-white/10 backdrop-blur-2xl">
                     <div className="flex justify-center mb-6">
                        <EventTicker />
                     </div>
                     
                     <div className="space-y-4">
                        <div className="font-mono text-sm font-black uppercase tracking-[0.6em] text-accent">Chidi Onyema</div>
                        <h1 className="font-display text-5xl md:text-6xl text-primary font-black leading-none tracking-tighter uppercase">
                           Senior .NET <br/> Engineering.
                        </h1>
                        <p className="text-secondary text-xl font-medium max-w-xl mx-auto opacity-80">
                           Distributed cluster active in production. <br/>
                           Prove the system state below.
                        </p>
                     </div>

                     <div className="flex flex-wrap items-center justify-center gap-6">
                        <a
                          ref={ctaRef}
                          href="#demo"
                          className="px-10 py-5 bg-white text-black font-bold text-lg rounded-full hover:bg-slate-100 transition-all shadow-[0_0_50px_rgba(255,255,255,0.2)] flex items-center gap-3 group"
                        >
                          Access Control Center <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </a>
                     </div>

                     <div className="pt-8 border-t border-white/5 flex justify-center font-mono text-[10px] font-black uppercase tracking-widest text-muted">
                        <LiveMetricsRow initialMetrics={initialMetrics} />
                     </div>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Footnote triptych — common to both, anchors the page. */}
        <div className="container mx-auto px-4 pb-12">
           <HeroPreview {...preview} />
        </div>
      </div>
    </section>
  );
}
