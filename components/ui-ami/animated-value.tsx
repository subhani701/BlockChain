'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fadeTransition } from '@/lib/motion';

interface AnimatedValueProps {
  value: string;
  delay?: number;
  className?: string;
}

function parseNumeric(value: string): number | null {
  const cleaned = value.replace(/,/g, '').trim();
  if (!/^\d+$/.test(cleaned)) return null;
  return parseInt(cleaned, 10);
}

function useCountUp(target: number, duration = 720, delayMs = 0) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let raf = 0;
    const timeout = window.setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCurrent(Math.round(eased * target));
        if (progress < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delayMs);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delayMs]);

  return current;
}

export function AnimatedValue({ value, delay = 0, className }: AnimatedValueProps) {
  const numeric = parseNumeric(value);
  const delayMs = Math.round(delay * 1000);
  const count = useCountUp(numeric ?? 0, 720, delayMs);

  if (numeric === null) {
    return (
      <motion.span
        className={className}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...fadeTransition(delay), duration: 0.45 }}
      >
        {value}
      </motion.span>
    );
  }

  return (
    <motion.span
      className={cn('tabular-nums', className)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...fadeTransition(delay), duration: 0.45 }}
    >
      {count.toLocaleString()}
    </motion.span>
  );
}
