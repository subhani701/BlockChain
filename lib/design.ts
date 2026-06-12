// VoltusWave AMI design tokens — single source for the product visual language

export const amiTokens = {
  colors: {
    brand: '#C4081F',
    brandHover: '#A00719',
    ink: '#0F172A',
    page: '#F4F6F9',
    card: '#FFFFFF',
    muted: '#64748B',
    border: '#E2E8F0',
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
    pageTitle: 'ds-title',
    pageSubtitle: 'ds-subtitle',
    sectionTitle: 'ds-section-title',
    overline: 'ds-overline',
    body: 'ds-body',
    bodyMedium: 'ds-body-medium',
    caption: 'ds-caption',
    tableHeader: 'ds-table-th',
    cellPrimary: 'ds-cell-primary',
    cellSecondary: 'ds-cell-secondary',
    cellCode: 'ds-cell-code',
    mono: 'text-xs font-normal tabular-nums',
    monoLink: 'text-xs font-medium tabular-nums text-primary',
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
    if (level === 'critical' || level === 'high') return 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/50';
    if (level === 'medium') return 'bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/50';
    return 'bg-red-50 text-red-700 border border-red-200/80 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800/50';
  }
  if (level === 'critical' || level === 'high') return 'bg-red-50 text-red-700 border border-red-200/80 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800/50';
  if (level === 'medium') return 'bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/50';
  return 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/50';
}
