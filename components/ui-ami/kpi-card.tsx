'use client';

import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { fadeInUp, fadeTransition, springSoft } from '@/lib/motion';
import { AnimatedValue } from './animated-value';
import { ProvenanceHint } from './provenance-hint';
import { StatTrend } from './stat-trend';

interface KpiCardProps {
  label: string;
  value: string;
  delta?: string;
  trend?: 'up' | 'down';
  statTrend?: { value: string; direction?: 'up' | 'down' | 'flat' };
  source?: string;
  freshness?: string;
  delay?: number;
  loading?: boolean;
}

export function KpiCard({
  label,
  value,
  delta,
  trend,
  statTrend,
  source,
  freshness,
  delay = 0,
  loading,
}: KpiCardProps) {
  if (loading) {
    return (
      <div className="ds-kpi-card ds-kpi-card--loading">
        <div className="ds-kpi-shimmer h-3 w-24 rounded-md mb-3" />
        <div className="ds-kpi-shimmer h-9 w-16 rounded-md mb-2" />
        <div className="ds-kpi-shimmer h-6 w-full max-w-[11rem] rounded-md" />
      </div>
    );
  }

  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      transition={fadeTransition(delay)}
      whileHover={{ y: -4, transition: springSoft }}
      whileTap={{ scale: 0.992 }}
      className="ds-kpi-card group"
    >
      <span className="ds-kpi-accent" aria-hidden />

      <div className="relative z-[1] flex items-center justify-between mb-3">
        <p className="ds-label">{label}</p>
        {trend === 'up' && (
          <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: delay + 0.15 }}>
            <TrendingUp size={15} className="text-green-600 dark:text-green-400" />
          </motion.span>
        )}
        {trend === 'down' && (
          <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: delay + 0.15 }}>
            <TrendingDown size={15} className="text-red-600 dark:text-red-400" />
          </motion.span>
        )}
      </div>

      <AnimatedValue value={value} delay={delay + 0.08} className="ds-kpi-value relative z-[1]" />

      {statTrend && <StatTrend value={statTrend.value} direction={statTrend.direction} className="mt-2 relative z-[1]" />}
      {!statTrend && delta && (
        <p
          className={`text-xs font-medium mt-2 relative z-[1] ${
            trend === 'up' ? 'text-green-600 dark:text-green-400' : trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
          }`}
        >
          {delta}
        </p>
      )}
      {source && <ProvenanceHint source={source} freshness={freshness} className="mt-3 relative z-[1]" />}
    </motion.div>
  );
}
