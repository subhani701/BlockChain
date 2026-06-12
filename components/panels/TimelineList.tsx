import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CustodyEvent, EnforcementEvent } from '@/lib/store/types';
import { formatRelativeTime } from '@/lib/store/provenance';
import { StatusBadge } from '@/components/badges/StatusBadge';
import { PanelEmptyState } from './PanelEmptyState';
import { ProvenanceFooter } from './ProvenanceFooter';

type TimelineEvent = CustodyEvent | EnforcementEvent;

function isCustody(e: TimelineEvent): e is CustodyEvent {
  return 'actor_role' in e;
}

interface TimelineListProps {
  title: string;
  events: TimelineEvent[];
  feature?: string;
  onProposalClick?: (proposalId: string) => void;
  className?: string;
  horizontalOnMobile?: boolean;
}

export function TimelineList({ title, events, feature, onProposalClick, className, horizontalOnMobile }: TimelineListProps) {
  return (
    <div className={cn('ds-card', className)}>
      <div className="ds-card-header">
        <h3 className="ds-section-title">{title}</h3>
      </div>
      <div className="ds-card-body">
        {events.length === 0 ? (
          <PanelEmptyState kind="NO_DATA" />
        ) : (
          <ol className={cn('relative', horizontalOnMobile && 'flex gap-4 overflow-x-auto pb-2 md:block md:overflow-visible md:pb-0')}>
            {events.map((event, i) => {
              if (isCustody(event)) {
                return (
                  <li key={`${event.vc_id}-${i}`} className={cn('relative pl-6 pb-4 last:pb-0', horizontalOnMobile && 'min-w-[200px] md:min-w-0 md:pl-6')}>
                    <span className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-primary" />
                    {i < events.length - 1 && <span className="absolute left-[3px] top-4 bottom-0 w-px bg-border" />}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{event.actor_role}</span>
                      {event.anomaly_flag && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          <AlertTriangle size={10} /> {event.anomaly_flag.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground mt-0.5">{event.actor_display_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeTime(event.occurred_at)} · {event.vc_id}</p>
                  </li>
                );
              }
              const enf = event as EnforcementEvent;
              return (
                <li key={enf.event_id} className="relative pl-6 pb-4 last:pb-0">
                  <span className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-muted-foreground" />
                  {i < events.length - 1 && <span className="absolute left-[3px] top-4 bottom-0 w-px bg-border" />}
                  <div className="flex items-center gap-2">
                    <StatusBadge status={enf.type} />
                    <span className="text-xs text-muted-foreground">{formatRelativeTime(enf.occurred_at)}</span>
                  </div>
                  <p className="text-sm text-foreground mt-1">{enf.rationale_short}</p>
                  {enf.dao_proposal_ref && onProposalClick && (
                    <Link href={`/dao/proposals/${enf.dao_proposal_ref}`} className="text-xs text-primary hover:underline mt-1 inline-block">
                      {enf.dao_proposal_ref}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        {feature && <ProvenanceFooter feature={feature} />}
      </div>
    </div>
  );
}
