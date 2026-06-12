import { scoreBadgeClass } from '@/lib/design';
import { cn } from '@/lib/utils';

interface ScoreBadgeProps {
  value: number;
  label?: string;
  invert?: boolean;
  className?: string;
}

export function ScoreBadge({ value, label, invert, className }: ScoreBadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium tabular-nums', scoreBadgeClass(value, invert), className)}>
      {label ?? `${value}%`}
    </span>
  );
}
