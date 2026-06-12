'use client';

import { motion } from 'framer-motion';
import { useScreenCallbacks } from '@/components/providers/app-provider';
import type { ScreenCallbacks } from '@/components/providers/app-provider';
import { staggerContainer } from '@/lib/motion';

interface ScreenPageProps {
  render: (callbacks: ScreenCallbacks) => React.ReactNode;
  /** Disable inner stagger when the screen manages its own motion tree */
  disableStagger?: boolean;
}

/** Thin wrapper so route pages stay declarative */
export function ScreenPage({ render, disableStagger = true }: ScreenPageProps) {
  const callbacks = useScreenCallbacks();
  const content = render(callbacks);

  if (disableStagger) {
    return <>{content}</>;
  }

  return (
    <motion.div initial="initial" animate="animate" variants={staggerContainer}>
      {content}
    </motion.div>
  );
}
