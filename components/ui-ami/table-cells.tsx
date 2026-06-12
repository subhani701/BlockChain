import { cn } from '@/lib/utils';

interface TableCellStackProps {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  className?: string;
}

/** Two-line table cell — bold primary row, muted secondary caption */
export function TableCellStack({ primary, secondary, className }: TableCellStackProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="ds-cell-primary">{primary}</div>
      {secondary != null && secondary !== '' && <div className="ds-cell-secondary">{secondary}</div>}
    </div>
  );
}

interface TableCellCodeProps {
  children: React.ReactNode;
  className?: string;
}

/** Technical IDs — monospace, brand color */
export function TableCellCode({ children, className }: TableCellCodeProps) {
  return <span className={cn('ds-cell-code', className)}>{children}</span>;
}
