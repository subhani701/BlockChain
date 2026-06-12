'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, ChevronRight } from 'lucide-react';
import { useChannelIntegrity } from '@/components/providers/app-provider';
import { ROUTES } from '@/lib/navigation';
import type { ChannelMapAlertRow } from '@/lib/data/ami-data';
import { cn } from '@/lib/utils';

const PREVIEW_LIMIT = 5;

function formatAlertTime(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function alertTypeLabel(type: ChannelMapAlertRow['type']): string {
  if (type === 'field-raised') return 'Field Alert';
  if (type === 'fail-cluster') return 'Fail Cluster';
  return 'Out-of-Region';
}

function NotificationItem({ alert, onSelect }: { alert: ChannelMapAlertRow; onSelect: () => void }) {
  return (
    <Link href={ROUTES.channelMap} className="ds-notification-item" onClick={onSelect}>
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'text-[10px] font-semibold px-2 py-0.5 rounded',
            alert.type === 'out-of-region'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
              : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
          )}
        >
          {alertTypeLabel(alert.type)}
        </span>
        <span
          className={cn(
            'text-[10px] font-bold uppercase',
            alert.severity === 'high'
              ? 'text-red-600 dark:text-red-400'
              : 'text-amber-600 dark:text-amber-400',
          )}
        >
          {alert.severity}
        </span>
      </div>
      <p className="text-sm font-medium text-foreground mt-1.5 truncate">{alert.location}</p>
      <p className="text-xs text-muted-foreground truncate">{alert.distributor}</p>
      <p className="text-[11px] text-muted-foreground mt-1">
        {alert.count} scan{alert.count === 1 ? '' : 's'} flagged · {formatAlertTime(alert.lastSeen)}
      </p>
    </Link>
  );
}

export function HeaderNotifications() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { mapAlerts } = useChannelIntegrity();
  const count = mapAlerts.length;
  const preview = mapAlerts.slice(0, PREVIEW_LIMIT);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn('relative ds-btn-icon ds-btn-outline shrink-0', open && 'bg-muted')}
        aria-label={`${count} channel alerts`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Channel alerts"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="ds-notifications-panel"
          >
            <div className="ds-notifications-panel-header">
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              {count > 0 && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {count} open
                </span>
              )}
            </div>

            <div className="ds-notifications-panel-body">
              {preview.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">No channel integrity alerts.</p>
              ) : (
                preview.map((alert) => (
                  <NotificationItem key={alert.id} alert={alert} onSelect={() => setOpen(false)} />
                ))
              )}
            </div>

            <div className="ds-notifications-panel-footer">
              <Link
                href={ROUTES.channelMap}
                className="ds-notifications-view-all"
                onClick={() => setOpen(false)}
              >
                View all on Channel Integrity Map
                <ChevronRight size={14} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
