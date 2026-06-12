import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleDashed,
  Clock,
  Eye,
  FileCheck,
  HelpCircle,
  Loader2,
  Lock,
  Pause,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  DealerStatus,
  ReportStatus,
  ServiceRequestStatus,
  VerificationResult,
} from '@/lib/store/types';

type BadgeVariant =
  | VerificationResult
  | DealerStatus
  | ReportStatus
  | ServiceRequestStatus
  | 'active'
  | 'inactive'
  | 'WARN'
  | 'SUSPEND'
  | 'BLACKLIST'
  | 'REINSTATE'
  | 'APPEAL'
  | 'Open'
  | 'Passed'
  | 'Failed'
  | 'Executed'
  | 'Cancelled';

const STYLES: Record<string, string> = {
  AUTHENTIC: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  COUNTERFEIT: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  CANNOT_VERIFY: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800',
  NOT_YET_SCANNED: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700',
  Authorized: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Under review': 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200',
  Warned: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-200',
  Suspended: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300',
  Blacklisted: 'bg-slate-900 text-white border-slate-700 dark:bg-slate-950',
  Submitted: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
  Confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Dismissed: 'bg-slate-100 text-slate-600 border-slate-200',
  Open: 'bg-blue-50 text-blue-700 border-blue-200',
  'In Progress': 'bg-amber-50 text-amber-800 border-amber-200',
  Closed: 'bg-slate-100 text-slate-600 border-slate-200',
  Passed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Failed: 'bg-red-50 text-red-700 border-red-200',
  Executed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  WARN: 'bg-amber-50 text-amber-800 border-amber-200',
  SUSPEND: 'bg-orange-50 text-orange-800 border-orange-200',
  BLACKLIST: 'bg-red-50 text-red-700 border-red-200',
  REINSTATE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  APPEAL: 'bg-blue-50 text-blue-700 border-blue-200',
  genuine: 'bg-emerald-50/80 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/25 dark:text-emerald-300 dark:border-emerald-800/50',
  suspect: 'bg-red-50/80 text-red-700 border-red-200/80 dark:bg-red-950/25 dark:text-red-300 dark:border-red-800/50',
};

const ICONS: Record<string, LucideIcon> = {
  AUTHENTIC: CheckCircle2,
  COUNTERFEIT: ShieldX,
  CANNOT_VERIFY: HelpCircle,
  NOT_YET_SCANNED: CircleDashed,
  Authorized: ShieldCheck,
  'Under review': Eye,
  Warned: AlertTriangle,
  Suspended: Pause,
  Blacklisted: Ban,
  Submitted: FileCheck,
  Confirmed: CheckCircle2,
  Dismissed: XCircle,
  Open: Loader2,
  'In Progress': Clock,
  Closed: CheckCircle2,
  Passed: CheckCircle2,
  Failed: XCircle,
  Executed: ShieldCheck,
  Cancelled: XCircle,
  WARN: AlertTriangle,
  SUSPEND: Pause,
  BLACKLIST: Ban,
  REINSTATE: ShieldCheck,
  APPEAL: ShieldAlert,
  genuine: CheckCircle2,
  suspect: ShieldX,
};

const LABELS: Record<string, string> = {
  NOT_YET_SCANNED: 'Not yet scanned',
  CANNOT_VERIFY: 'Cannot verify',
  'Under review': 'Under review',
  'In Progress': 'In progress',
};

interface StatusBadgeProps {
  status: BadgeVariant | string;
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const style = STYLES[status] ?? 'bg-muted text-muted-foreground border-border';
  const label = LABELS[status] ?? status.replace(/_/g, ' ');
  const Icon = ICONS[status];

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border capitalize', style, className)}>
      {showIcon && Icon && <Icon size={12} strokeWidth={2} className="shrink-0" />}
      {label}
    </span>
  );
}
