import { Shield } from 'lucide-react';

interface BusinessOutcomeProps {
  outcome: string;
  className?: string;
}

/** One-sentence business impact shown above each demo. */
export function BusinessOutcome({ outcome, className = '' }: BusinessOutcomeProps) {
  return (
    <div className={`flex items-center gap-2.5 px-4 py-2.5 mb-6 rounded-lg bg-accent/[0.06] border border-accent/10 ${className}`}>
      <Shield className="w-4 h-4 text-accent shrink-0" />
      <p className="text-sm font-semibold text-primary/90 leading-snug">{outcome}</p>
    </div>
  );
}
