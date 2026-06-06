import { cn } from '@/lib/utils';

interface ProvenanceHintProps {
  source: string;
  freshness?: string;
  className?: string;
}

export function ProvenanceHint({ source, freshness, className }: ProvenanceHintProps) {
  return (
    <p className={cn('ds-provenance-hint', className)}>
      <span className="ds-provenance-dot" aria-hidden />
      <span className="truncate">
        {source}
        {freshness ? ` · ${freshness}` : ''}
      </span>
    </p>
  );
}
