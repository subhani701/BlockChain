'use client';

import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageSearchBarProps {
  placeholder?: string;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export function PageSearchBar({
  placeholder = 'Search customers, parts, batches…',
  className,
  value,
  onChange,
}: PageSearchBarProps) {
  return (
    <div className={cn('relative w-full min-w-0', className)}>
      <Search
        size={16}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        className="ds-page-search"
        aria-label={placeholder}
      />
    </div>
  );
}
