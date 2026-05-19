import { motion } from "framer-motion";
import { AlertCircle, Cog, Shield } from "lucide-react";
import { DEMO_CONTEXT } from "../../lib/demo-context";
import { Card } from "../ui/Card";
import { Heading } from "../ui/Heading";

interface DemoContextProps {
  demoId: string;
}

export function DemoContext({ demoId }: DemoContextProps) {
  const copy = DEMO_CONTEXT[demoId];
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
    </motion.section>
  );
}
