// VoltusWave AMI design tokens — single source for the product visual language

export const amiTokens = {
  colors: {
    brand: '#D40924',
    brandHover: '#B0081F',
    ink: '#2C2C2C',
    page: '#F7F9FA',
    card: '#FFFFFF',
    muted: '#5F5E5A',
    border: '#E5E3DC',
    success: '#1A8F4C',
    warning: '#C47F17',
    danger: '#D40924',
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.625rem',
    xl: '0.875rem',
  },
  shadow: {
    card: '0 1px 3px oklch(0.15 0.02 240 / 6%), 0 4px 12px oklch(0.15 0.02 240 / 4%)',
    elevated: '0 8px 24px oklch(0.15 0.02 240 / 10%)',
  },
  spacing: {
    page: '1.25rem',
    card: '1rem',
    gap: '0.75rem',
  },
  typography: {
    pageTitle: 'text-xl sm:text-2xl font-bold tracking-tight text-foreground',
    sectionTitle: 'text-[15px] font-semibold text-foreground',
    body: 'text-sm text-foreground',
    caption: 'text-xs text-muted-foreground',
    mono: 'font-mono text-xs',
    monoLink: 'font-mono font-semibold text-primary',
  },
  components: {
    filterChip: 'ds-filter-chip',
    filterChipActive: 'ds-filter-chip-active',
    statusActive: 'ds-status-pill ds-status-pill-active',
    statusPending: 'ds-status-pill ds-status-pill-pending',
    statusSuspended: 'ds-status-pill ds-status-pill-suspended',
    infoBannerBlue: 'ds-info-banner ds-info-banner-blue',
    kpiCard: 'ds-kpi-card',
    dataCard: 'ds-card ds-card-elevated',
  },
} as const;

export type ScoreLevel = 'low' | 'medium' | 'high' | 'critical';

export function scoreLevel(value: number, thresholds = { medium: 40, high: 60, critical: 80 }): ScoreLevel {
  if (value >= thresholds.critical) return 'critical';
  if (value >= thresholds.high) return 'high';
  if (value >= thresholds.medium) return 'medium';
  return 'low';
}

export function scoreColorClass(value: number, invert = false): string {
  const level = scoreLevel(value);
  if (invert) {
    if (level === 'critical' || level === 'high') return 'text-green-600 dark:text-green-400';
    if (level === 'medium') return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  }
  if (level === 'critical' || level === 'high') return 'text-red-600 dark:text-red-400';
  if (level === 'medium') return 'text-amber-600 dark:text-amber-400';
  return 'text-green-600 dark:text-green-400';
}

export function scoreBadgeClass(value: number, invert = false): string {
  const level = scoreLevel(value);
  if (invert) {
    if (level === 'critical' || level === 'high') return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
    if (level === 'medium') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
  }
  if (level === 'critical' || level === 'high') return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
  if (level === 'medium') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
}
