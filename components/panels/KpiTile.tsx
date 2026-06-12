import { cn } from '@/lib/utils';

interface KpiTileProps {
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  /** kpi = large dashboard metric · context = compact metadata ribbon */
  variant?: 'kpi' | 'context';
  mono?: boolean;
}

function isPrimitiveValue(value: React.ReactNode): value is string | number {
  return typeof value === 'string' || typeof value === 'number';
}

export function KpiTile({
  label,
  value,
  subValue,
  className,
  onClick,
  variant = 'kpi',
  mono = false,
}: KpiTileProps) {
  const Comp = onClick ? 'button' : 'div';
  const isContext = variant === 'context';

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        isContext ? 'ds-context-tile' : 'ds-kpi-card',
        !isContext && 'text-left',
        onClick && !isContext && 'cursor-pointer hover:border-primary/30',
        className,
      )}
    >
      <p className={isContext ? 'ds-context-tile-label' : 'ds-label mb-2'}>{label}</p>
      <div className={isContext ? 'ds-context-tile-value' : 'ds-kpi-value'}>
        {isContext && isPrimitiveValue(value) ? (
          <span className={cn('ds-context-tile-text', mono && 'ds-context-tile-code')}>{value}</span>
        ) : (
          value
        )}
      </div>
      {subValue != null && subValue !== '' && (
        <div className={isContext ? 'ds-context-tile-sub' : 'mt-2 text-xs text-muted-foreground'}>
          {subValue}
        </div>
      )}
    </Comp>
  );
}

interface KpiGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
}

export function KpiGrid({ children, className, columns = 4 }: KpiGridProps) {
  const cols = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
    6: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
  };
  return <div className={cn('grid grid-cols-1 gap-3 items-stretch', cols[columns], className)}>{children}</div>;
}
