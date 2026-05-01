import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Github, FileText } from 'lucide-react';
import { Button } from '../ui/Button';
import { MetricCard } from '../ui/MetricCard';
import { Badge } from '../ui/Badge';

const techStack = [
  '.NET 9',
  'Clean Architecture',
  'Event-Driven',
  'DDD',
  'CQRS',
  'MassTransit',
];

const metrics = [
  { value: 5, label: 'Bounded Contexts', suffix: '' },
  { value: 1400, label: 'Tests', suffix: '+' },
  { value: 99.9, label: 'Uptime', suffix: '%' },
  { value: 50, label: 'P99 Latency', suffix: 'ms', prefix: '<' },
];

export function Hero() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-base via-base to-surface" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[128px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-light/20 rounded-full blur-[128px]" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
          transition={{ duration: 0.6 }}
        >
          {/* Main headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-primary mb-6 leading-tight">
            I build distributed systems.
            <br />
            <span className="gradient-text">Here's one running.</span>
          </h1>

          {/* Animated underline */}
          <motion.div
            className="mx-auto h-1 bg-gradient-to-r from-accent to-accent-light rounded-full"
            initial={{ width: 0 }}
            animate={{ width: isVisible ? 200 : 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          />
        </motion.div>

        {/* Tech stack badges */}
        <motion.div
          className="flex flex-wrap justify-center gap-2 mt-8 mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {techStack.map((tech, index) => (
            <motion.div
              key={tech}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
            >
              <Badge variant="outline" className="text-sm">
                {tech}
              </Badge>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Button size="lg" onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}>
            <Sparkles className="w-5 h-5" />
            Try Live Demo
          </Button>
          <Button variant="secondary" size="lg" onClick={() => document.getElementById('architecture')?.scrollIntoView({ behavior: 'smooth' })}>
            View Architecture
            <ArrowRight className="w-5 h-5" />
          </Button>
        </motion.div>

        {/* Metrics */}
        <motion.div
          className="flex flex-wrap justify-center gap-4 mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.9 + index * 0.1 }}
            >
              <MetricCard
                value={metric.value}
                label={metric.label}
                suffix={metric.suffix}
                prefix={metric.prefix}
                animate={true}
                duration={1500}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Secondary links */}
        <motion.div
          className="flex items-center justify-center gap-6 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          <a
            href="https://github.com/chidionyema/haworks"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-secondary hover:text-primary transition-colors"
          >
            <Github className="w-4 h-4" />
            View Source
          </a>
          <a
            href="/cv.pdf"
            download
            className="flex items-center gap-2 text-secondary hover:text-primary transition-colors"
          >
            <FileText className="w-4 h-4" />
            Download CV
          </a>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ duration: 0.6, delay: 1.5 }}
        >
          <motion.div
            className="w-6 h-10 rounded-full border-2 border-secondary/30 flex items-start justify-center p-2"
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <div className="w-1 h-2 rounded-full bg-secondary/50" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
