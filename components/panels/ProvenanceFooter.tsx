import { cn } from '@/lib/utils';

interface ProvenanceFooterProps {
  feature: string;
  computedAt?: string;
  className?: string;
}

export function ProvenanceFooter({ feature, computedAt = 'just now', className }: ProvenanceFooterProps) {
  return (
    <p className={cn('ds-provenance-hint mt-3', className)}>
      <span className="ds-provenance-dot" aria-hidden />
      <span className="truncate">
        {feature} · computed {computedAt}
      </span>
    </p>
  );
}
