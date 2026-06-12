'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, CalendarClock, MapPinOff, Wrench, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { scaleIn } from '@/lib/motion';
import type { SignalType } from '@/lib/data/ami-data';

const signalStyles: Record<SignalType, string> = {
  'churn-risk': 'bg-red-50/50 text-red-700 border-red-200/70 dark:bg-red-950/20 dark:text-red-300 dark:border-red-800/50',
  'replacement-due': 'bg-white text-muted-foreground border-border/80 dark:bg-card dark:text-muted-foreground dark:border-border/80',
  'service-trigger': 'bg-slate-50 text-slate-600 border-slate-200/80 dark:bg-slate-800/30 dark:text-slate-300 dark:border-slate-700/60',
  'grey-market-nearby': 'bg-white text-muted-foreground border-border/80 dark:bg-card dark:text-muted-foreground dark:border-border/80',
};

const signalLabels: Record<SignalType, string> = {
  'churn-risk': 'Churn risk',
  'replacement-due': 'Replacement due',
  'service-trigger': 'Service trigger',
  'grey-market-nearby': 'Grey market nearby',
};

const signalIcons: Record<SignalType, LucideIcon> = {
  'churn-risk': AlertTriangle,
  'replacement-due': CalendarClock,
  'service-trigger': Wrench,
  'grey-market-nearby': MapPinOff,
};

interface SignalChipProps {
  signal: SignalType;
  className?: string;
  disableMotion?: boolean;
}

export function SignalChip({ signal, className, disableMotion }: SignalChipProps) {
  const Icon = signalIcons[signal];
  const classNames = cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border', signalStyles[signal], className);
  const content = (
    <>
      <Icon size={11} strokeWidth={2} className="shrink-0" />
      {signalLabels[signal]}
    </>
  );

  if (disableMotion) {
    return <span className={classNames}>{content}</span>;
  }

  return (
    <motion.span
      variants={scaleIn}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.15 }}
      className={classNames}
    >
      {content}
    </motion.span>
  );
}
