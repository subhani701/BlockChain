'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fadeIn, motionEase } from '@/lib/motion';

interface AnimatedChartFrameProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  minHeight?: string;
}

/** Mounts chart after delay so Recharts bar/line animations run from zero on enter */
export function AnimatedChartFrame({ children, delay = 0.12, className, minHeight }: AnimatedChartFrameProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), Math.round(delay * 1000));
    return () => clearTimeout(id);
  }, [delay]);

  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.45, delay, ease: motionEase }}
      className={cn('w-full', className)}
      style={minHeight ? { minHeight } : undefined}
    >
      {ready ? (
        children
      ) : (
        <div
          className="w-full h-full rounded-lg bg-muted/30 animate-pulse"
          style={minHeight ? { minHeight } : { height: '100%' }}
        />
      )}
    </motion.div>
  );
}
