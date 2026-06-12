'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, listItem, listItemTransition, staggerContainer, staggerFast } from '@/lib/motion';
import {
  Activity,
  ArrowRight,
  BarChart3,
  FileText,
  GitBranch,
  Key,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  Map as MapIcon,
  QrCode,
  Shield,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
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
  ScoreBadge,
  SignalChip,
} from '@/components/ui-ami';
import { StatusBadge } from '@/components/badges/StatusBadge';
import { PageHeader } from '@/components/ui/page-header';
import { ROUTES } from '@/lib/navigation';
import { useScreenCallbacks } from '@/components/providers/app-provider';
import type { LucideIcon } from 'lucide-react';

const FUNNEL_COLORS = ['#334155', '#475569', '#64748B', '#94A3B8', '#059669'];
const CHART_SLATE = '#64748B';
const CHART_ACCENT = '#C4081F';

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
  const priorities = getRecommendationsRanked().slice(0, 4);
  const funnel = getRevenueFunnel();
  const recentScans = getRecentScans(4, runtimeScans);
  const demand = getPredictiveDemand12Month();

  return (
    <div className="ds-page">
      <motion.div
        initial="initial"
        animate="animate"
        variants={staggerContainer}
        className="ds-page-inner-wide"
      >
        {/* Header */}
        <motion.div variants={fadeInUp}>
          <PageHeader
            icon={LayoutDashboard}
            title="Home dashboard"
            subtitle="What needs your attention today — aftermarket revenue, opportunities, and channel integrity at a glance."
            action={
              <Link href={ROUTES.sellerWorklist} className="ds-btn-md ds-btn-primary shrink-0">
                View worklist <ArrowRight size={14} strokeWidth={2} />
              </Link>
            }
          />
        </motion.div>

        {/* Top KPI row */}
        <motion.div variants={fadeInUp} className="ds-kpi-grid">
          <KpiCard
            label="Aftermarket revenue at risk"
            value={formatEurCompact(metrics.revenueAtRisk)}
            statTrend={metrics.trends.revenueAtRisk}
            delay={0}
          />
          <KpiCard
            label="Open opportunities"
            value={`${metrics.openOpportunities} · ${formatEurCompact(metrics.openOpportunitiesValue)}`}
            statTrend={metrics.trends.openOpportunities}
            delay={0.04}
          />
          <KpiCard
            label="Units due for replacement (90d)"
            value={String(metrics.unitsDue90Days)}
            statTrend={metrics.trends.unitsDue}
            delay={0.08}
          />
          <KpiCard
            label="Open channel-integrity alerts"
            value={String(metrics.channelAlerts)}
            statTrend={metrics.trends.channelAlerts}
            delay={0.12}
          />
        </motion.div>

        {/* Dashboard grid — aligned 12-column layout */}
        <div className="ds-dashboard">
          {/* Today's priorities */}
          <motion.div variants={fadeInUp} className="ds-dashboard-col-7">
            <DataCard
              icon={Target}
              title="Today's priorities"
              compact
              fill
              action={
                <Link href={ROUTES.sellerWorklist} className="ds-card-action">
                  View all <ArrowRight size={12} />
                </Link>
              }
            >
              {priorities.length === 0 ? (
                <EmptyState
                  title="No ranked opportunities"
                  description="When the model surfaces next-best-part signals, they will appear here."
                />
              ) : (
                <div className="ds-priority-list">
                  {priorities.map((opp, index) => {
                    const customer = getCustomer(opp.customerId);
                    const part = getPart(opp.partId);
                    return (
                      <div key={opp.id} className="ds-priority-item">
                        <span className={`ds-priority-rank ${index === 0 ? 'ds-priority-rank--lead' : ''}`}>
                          {opp.priority}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{customer?.name}</p>
                            <ScoreBadge value={opp.winProbability} invert className="shrink-0" />
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                            <p className="text-xs text-muted-foreground truncate tabular-nums">
                              {part?.sku} · {formatEurCompact(opp.estValue)}
                            </p>
                            {opp.signals.slice(0, 2).map((s) => (
                              <SignalChip key={s} signal={s} disableMotion />
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => goToCustomer(opp.customerId)}
                          className="ds-btn-sm ds-btn-outline shrink-0"
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
          <motion.div variants={fadeInUp} className="ds-dashboard-col-5">
            <DataCard icon={GitBranch} title="Revenue thread" compact fill>
              <div className="flex-1 min-h-[220px] flex flex-col">
                <AnimatedChartFrame className="flex-1 min-h-[200px]" delay={0.18}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={funnel}
                      layout="vertical"
                      margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                    >
                      <XAxis type="number" hide domain={[0, 'dataMax + 8']} />
                      <YAxis
                        type="category"
                        dataKey="stage"
                        width={104}
                        tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
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
                        formatter={(value: number, name: string) =>
                          name === 'value' ? [value, 'Count'] : null
                        }
                      />
                      <Bar
                        dataKey="value"
                        radius={[0, 4, 4, 0]}
                        barSize={20}
                        background={{ fill: 'var(--muted)', radius: 4 }}
                        isAnimationActive
                        animationDuration={1100}
                        animationEasing="ease-out"
                        animationBegin={150}
                      >
                        {funnel.map((_, i) => (
                          <Cell key={funnel[i].key} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                        ))}
                        <LabelList
                          dataKey="value"
                          position="right"
                          className="fill-muted-foreground"
                          style={{ fontSize: 10, fontWeight: 500 }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </AnimatedChartFrame>
              </div>
              <p className="ds-caption mt-3 border-t border-border/50 pt-3 shrink-0">
                Field scans through install-base, opportunities, quotes, and won revenue.
              </p>
            </DataCard>
          </motion.div>

          {/* Channel health */}
          <motion.div variants={fadeInUp} className="ds-dashboard-col-4">
          <DataCard
            icon={Activity}
            title="Channel health"
            compact
            fill
            action={
              <Link href={ROUTES.channelMap} className="ds-card-action">
                Map <ArrowRight size={12} />
              </Link>
            }
          >
            <div className="ds-metric-inline mb-3 pb-3 border-b border-border/50">
              <div>
                <AnimatedNumber
                  value={channel.failRate}
                  decimals={1}
                  suffix="%"
                  delay={0.2}
                  duration={1000}
                  className="ds-metric-inline-value"
                />
                <p className="ds-metric-inline-label">Suspect scan fail rate</p>
              </div>
              <div className="text-right">
                <p className="ds-metric-inline-value">
                  <AnimatedNumber value={channel.alertCount} delay={0.28} duration={800} className="inline" />
                </p>
                <p className="ds-metric-inline-label">
                  Open alert{channel.alertCount !== 1 ? 's' : ''}
                </p>
              </div>
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
                      stroke={CHART_ACCENT}
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
          </DataCard>
          </motion.div>

          {/* Recent provenance activity */}
          <motion.div variants={fadeInUp} className="ds-dashboard-col-4">
          <DataCard
            icon={QrCode}
            title="Recent provenance activity"
            compact
            fill
            action={
              <Link href={ROUTES.fieldVerify} className="ds-card-action">
                Verify <ArrowRight size={12} />
              </Link>
            }
          >
            {recentScans.length === 0 ? (
              <EmptyState title="No recent scans" description="Field verification events will appear here." />
            ) : (
              <motion.div
                variants={staggerFast}
                initial="initial"
                animate="animate"
                className="ds-list-panel"
              >
                {recentScans.map((scan, index) => {
                  const part = getPart(scan.partId);
                  return (
                    <motion.div
                      key={scan.id}
                      variants={listItem}
                      transition={listItemTransition(index)}
                      className="ds-list-panel-row"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{part?.sku ?? scan.partId}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {scan.geo.region} · <ScanTimeLabel iso={scan.timestamp} />
                        </p>
                      </div>
                      <StatusBadge status={scan.result} showIcon={false} className="shrink-0" />
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </DataCard>
          </motion.div>

          {/* Predictive demand */}
          <motion.div variants={fadeInUp} className="ds-dashboard-col-4">
          <DataCard
            icon={TrendingUp}
            title="Predictive demand"
            compact
            fill
            action={
              <Link href={ROUTES.installBase} className="ds-card-action">
                Census <ArrowRight size={12} />
              </Link>
            }
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="ds-caption">Next 12-month replacement demand</p>
              <ExplanationPopover
                explanation="Forecasted unit replacements derived from install-base wear cycles, last scan dates, and predicted replacement windows."
                attributions={['model__wear_cycle', 'model__install_base']}
              />
            </div>
            <AnimatedChartFrame className="h-28 flex-1 min-h-[7rem]" delay={0.38}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demand} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '6px' }} />
                  <Bar
                    dataKey="units"
                    fill={CHART_SLATE}
                    opacity={0.9}
                    radius={[2, 2, 0, 0]}
                    isAnimationActive
                    animationDuration={1000}
                    animationEasing="ease-out"
                    animationBegin={120}
                  />
                </BarChart>
              </ResponsiveContainer>
            </AnimatedChartFrame>
          </DataCard>
          </motion.div>

          {/* Explore the platform */}
          <motion.div variants={fadeInUp} className="ds-dashboard-col-12">
          <DataCard icon={LayoutGrid} title="Explore the platform" compact>
            <p className="ds-caption mb-4">
              Launch any workflow across the four implementation phases.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {platformScreens.map((screen) => {
                const Icon = screen.icon;
                return (
                  <Link key={screen.href} href={screen.href} className="group ds-platform-tile">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-muted/40 shrink-0 group-hover:border-border group-hover:bg-muted/60 transition-colors">
                      <Icon size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-foreground truncate">{screen.label}</p>
                        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/90 shrink-0 px-1.5 py-0.5 rounded bg-muted/50">
                          {screen.phase}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{screen.description}</p>
                    </div>
                    <ArrowRight size={14} className="text-muted-foreground/30 group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </DataCard>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
