import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface StatTrendProps {
  value: string;
  direction?: 'up' | 'down' | 'flat';
  className?: string;
}

export function StatTrend({ value, direction = 'flat', className }: StatTrendProps) {
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;
  const color = direction === 'up' ? 'text-green-600 dark:text-green-400' : direction === 'down' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground';

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', color, className)}>
      <Icon size={12} />
      {value}
    </span>
  );
}
