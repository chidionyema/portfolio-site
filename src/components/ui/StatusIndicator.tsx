import { cn } from '../../lib/utils';

type Status = 'success' | 'info' | 'warning' | 'error' | 'idle';

interface StatusIndicatorProps {
  status: Status;
  label?: string;
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusColors: Record<Status, string> = {
  success: 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]',
  info: 'bg-info shadow-[0_0_8px_rgba(59,130,246,0.5)]',
  warning: 'bg-warning shadow-[0_0_8px_rgba(245,158,11,0.5)]',
  error: 'bg-error shadow-[0_0_8px_rgba(239,68,68,0.5)]',
  idle: 'bg-muted',
};

const statusSizes: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-3 h-3',
};

export function StatusIndicator({
  status,
  label,
  pulse = false,
  size = 'md',
  className,
}: StatusIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        className={cn(
          'rounded-full',
          statusColors[status],
          statusSizes[size],
          pulse && status !== 'idle' && 'animate-pulse'
        )}
      />
      {label && <span className="text-sm text-secondary">{label}</span>}
    </div>
  );
}
