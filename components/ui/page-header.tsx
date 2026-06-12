import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageSearchBar } from '@/components/ui/page-search';

interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  className,
  showSearch = true,
  searchPlaceholder,
  searchValue,
  onSearchChange,
}: PageHeaderProps) {
  return (
    <div className={cn('w-full min-w-0 flex flex-col gap-4', className)}>
      <div className="flex w-full min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {Icon && (
            <span className="ds-title-icon" aria-hidden>
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="ds-title">{title}</h1>
            {subtitle && <p className="ds-subtitle">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0 w-full sm:ml-auto sm:w-auto flex sm:justify-end">{action}</div>}
      </div>
      {showSearch && (
        <div className="ds-page-search-row">
          <PageSearchBar
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={onSearchChange}
          />
        </div>
      )}
    </div>
  );
}
