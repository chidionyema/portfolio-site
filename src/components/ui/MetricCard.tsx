import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

interface MetricCardProps {
  value: number | string;
  label: string;
  suffix?: string;
  prefix?: string;
  animate?: boolean;
  duration?: number;
  className?: string;
}

export function MetricCard({
  value,
  label,
  suffix = '',
  prefix = '',
  animate = true,
  duration = 2000,
  className,
}: MetricCardProps) {
  const [displayValue, setDisplayValue] = useState(animate ? 0 : value);

  useEffect(() => {
    if (!animate || typeof value !== 'number') {
      setDisplayValue(value);
      return;
    }

    const startTime = Date.now();
    const startValue = 0;
    const endValue = value;

    const updateValue = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);

      const current = Math.round(startValue + (endValue - startValue) * eased);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(updateValue);
      }
    };

    requestAnimationFrame(updateValue);
  }, [value, animate, duration]);

  return (
    <div
      className={cn(
        'glass-subtle p-4 text-center min-w-[100px]',
        className
      )}
    >
      <div className="text-3xl font-bold font-mono text-primary mb-1">
        {prefix}
        {displayValue}
        {suffix}
      </div>
      <div className="text-sm text-secondary">{label}</div>
    </div>
  );
}
