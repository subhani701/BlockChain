'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fadeInUp, fadeTransition, springSoft } from '@/lib/motion';

interface DataCardProps {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
  delay?: number;
  disableMotion?: boolean;
  elevated?: boolean;
}

export function DataCard({
  title,
  action,
  children,
  className,
  padding = true,
  delay = 0,
  disableMotion = false,
  elevated = true,
}: DataCardProps) {
  const cardClass = cn('ds-card overflow-hidden', elevated && 'ds-card-elevated', className);

  const content = (
    <>
      {title && (
        <div className="ds-card-header flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="ds-card-header-accent" aria-hidden />
            <h3 className="ds-section-title mb-0 truncate">{title}</h3>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn(padding && 'ds-card-body', !title && padding && 'ds-card-body--flush-top')}>{children}</div>
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
      whileHover={{ y: -3, transition: springSoft }}
      className={cn(cardClass, 'group')}
    >
      {content}
    </motion.div>
  );
}
