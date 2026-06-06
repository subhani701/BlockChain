'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/motion';
import { BarChart3 } from 'lucide-react';
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ScreenCallbacks } from '@/components/providers/app-provider';
import { useApp } from '@/components/providers/app-provider';
import {
  filterInstallBaseUnits,
  getInstallBaseAgeDistribution,
  getInstallBaseCensusRows,
  getInstallBaseKpis,
  getInstallBaseRegionalDeployment,
  getInstallBaseRegions,
  getPredictiveDemand12Month,
  parts,
  type InstallBaseCensusFilters,
  type InstallBaseCensusRow,
  type InstallBaseGroupBy,
  type InstallBaseWindowFilter,
} from '@/lib/data/ami-data';
import {
  DataCard,
  DataTable,
  EmptyState,
  ExplanationPopover,
  KpiCard,
  ProvenanceHint,
  ScoreBadge,
} from '@/components/ui-ami';

function formatScanDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatReplacementWindow(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const end = new Date(d);
  end.setMonth(end.getMonth() + 1);
  return `${d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;
}

export interface InstallBaseProps {
  callbacks: ScreenCallbacks;
}

export function InstallBaseScreen({ callbacks }: InstallBaseProps) {
  const { runtimeScans } = useApp();
  const [partId, setPartId] = useState<string | undefined>();
  const [region, setRegion] = useState<string | undefined>();
  const [windowFilter, setWindowFilter] = useState<InstallBaseWindowFilter>('all');
  const [groupBy, setGroupBy] = useState<InstallBaseGroupBy>('customer');

  const filters: InstallBaseCensusFilters = useMemo(
    () => ({ partId, region, window: windowFilter }),
    [partId, region, windowFilter],
  );

  const kpis = useMemo(() => getInstallBaseKpis(filters, runtimeScans), [filters, runtimeScans]);
  const ageData = useMemo(() => getInstallBaseAgeDistribution(filters, runtimeScans), [filters, runtimeScans]);
  const regionData = useMemo(() => getInstallBaseRegionalDeployment(filters, runtimeScans), [filters, runtimeScans]);
  const filteredUnits = useMemo(() => filterInstallBaseUnits(filters, runtimeScans), [filters, runtimeScans]);
  const demandData = useMemo(() => getPredictiveDemand12Month(filteredUnits), [filteredUnits]);
  const censusRows = useMemo(
    () => getInstallBaseCensusRows(filters, groupBy, runtimeScans),
    [filters, groupBy, runtimeScans],
  );

  const regions = getInstallBaseRegions();

  const tableColumns = useMemo(
    () => [
      {
        key: 'label',
        header: groupBy === 'customer' ? 'Customer' : 'Part',
        cell: (row: InstallBaseCensusRow) => (
          <div>
            <span className="font-medium text-foreground">{row.label}</span>
            {row.subtitle && <span className="ds-table-cell-sub block">{row.subtitle}</span>}
          </div>
        ),
      },
      {
        key: 'units',
        header: 'Units active',
        cell: (row: InstallBaseCensusRow) => (
          <span className="font-semibold text-foreground">{row.unitsActive}</span>
        ),
      },
      {
        key: 'verified',
        header: 'Verified',
        hideOnMobile: true,
        cell: (row: InstallBaseCensusRow) => (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{row.unitsVerified}/{row.unitsActive}</span>
            <ScoreBadge
              value={row.unitsActive ? Math.round((row.unitsVerified / row.unitsActive) * 100) : 0}
              invert
            />
          </div>
        ),
      },
      {
        key: 'lastScan',
        header: 'Last scan',
        hideOnMobile: true,
        cell: (row: InstallBaseCensusRow) => (
          <span className="text-xs text-muted-foreground">{formatScanDate(row.lastScanAt)}</span>
        ),
      },
      {
        key: 'replacement',
        header: 'Replacement window (p50)',
        cell: (row: InstallBaseCensusRow) =>
          row.insufficientHistory ? (
            <EmptyState
              title="Insufficient history"
              description="Not enough install or scan history to forecast."
              className="py-2 px-0 items-start text-left [&_p]:text-xs [&_p]:mt-0.5"
            />
          ) : (
            <span className="text-xs font-medium text-foreground">{formatReplacementWindow(row.replacementWindowP50)}</span>
          ),
      },
    ],
    [groupBy],
  );

  const activeFilterCount = [partId, region, windowFilter !== 'all'].filter(Boolean).length;

  return (
    <div className="ds-page">
      <motion.div
        initial="initial"
        animate="animate"
        variants={staggerContainer}
        className="ds-page-inner-wide ds-stack"
      >
        <motion.div variants={fadeInUp}>
          <h1 className="ds-title">
            <span className="ds-title-icon">
              <BarChart3 className="h-5 w-5 text-primary" />
            </span>
            Install-Base Census
          </h1>
          <p className="ds-subtitle">Predictive installed-base intelligence from field scans and wear-cycle models</p>
        </motion.div>

        {/* Filters */}
        <motion.div variants={fadeInUp} className="ds-stack-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">Part</span>
            <button
              type="button"
              onClick={() => setPartId(undefined)}
              className={`ds-filter-chip ${!partId ? 'ds-filter-chip-active' : ''}`}
            >
              All parts
            </button>
            {parts.slice(0, 6).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPartId(p.id === partId ? undefined : p.id)}
                className={`ds-filter-chip font-mono text-[11px] ${partId === p.id ? 'ds-filter-chip-active' : ''}`}
              >
                {p.sku}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">Region</span>
            <button
              type="button"
              onClick={() => setRegion(undefined)}
              className={`ds-filter-chip ${!region ? 'ds-filter-chip-active' : ''}`}
            >
              All regions
            </button>
            {regions.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRegion(r === region ? undefined : r)}
                className={`ds-filter-chip ${region === r ? 'ds-filter-chip-active' : ''}`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">Window</span>
            {(
              [
                { id: 'all' as const, label: 'All units' },
                { id: '90d' as const, label: 'Due ≤ 90 days' },
                { id: '12mo' as const, label: 'Due ≤ 12 months' },
              ] as const
            ).map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setWindowFilter(w.id)}
                className={`ds-filter-chip ${windowFilter === w.id ? 'ds-filter-chip-active' : ''}`}
              >
                {w.label}
              </button>
            ))}

            <span className="text-xs text-muted-foreground ml-auto">
              {filteredUnits.length} units · {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">Group by</span>
            <button
              type="button"
              onClick={() => setGroupBy('customer')}
              className={`ds-filter-chip ${groupBy === 'customer' ? 'ds-filter-chip-active' : ''}`}
            >
              Customer
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('part')}
              className={`ds-filter-chip ${groupBy === 'part' ? 'ds-filter-chip-active' : ''}`}
            >
              Part
            </button>
          </div>
        </motion.div>

        {/* KPIs */}
        <motion.div variants={fadeInUp} className="ds-kpi-grid">
          <KpiCard
            label="Units active in field"
            value={kpis.unitsActive.toLocaleString()}
            statTrend={{ value: `${censusRows.length} ${groupBy} rows`, direction: 'flat' }}
            source="ib__unit_count"
            freshness="install-base census · 12 min ago"
            delay={0}
          />
          <KpiCard
            label="Units verified (scanned)"
            value={`${kpis.unitsVerified} · ${kpis.verifyRate}%`}
            trend={kpis.verifyRate >= 80 ? 'up' : 'down'}
            source="prov__scan_events"
            freshness="genuine field scans linked to install base"
            delay={0.04}
          />
          <KpiCard
            label="Due for replacement (90d)"
            value={kpis.unitsDue90Days.toLocaleString()}
            statTrend={{ value: 'matches home dashboard KPI', direction: 'flat' }}
            source="model__replacement_due"
            freshness="p50 window within 90-day horizon"
            delay={0.08}
          />
          <KpiCard
            label="Average age"
            value={`${kpis.avgAgeMonths} mo`}
            trend={kpis.avgAgeMonths > 24 ? 'down' : 'up'}
            source="ib__avg_age"
            freshness="from install date · as of Jun 2026"
            delay={0.12}
          />
        </motion.div>

        {/* Charts */}
        <motion.div variants={fadeInUp} className="ds-grid-3">
          <DataCard title="Age distribution">
            <div className="h-48 w-full min-h-[12rem]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '6px' }} />
                  <Bar dataKey="count" fill="#2C2C2C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ProvenanceHint source="ib__install_date" freshness={`${filteredUnits.length} units in cohort`} className="mt-2" />
          </DataCard>

          <DataCard title="Regional deployment">
            <div className="h-48 w-full min-h-[12rem]">
              {regionData.length === 0 ? (
                <EmptyState title="No scan geo data" description="Adjust filters to see regional deployment." className="py-6" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionData} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="region" width={72} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '6px' }} />
                    <Bar dataKey="scans" fill="#D40924" opacity={0.9} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <ProvenanceHint source="prov__scan_geo" freshness="scan-derived deployment signal" className="mt-2" />
          </DataCard>

          <DataCard
            title="12-month replacement demand"
            action={
              <ExplanationPopover
                title="Model forecast"
                explanation="Predicted replacement units derived from install date, part duty cycle (wear months), last scan recency, and similar-asset replacement history across the fleet."
                attributions={['model__wear_cycle', 'model__install_base', 'model__similar_asset_history']}
              />
            }
          >
            <div className="h-48 w-full min-h-[12rem]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={demandData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} interval={1} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '6px' }} />
                  <Line type="monotone" dataKey="units" stroke="#D40924" strokeWidth={2} dot={{ r: 3, fill: '#D40924' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <ProvenanceHint source="model__replacement_forecast" freshness="model output · refreshed 6h ago" className="mt-2" />
          </DataCard>
        </motion.div>

        {/* Census table */}
        <motion.div variants={fadeInUp}>
          <DataTable
            columns={tableColumns}
            data={censusRows}
            keyFn={(row) => row.id}
            onRowClick={(row) => {
              callbacks.goToCustomer(row.customerId);
              callbacks.showToast(`Opening account: ${row.label}`, 'info');
            }}
            emptyTitle="No census rows"
            emptyDescription="No install-base units match the current filters."
          />
          <ProvenanceHint
            source="ib__census_table"
            freshness={`${censusRows.length} rows · click row for Account Wiki`}
            className="mt-2"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
