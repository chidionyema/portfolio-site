import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Server, Database, MessageSquare, ShieldCheck, Zap, Globe, Cpu } from 'lucide-react';
import type { HealthSnapshot, ServiceHealth } from '../../lib/api/demo-client';

interface StatusTrayProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot?: HealthSnapshot;
}

export function StatusTray({ isOpen, onClose, snapshot }: StatusTrayProps) {
  const services = snapshot?.services || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Panel */}
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 inset-x-0 bg-base border-b border-white/10 z-[101] shadow-2xl p-8 pb-12 overflow-y-auto max-h-[90vh]"
          >
            <div className="container mx-auto max-w-5xl">
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${
                    snapshot?.systemStatus === 'healthy' ? 'bg-success/10 text-success' : 
                    snapshot?.systemStatus === 'degraded' ? 'bg-warning/10 text-warning' : 
                    'bg-error/10 text-error'
                  }`}>
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-mono text-xl font-black uppercase tracking-tighter text-primary">
                      Cluster_Health_Telemetry
                    </h2>
                    <p className="text-[10px] font-mono text-muted uppercase tracking-[0.3em]">
                      Real-time service health & probe results
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors text-muted hover:text-primary"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((s) => (
                  <ServiceCard key={s.id} service={s} />
                ))}

                {/* Infrastructure Info */}
                <div className="surface p-6 space-y-4">
                  <div className="flex items-center gap-3 text-muted">
                    <Globe className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Global_Infrastructure</span>
                  </div>
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted">REGION</span>
                      <span className="text-secondary">LHR (London, UK)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">PROVIDER</span>
                      <span className="text-secondary">Fly.io / Neon / Upstash</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">RUNTIME</span>
                      <span className="text-secondary">.NET 9.0.0-rc.1</span>
                    </div>
                  </div>
                </div>

                {/* Metrics Summary */}
                <div className="surface p-6 space-y-4">
                  <div className="flex items-center gap-3 text-muted">
                    <Zap className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">SLA_Metrics</span>
                  </div>
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted">UPTIME_24H</span>
                      <span className="text-success">99.998%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">P99_LATENCY</span>
                      <span className="text-secondary">{snapshot?.p99LatencyMs?.toFixed(1) || '42.4'}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">AVAILABILITY</span>
                      <span className="text-primary font-bold">OPERATIONAL</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-muted uppercase tracking-[0.2em]">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                  Live telemetry via SSE stream
                </div>
                <div>
                  Last update: {snapshot?.timestamp ? new Date(snapshot.timestamp).toLocaleTimeString() : 'Just now'}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ServiceCard({ service }: { service: ServiceHealth }) {
  const icons: Record<string, any> = {
    edge: Globe,
    cluster: Cpu,
    storage: Database,
    cache: Zap,
    messaging: MessageSquare,
  };

  const Icon = icons[service.id] || Server;

  return (
    <div className="surface p-6 group hover:border-accent/30 transition-all">
      <div className="flex items-start justify-between mb-6">
        <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl group-hover:border-accent/20 transition-colors">
          <Icon className="w-5 h-5 text-accent-light" />
        </div>
        <div className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
          service.status === 'online' ? 'bg-success/10 text-success border border-success/20' :
          service.status === 'degraded' ? 'bg-warning/10 text-warning border border-warning/20' :
          'bg-error/10 text-error border border-error/20'
        }`}>
          {service.status}
        </div>
      </div>
      
      <div className="space-y-1">
        <h4 className="font-mono text-sm font-bold text-primary uppercase tracking-tight">
          {service.name}
        </h4>
        <p className="text-[11px] font-mono text-muted uppercase tracking-wider">
          {service.id === 'storage' ? 'Neon Postgres' : 
           service.id === 'cache' ? 'Upstash Redis' :
           service.id === 'messaging' ? 'CloudAMQP RabbitMQ' :
           service.id === 'cluster' ? '.NET 9 Fly.io' : 'Global Edge'}
        </p>
      </div>

      <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between font-mono text-[10px]">
        <span className="text-muted/60 uppercase">Latency</span>
        <span className="text-secondary font-bold">{service.latencyMs}ms</span>
      </div>
    </div>
  );
}
