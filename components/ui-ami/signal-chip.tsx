'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { scaleIn } from '@/lib/motion';
import type { SignalType } from '@/lib/data/ami-data';

const signalStyles: Record<SignalType, string> = {
  'churn-risk': 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  'replacement-due': 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800',
  'service-trigger': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  'grey-market-nearby': 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
};

const signalLabels: Record<SignalType, string> = {
  'churn-risk': 'Churn risk',
  'replacement-due': 'Replacement due',
  'service-trigger': 'Service trigger',
  'grey-market-nearby': 'Grey market nearby',
};

interface SignalChipProps {
  signal: SignalType;
  className?: string;
  disableMotion?: boolean;
}

export function SignalChip({ signal, className, disableMotion }: SignalChipProps) {
  const classNames = cn('inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border', signalStyles[signal], className);

  if (disableMotion) {
    return <span className={classNames}>{signalLabels[signal]}</span>;
  }

  return (
    <motion.span
      variants={scaleIn}
      initial="initial"
      animate="animate"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.22 }}
      className={classNames}
    >
      {signalLabels[signal]}
    </motion.span>
  );
}
