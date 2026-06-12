import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VerificationAttribution, DealerSignalAttribution } from '@/lib/store/types';
import { PanelEmptyState } from './PanelEmptyState';
import { ProvenanceFooter } from './ProvenanceFooter';

interface AttributionCardProps {
  title?: string;
  score?: number;
  attributions: (VerificationAttribution | DealerSignalAttribution)[];
  feature?: string;
  onAttributionClick?: () => void;
  className?: string;
}

function isVerificationAttr(a: VerificationAttribution | DealerSignalAttribution): a is VerificationAttribution {
  return 'passed' in a;
}

export function AttributionCard({ title = 'Why this result', score, attributions, feature, onAttributionClick, className }: AttributionCardProps) {
  if (attributions.length === 0) {
    return (
      <div className={cn('ds-card', className)}>
        <div className="ds-card-header"><h3 className="ds-section-title">{title}</h3></div>
        <PanelEmptyState kind="NO_DATA" />
      </div>
    );
  }

  return (
    <div className={cn('ds-card', className)}>
      <div className="ds-card-header flex items-center justify-between">
        <h3 className="ds-section-title">{title}</h3>
        {score !== undefined && (
          <span className="text-lg font-bold tabular-nums text-foreground">{score}/100</span>
        )}
      </div>
      <div className="ds-card-body space-y-2">
        {attributions.map((attr) => {
          const label = isVerificationAttr(attr) ? attr.label : attr.label;
          const passed = isVerificationAttr(attr) ? attr.passed : (attr as DealerSignalAttribution).contribution < 20;
          const weight = isVerificationAttr(attr) ? attr.weight : (attr as DealerSignalAttribution).contribution / 100;
          return (
            <button
              key={isVerificationAttr(attr) ? attr.check : (attr as DealerSignalAttribution).factor}
              type="button"
              onClick={onAttributionClick}
              className="w-full flex items-center gap-3 p-2.5 rounded-md border border-border/80 hover:bg-muted/30 text-left transition-colors"
            >
              {passed ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <XCircle size={16} className="text-red-600 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <div className="ds-win-factor-track mt-1.5">
                  <div className="ds-win-factor-fill" style={{ width: `${Math.round(weight * 100)}%` }} />
                </div>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {isVerificationAttr(attr) ? `${Math.round(attr.weight * 100)}%` : `${(attr as DealerSignalAttribution).contribution}%`}
              </span>
            </button>
          );
        })}
        {feature && <ProvenanceFooter feature={feature} />}
      </div>
    </div>
  );
}
