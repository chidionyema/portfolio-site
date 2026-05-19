import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Cog, Shield, TriangleAlert, ChevronDown, ExternalLink } from "lucide-react";
import { DEMO_CONTEXT } from "../../lib/demo-context";
import { Card } from "../ui/Card";
import { Heading } from "../ui/Heading";

interface DemoContextProps {
  demoId: string;
}

export function DemoContext({ demoId }: DemoContextProps) {
  const copy = DEMO_CONTEXT[demoId];
  const [showFailure, setShowFailure] = useState(false);
  if (!copy) return null;

  return (
    <motion.section
      key={demoId + "-context"}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="mb-10"
    >
      {/* Business outcome headline */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 mb-4 rounded-lg bg-accent/[0.06] border border-accent/10">
        <Shield className="w-4 h-4 text-accent shrink-0" />
        <p className="text-sm font-semibold text-primary/90 leading-snug">{copy.businessOutcome}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="panel" padding="sm" className="border-l-4 border-l-warning bg-warning/[0.03]">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-1" />
            <div>
              <Heading variant="caption" className="text-warning/80 mb-1" level={4}>The Problem</Heading>
              <p className="text-sm font-bold text-primary leading-snug">{copy.problemSummary}</p>
            </div>
          </div>
        </Card>
        
        <Card variant="panel" padding="sm" className="border-l-4 border-l-accent bg-accent/[0.03]">
          <div className="flex items-start gap-4">
            <Cog className="w-5 h-5 text-accent shrink-0 mt-1" />
            <div>
              <Heading variant="caption" className="text-accent/80 mb-1" level={4}>The Solution</Heading>
              <p className="text-sm font-bold text-primary leading-snug">{copy.mechanismSummary}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* View source link */}
      {copy.sourceUrl && (
        <div className="mt-3 flex justify-end">
          <a
            href={copy.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-white/30 hover:text-accent transition-colors"
          >
            View source on GitHub
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Without this pattern — expandable failure scenario */}
      {copy.withoutPattern && (
        <div className="mt-3">
          <button
            onClick={() => setShowFailure(!showFailure)}
            className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-error/60 hover:text-error/80 transition-colors"
          >
            <TriangleAlert className="w-3.5 h-3.5" />
            <span className="font-bold">Without this pattern</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFailure ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {showFailure && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 px-4 py-2.5 rounded bg-error/[0.05] border border-error/10 text-sm text-error/80 leading-relaxed">
                  {copy.withoutPattern}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.section>
  );
}
