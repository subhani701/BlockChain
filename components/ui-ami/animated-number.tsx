'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fadeTransition } from '@/lib/motion';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  delay?: number;
  duration?: number;
  className?: string;
}

function useCountUp(target: number, duration: number, delayMs: number, decimals: number) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let raf = 0;
    const timeout = window.setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const next = eased * target;
        setCurrent(decimals > 0 ? next : Math.round(next));
        if (progress < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delayMs);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delayMs, decimals]);

  return current;
}

export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  delay = 0,
  duration = 900,
  className,
}: AnimatedNumberProps) {
  const delayMs = Math.round(delay * 1000);
  const current = useCountUp(value, duration, delayMs, decimals);
  const formatted = decimals > 0 ? current.toFixed(decimals) : Math.round(current).toLocaleString();

  return (
    <motion.span
      className={cn('tabular-nums', className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...fadeTransition(delay), duration: 0.45 }}
    >
      {prefix}
      {formatted}
      {suffix}
    </motion.span>
  );
}
