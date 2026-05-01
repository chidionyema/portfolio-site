import { useEffect, useState } from 'react';

const techStack = ['.NET 9', 'Clean Architecture', 'Event-Driven', 'DDD', 'CQRS', 'MassTransit'];

const metrics = [
  { value: 15, label: 'Years Building Software' },
  { value: 5, label: 'Bounded Contexts' },
  { value: 99.9, label: 'Uptime', suffix: '%' },
  { value: 50, label: 'P99 Latency', prefix: '<', suffix: 'ms' },
];

function AnimatedNumber({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <>{prefix}{display}{suffix}</>;
}

export function Hero() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background - CSS only, no JS */}
      <div className="absolute inset-0 bg-gradient-to-b from-base via-base to-surface" />
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }} />

      {/* Gradient orbs - Pure CSS */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent-light/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '1s' }} />

      {/* Content */}
      <div className={`relative z-10 container mx-auto px-4 py-24 text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold text-primary mb-4 leading-tight">
          I build resilient, secure, and scalable distributed systems.
        </h1>
        <h2 className="text-4xl md:text-6xl font-bold mb-8">
          <span className="bg-gradient-to-r from-accent to-accent-light bg-clip-text text-transparent">
            Here's one running.
          </span>
        </h2>

        {/* Tech badges - CSS animation */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {techStack.map((tech, i) => (
            <span
              key={tech}
              className="px-3 py-1 text-sm border border-border rounded-full text-secondary animate-fade-in"
              style={{ animationDelay: `${300 + i * 50}ms`, animationFillMode: 'backwards' }}
            >
              {tech}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a
            href="#demo"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-accent to-accent-light text-white font-medium text-lg hover:shadow-[0_0_40px_rgba(99,102,241,0.4)] transition-shadow"
          >
            <span className="text-xl">✨</span>
            Try Live Demo
          </a>
          <a
            href="#architecture"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-accent/50 text-accent font-medium text-lg hover:bg-accent/10 transition-colors"
          >
            View Architecture
            <span>→</span>
          </a>
        </div>

        {/* Metrics */}
        <div className="flex flex-wrap justify-center gap-4">
          {metrics.map((m, i) => (
            <div
              key={m.label}
              className="min-w-[120px] p-4 rounded-xl bg-white/[0.02] backdrop-blur border border-white/[0.05] animate-fade-in"
              style={{ animationDelay: `${600 + i * 100}ms`, animationFillMode: 'backwards' }}
            >
              <div className="text-3xl font-bold font-mono text-primary">
                <AnimatedNumber value={m.value} prefix={m.prefix} suffix={m.suffix} />
              </div>
              <div className="text-sm text-secondary">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Links */}
        <div className="flex items-center justify-center gap-6 mt-12 text-sm animate-fade-in" style={{ animationDelay: '1s' }}>
          <a href="https://github.com/chidionyema/haworks" target="_blank" rel="noopener"
             className="flex items-center gap-2 text-secondary hover:text-primary transition-colors">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/></svg>
            View Source
          </a>
          <a href="/cv.pdf" download className="flex items-center gap-2 text-secondary hover:text-primary transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Download CV
          </a>
        </div>
      </div>

      {/* Scroll indicator - CSS animation */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-secondary/30 flex items-start justify-center p-2">
          <div className="w-1 h-2 rounded-full bg-secondary/50" />
        </div>
      </div>
    </section>
  );
}
