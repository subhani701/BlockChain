'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fadeInUp, fadeTransition, scaleIn } from '@/lib/motion';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      transition={fadeTransition()}
      className={cn('flex flex-col items-center justify-center text-center py-12 px-6', className)}
    >
      {Icon && (
        <motion.div
          variants={scaleIn}
          initial="initial"
          animate="animate"
          transition={{ ...fadeTransition(0.1), duration: 0.4 }}
          className="w-14 h-14 rounded-2xl bg-muted/80 ring-1 ring-border flex items-center justify-center mb-4"
        >
          <Icon size={24} className="text-muted-foreground" strokeWidth={1.75} />
        </motion.div>
      )}
      <p className="text-sm font-semibold text-foreground tracking-tight">{title}</p>
      {description && <p className="text-sm text-muted-foreground mt-1.5 max-w-sm leading-relaxed">{description}</p>}
      {action && (
        <motion.div className="mt-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={fadeTransition(0.2)}>
          {action}
        </motion.div>
      )}
    </motion.div>
  );
}
