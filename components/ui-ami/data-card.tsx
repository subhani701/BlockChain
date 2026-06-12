'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeInUp, fadeTransition } from '@/lib/motion';

interface DataCardProps {
  title?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
  compact?: boolean;
  fill?: boolean;
  delay?: number;
  disableMotion?: boolean;
  elevated?: boolean;
}

export function DataCard({
  title,
  icon: Icon,
  action,
  children,
  className,
  padding = true,
  compact = false,
  fill = false,
  delay = 0,
  disableMotion = false,
  elevated = true,
}: DataCardProps) {
  const cardClass = cn(
    'ds-card overflow-hidden w-full min-h-0',
    elevated && 'ds-card-elevated',
    fill && 'ds-card-fill h-full',
    className,
  );

  const content = (
    <>
      {title && (
        <div className="ds-card-header flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon ? (
              <span className="ds-card-icon" aria-hidden>
                <Icon size={16} strokeWidth={1.75} />
              </span>
            ) : (
              <span className="ds-card-header-accent" aria-hidden />
            )}
            <h3 className="ds-section-title mb-0 truncate">{title}</h3>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div
        className={cn(
          padding && (compact ? 'ds-card-body-compact' : 'ds-card-body'),
          !title && padding && 'ds-card-body--flush-top',
        )}
      >
        {children}
      </div>
    </>
  );

  if (disableMotion) {
    return <div className={cardClass}>{content}</div>;
  }

  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      transition={fadeTransition(delay)}
      className={cn(cardClass, 'group')}
    >
      {content}
    </motion.div>
  );
}
