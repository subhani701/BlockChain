import { Clock, Database, Inbox, Lock, type LucideIcon } from 'lucide-react';

type EmptyKind = 'NO_DATA' | 'RESTRICTED' | 'STALE';

const MESSAGES: Record<EmptyKind, { title: string; description: string; icon: LucideIcon }> = {
  NO_DATA: { title: 'No data', description: 'No records match the current scope.', icon: Inbox },
  RESTRICTED: { title: 'Restricted', description: 'You do not have permission to view this data.', icon: Lock },
  STALE: { title: 'Stale data', description: 'Data may be outdated. Refresh to sync.', icon: Clock },
};

interface PanelEmptyStateProps {
  kind?: EmptyKind;
  title?: string;
  description?: string;
  icon?: LucideIcon;
}

export function PanelEmptyState({ kind = 'NO_DATA', title, description, icon }: PanelEmptyStateProps) {
  const msg = MESSAGES[kind];
  const Icon = icon ?? msg.icon;
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <span className="ds-card-icon h-10 w-10 mb-3">
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <p className="text-sm font-medium text-foreground">{title ?? msg.title}</p>
      <p className="text-xs text-muted-foreground mt-1">{description ?? msg.description}</p>
    </div>
  );
}
