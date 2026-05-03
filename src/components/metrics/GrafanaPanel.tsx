import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, AlertCircle, ExternalLink } from 'lucide-react';

interface GrafanaPanelProps {
  panelId: number;
  title?: string;
  height?: number;
  mode?: 'iframe' | 'snapshot';
}

const PUBLIC_GRAFANA_URL = import.meta.env.PUBLIC_GRAFANA_URL || 'https://snapshot.grafana.net/dashboard/snapshot/...';

/**
 * GrafanaPanel
 * Renders a live telemetry panel from Grafana.
 * Supports iframe embedding and SVG snapshot fallbacks.
 */
export const GrafanaPanel: React.FC<GrafanaPanelProps> = ({ 
  panelId, 
  title, 
  height = 200, 
  mode = 'iframe' 
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Path A: Direct iframe
  const iframeUrl = `${PUBLIC_GRAFANA_URL}?orgId=1&panelId=${panelId}&kiosk=tv&from=now-1h&to=now&theme=dark`;

  // Path B: Server-rendered snapshot fallback (mocked for now)
  const snapshotUrl = `/api/panels/${panelId}.svg`;

  return (
    <div 
      className="relative border border-muted bg-card overflow-hidden group"
      style={{ height }}
    >
      <div className="absolute inset-x-0 top-0 h-8 border-b border-muted bg-muted/30 flex items-center justify-between px-3 z-10">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-muted" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            {title || `Panel ${panelId}`}
          </span>
        </div>
        <a 
          href={iframeUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ExternalLink className="w-3 h-3 text-muted hover:text-accent" />
        </a>
      </div>

      <div className="pt-8 h-full relative">
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-card flex items-center justify-center"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-[8px] font-mono uppercase text-muted">Awaiting Telemetry...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!hasError ? (
          mode === 'iframe' ? (
            <iframe
              src={iframeUrl}
              className="w-full h-full border-0"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setHasError(true);
                setIsLoading(false);
              }}
            />
          ) : (
            <img 
              src={snapshotUrl} 
              alt={title}
              className="w-full h-full object-cover"
              onLoad={() => setIsLoading(false)}
              onError={() => setHasError(true)}
            />
          )
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-center">
            <AlertCircle className="w-5 h-5 text-destructive/50" />
            <span className="text-[10px] font-mono text-muted">
              Panel unavailable. Check Grafana connection.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
