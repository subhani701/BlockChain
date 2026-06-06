'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, listItem, listItemTransition, staggerContainer, staggerFast } from '@/lib/motion';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  Key,
  Layers,
  LayoutDashboard,
  Map as MapIcon,
  QrCode,
  Shield,
  Target,
  Users,
  XCircle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getCustomer,
  getDashboardHomeMetrics,
  getPart,
  getPredictiveDemand12Month,
  getRecentScans,
  getRecommendationsRanked,
  getRevenueFunnel,
} from '@/lib/data/ami-data';
import { useChannelIntegrity } from '@/components/providers/app-provider';
import {
  AnimatedChartFrame,
  AnimatedNumber,
  DataCard,
  EmptyState,
  ExplanationPopover,
  KpiCard,
  ProvenanceHint,
  ScoreBadge,
  SignalChip,
} from '@/components/ui-ami';
import { ROUTES } from '@/lib/navigation';
import { useScreenCallbacks } from '@/components/providers/app-provider';
import type { LucideIcon } from 'lucide-react';

const FUNNEL_COLORS = ['#D40924', '#E85A4F', '#D4846A', '#A8B09C', '#1A8F4C'];

function formatEurCompact(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${Math.round(value / 1_000)}K`;
  return `€${value.toLocaleString()}`;
}

function formatScanDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

/** Relative time only after mount — avoids Date.now() hydration mismatch */
function ScanTimeLabel({ iso }: { iso: string }) {
  const [label, setLabel] = useState(() => formatScanDate(iso));

  useEffect(() => {
    const d = new Date(iso);
    const diffH = Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60));
    setLabel(diffH < 24 ? `${diffH}h ago` : formatScanDate(iso));
  }, [iso]);

  return <>{label}</>;
}

const platformScreens: {
  href: string;
  label: string;
  description: string;
  phase: string;
  icon: LucideIcon;
}[] = [
  { href: ROUTES.fieldVerify, label: 'Field Verify & Scan', description: 'Authenticate parts in the field with on-chain provenance.', phase: 'Phase 1', icon: QrCode },
  { href: ROUTES.batchMinting, label: 'Batch Minting Console', description: 'Anchor production batches to the private merkle tree.', phase: 'Phase 1', icon: Layers },
  { href: ROUTES.provenanceRegistry, label: 'Provenance Registry', description: 'Manage DIDs, credentials, and DAO governance roles.', phase: 'Phase 1', icon: Key },
  { href: ROUTES.installBase, label: 'Install-Base Census', description: 'Census deployed units, verification rates, and drift.', phase: 'Phase 2', icon: BarChart3 },
  { href: ROUTES.channelMap, label: 'Channel Integrity Map', description: 'Regional scan heatmaps and grey-market clusters.', phase: 'Phase 2', icon: MapIcon },
  { href: ROUTES.account(), label: 'Account Intelligence', description: 'Living account profiles with predictive insights.', phase: 'Phase 3', icon: Users },
  { href: ROUTES.sellerWorklist, label: 'Seller Worklist', description: 'AI-prioritized opportunities ranked for this week.', phase: 'Phase 3', icon: Target },
  { href: ROUTES.quote(), label: 'Quote Workbench', description: 'AI-assisted quoting with guided pricing and win probability.', phase: 'Phase 3', icon: FileText },
  { href: ROUTES.governance, label: 'Governance & Audit', description: 'Decision traces, compliance badges, and DAO votes.', phase: 'Phase 4', icon: Shield },
];

export function HomeDashboard() {
  const { goToCustomer } = useScreenCallbacks();
  const { runtimeScans, health: channel, alertCount } = useChannelIntegrity();
  const metrics = { ...getDashboardHomeMetrics(), channelAlerts: alertCount };
  const priorities = getRecommendationsRanked().slice(0, 5);
  const funnel = getRevenueFunnel();
  const recentScans = getRecentScans(5, runtimeScans);
  const demand = getPredictiveDemand12Month();

  return (
    <div className="ds-page">
      <motion.div
        initial="initial"
        animate="animate"
        variants={staggerContainer}
        className="ds-page-inner-wide ds-stack"
      >
        {/* Header */}
        <motion.div variants={fadeInUp}>
          <h1 className="ds-title">
            <span className="ds-title-icon">
              <LayoutDashboard className="h-5 w-5 text-primary" />
            </span>
            Home dashboard
          </h1>
          <p className="ds-subtitle">
            What needs your attention today — aftermarket revenue, opportunities, and channel integrity at a glance.
          </p>
        </motion.div>

        {/* Top KPI row */}
        <motion.div variants={fadeInUp} className="ds-kpi-grid">
          <KpiCard
            label="Aftermarket revenue at risk"
            value={formatEurCompact(metrics.revenueAtRisk)}
            statTrend={metrics.trends.revenueAtRisk}
            source="model__churn_risk"
            freshness="high-churn accounts · synced 1h ago"
            delay={0}
          />
          <KpiCard
            label="Open opportunities"
            value={`${metrics.openOpportunities} · ${formatEurCompact(metrics.openOpportunitiesValue)}`}
            statTrend={metrics.trends.openOpportunities}
            source="model__next_best_part"
            freshness="ranked now"
            delay={0.04}
          />
          <KpiCard
            label="Units due for replacement (90d)"
            value={String(metrics.unitsDue90Days)}
            statTrend={metrics.trends.unitsDue}
            source="model__wear_cycle"
            freshness="install-base census · 12 min ago"
            delay={0.08}
          />
          <KpiCard
            label="Open channel-integrity alerts"
            value={String(metrics.channelAlerts)}
            statTrend={metrics.trends.channelAlerts}
            source="model__channel_integrity"
            freshness="live"
            delay={0.12}
          />
        </motion.div>

        {/* Main grid */}
        <div className="ds-grid-2">
          {/* Today's priorities */}
          <motion.div variants={fadeInUp}>
            <DataCard
              title="Today's priorities"
              action={
                <Link href={ROUTES.sellerWorklist} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                  View full worklist <ArrowRight size={12} />
                </Link>
              }
            >
              {priorities.length === 0 ? (
                <EmptyState
                  title="No ranked opportunities"
                  description="When the model surfaces next-best-part signals, they will appear here."
                />
              ) : (
                <div className="space-y-2 -mx-1">
                  {priorities.map((opp) => {
                    const customer = getCustomer(opp.customerId);
                    const part = getPart(opp.partId);
                    return (
                      <div
                        key={opp.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground truncate">{customer?.name}</p>
                            <ScoreBadge value={opp.winProbability} invert />
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {opp.signals.map((s) => (
                              <SignalChip key={s} signal={s} />
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono mt-1.5 truncate">
                            {part?.sku} · {formatEurCompact(opp.estValue)} est.
                          </p>
                          <ProvenanceHint source="model__next_best_part" freshness={`priority ${opp.priority}`} className="mt-1" />
                        </div>
                        <button
                          type="button"
                          onClick={() => goToCustomer(opp.customerId)}
                          className="ds-btn-sm ds-btn-outline shrink-0 self-start sm:self-center"
                        >
                          Open <ArrowRight size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </DataCard>
          </motion.div>

          {/* Revenue thread funnel */}
          <motion.div variants={fadeInUp}>
            <DataCard title="Revenue thread">
              <AnimatedChartFrame className="h-52 sm:h-56" delay={0.18}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnel} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="stage"
                      width={120}
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [value, 'Count']}
                    />
                    <Bar
                      dataKey="value"
                      radius={[0, 4, 4, 0]}
                      barSize={18}
                      isAnimationActive
                      animationDuration={1100}
                      animationEasing="ease-out"
                      animationBegin={150}
                    >
                      {funnel.map((_, i) => (
                        <Cell key={funnel[i].key} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </AnimatedChartFrame>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed border-t border-border pt-3">
                Provenance scans feed install-base truth, which surfaces aftermarket opportunities, converts to quotes, and closes won revenue — the after-sales-to-sales loop.
              </p>
              <ProvenanceHint source="ami__revenue_funnel" freshness="derived from shared data layer" className="mt-2" />
            </DataCard>
          </motion.div>
        </div>

        {/* Secondary row — 3 cards */}
        <motion.div
          variants={staggerFast}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {/* Channel health */}
          <motion.div variants={fadeInUp}>
          <DataCard
            title="Channel health"
            action={
              <Link href={ROUTES.channelMap} className="text-xs text-primary hover:underline">
                Open map
              </Link>
            }
          >
            <div className="flex items-baseline justify-between gap-2 mb-3">
              <div>
                <AnimatedNumber
                  value={channel.failRate}
                  decimals={1}
                  suffix="%"
                  delay={0.2}
                  duration={1000}
                  className="text-2xl font-bold text-foreground block"
                />
                <p className="text-xs text-muted-foreground">Suspect scan fail rate</p>
              </div>
              <p className="text-sm font-semibold text-foreground">
                <AnimatedNumber value={channel.alertCount} delay={0.28} duration={800} className="inline" />
                {' '}alert{channel.alertCount !== 1 ? 's' : ''}
              </p>
            </div>
            {channel.sparkline.length === 0 ? (
              <EmptyState title="No suspect trend data" description="Sparkline appears when regional suspect clusters are detected." />
            ) : (
              <AnimatedChartFrame className="h-16" delay={0.32}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={channel.sparkline}>
                    <Line
                      type="monotone"
                      dataKey="suspect"
                      stroke="#D40924"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive
                      animationDuration={1400}
                      animationEasing="ease-out"
                      animationBegin={100}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: '11px', borderRadius: '6px' }}
                      labelFormatter={(l) => `Week ${l}`}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </AnimatedChartFrame>
            )}
            <ProvenanceHint source="model__channel_integrity" freshness="8-week suspect trend" className="mt-2" />
          </DataCard>
          </motion.div>

          {/* Recent provenance activity */}
          <motion.div variants={fadeInUp}>
          <DataCard
            title="Recent provenance activity"
            action={
              <Link href={ROUTES.fieldVerify} className="text-xs text-primary hover:underline">
                Field verify
              </Link>
            }
          >
            {recentScans.length === 0 ? (
              <EmptyState title="No recent scans" description="Field verification events will appear here." />
            ) : (
              <motion.ul
                variants={staggerFast}
                initial="initial"
                animate="animate"
                className="space-y-2"
              >
                {recentScans.map((scan, index) => {
                  const part = getPart(scan.partId);
                  return (
                    <motion.li
                      key={scan.id}
                      variants={listItem}
                      transition={listItemTransition(index)}
                      className="flex items-start gap-2.5 text-sm"
                    >
                      {scan.result === 'genuine' ? (
                        <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-foreground truncate">{part?.sku ?? scan.partId}</p>
                        <p className="text-xs text-muted-foreground">
                          {scan.geo.region} · <ScanTimeLabel iso={scan.timestamp} />
                        </p>
                      </div>
                      <span className={`text-[10px] font-semibold uppercase shrink-0 ${scan.result === 'genuine' ? 'text-green-600' : 'text-red-600'}`}>
                        {scan.result}
                      </span>
                    </motion.li>
                  );
                })}
              </motion.ul>
            )}
            <Link href={ROUTES.installBase} className="text-xs text-primary hover:underline mt-3 inline-block">
              View install-base census
            </Link>
            <ProvenanceHint source="prov__scan_events" freshness="last 5 events" className="mt-1" />
          </DataCard>
          </motion.div>

          {/* Predictive demand */}
          <motion.div variants={fadeInUp}>
          <DataCard
            title="Predictive demand"
            action={
              <Link href={ROUTES.installBase} className="text-xs text-primary hover:underline">
                Census
              </Link>
            }
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs text-muted-foreground">Next 12-month replacement demand</p>
              <ExplanationPopover
                explanation="Forecasted unit replacements derived from install-base wear cycles, last scan dates, and predicted replacement windows."
                attributions={['model__wear_cycle', 'model__install_base']}
              />
            </div>
            <AnimatedChartFrame className="h-24" delay={0.38}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demand} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '6px' }} />
                  <Bar
                    dataKey="units"
                    fill="#D40924"
                    opacity={0.85}
                    radius={[2, 2, 0, 0]}
                    isAnimationActive
                    animationDuration={1000}
                    animationEasing="ease-out"
                    animationBegin={120}
                  />
                </BarChart>
              </ResponsiveContainer>
            </AnimatedChartFrame>
            <ProvenanceHint source="model__replacement_forecast" freshness="refreshed 6h ago" className="mt-2" />
          </DataCard>
          </motion.div>
        </motion.div>

        {/* Explore the platform */}
        <motion.div variants={fadeInUp}>
          <DataCard title="Explore the platform">
            <p className="text-sm text-muted-foreground mb-4">
              Nine screens across four phases — launch any workflow from here.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {platformScreens.map((screen) => {
                const Icon = screen.icon;
                return (
                  <Link
                    key={screen.href}
                    href={screen.href}
                    className="group flex flex-col gap-2 p-4 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-muted/20 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <Icon size={18} className="text-primary" />
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-2 py-0.5 rounded border border-border bg-muted/30">
                        {screen.phase}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {screen.label}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{screen.description}</p>
                  </Link>
                );
              })}
            </div>
          </DataCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
