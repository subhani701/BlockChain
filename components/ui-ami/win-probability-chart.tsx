'use client';

import { useEffect, useId, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import { amiTokens, scoreColorClass } from '@/lib/design';

const BRAND = amiTokens.colors.brand;
import { fadeTransition, listItem, motionEase, staggerFast } from '@/lib/motion';
import type { WinProbabilityFactor, WinProbabilityTrendPoint } from '@/lib/data/ami-data';

interface WinProbabilityChartProps {
  value: number;
  trend: WinProbabilityTrendPoint[];
  factors: WinProbabilityFactor[];
  loading?: boolean;
  className?: string;
}

function useCountUp(target: number, duration = 900, delayMs = 120) {
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

function WinGauge({ value }: { value: number }) {
  const gradientId = useId();
  const display = useCountUp(value);
  const colorClass = scoreColorClass(value, true);

  return (
    <motion.div
      className="relative mx-auto w-full max-w-[220px]"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...fadeTransition(0.05), duration: 0.5 }}
    >
      <svg viewBox="0 0 220 130" className="w-full h-auto" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={BRAND} />
            <stop offset="55%" stopColor="#E8354A" />
            <stop offset="100%" stopColor="#1A8F4C" />
          </linearGradient>
        </defs>
        <path
          d="M 28 108 A 82 82 0 0 1 192 108"
          fill="none"
          stroke="currentColor"
          strokeWidth="14"
          strokeLinecap="round"
          className="text-muted/30"
        />
        <motion.path
          key={value}
          d="M 28 108 A 82 82 0 0 1 192 108"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="14"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0.6 }}
          animate={{ pathLength: Math.min(1, value / 100), opacity: 1 }}
          transition={{ duration: 1.15, ease: motionEase, delay: 0.1 }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-2 flex flex-col items-center pointer-events-none">
        <motion.span
          key={value}
          className={cn('text-4xl font-bold tabular-nums tracking-tight', colorClass)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: motionEase, delay: 0.2 }}
        >
          {display}%
        </motion.span>
        <span className="text-xs font-medium text-muted-foreground mt-0.5">
          Win probability
        </span>
      </div>
    </motion.div>
  );
}

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: WinProbabilityTrendPoint }[];
}) {
  if (!active || !payload?.[0]) return null;
  const point = payload[0].payload;
  return (
    <div className="ds-win-chart-tooltip">
      <p className="font-semibold tabular-nums">{point.probability}%</p>
      {point.event && <p className="text-muted-foreground mt-0.5">{point.event}</p>}
    </div>
  );
}

export function WinProbabilityChart({ value, trend, factors, loading, className }: WinProbabilityChartProps) {
  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="h-[130px] bg-muted/60 rounded-xl animate-pulse" />
        <div className="h-28 bg-muted/50 rounded-xl animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-6 bg-muted/40 rounded-md animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={cn('space-y-4', className)}
      variants={staggerFast}
      initial="initial"
      animate="animate"
    >
      <WinGauge value={value} />

      <motion.div variants={listItem} className="ds-win-chart-trend">
        <p className="ds-win-chart-label">7-day trajectory</p>
        <div className="h-28 w-full min-h-[112px] min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={trend} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="winProbFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={BRAND} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                width={28}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip content={<TrendTooltip />} cursor={{ stroke: BRAND, strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area
                type="monotone"
                dataKey="probability"
                stroke={BRAND}
                strokeWidth={2.5}
                fill="url(#winProbFill)"
                isAnimationActive
                animationDuration={1100}
                animationEasing="ease-out"
                dot={{ r: 3, fill: BRAND, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: BRAND, stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div variants={listItem} className="space-y-2.5">
        <p className="ds-win-chart-label">Score drivers</p>
        {factors.map((factor, index) => (
          <motion.div
            key={factor.key}
            variants={listItem}
            className="ds-win-factor"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={fadeTransition(0.15 + index * 0.06)}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs text-muted-foreground">{factor.label}</span>
              <span className="text-xs font-semibold tabular-nums text-foreground">{factor.score}</span>
            </div>
            <div className="ds-win-factor-track">
              <motion.div
                className="ds-win-factor-fill"
                initial={{ width: 0 }}
                animate={{ width: `${factor.score}%` }}
                transition={{ duration: 0.75, ease: motionEase, delay: 0.2 + index * 0.08 }}
              />
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
