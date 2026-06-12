'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/motion';
import { BarChart3, Filter, LineChart as LineChartIcon, MapPin, Table2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
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
  AnimatedChartFrame,
  DataCard,
  DataTable,
  EmptyState,
  ExplanationPopover,
  KpiCard,
} from '@/components/ui-ami';
import { cn } from '@/lib/utils';

function formatScanDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatReplacementWindow(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

function verifyPillClass(rate: number): string {
  if (rate >= 90) return 'ds-verify-pill-high';
  if (rate >= 70) return 'ds-verify-pill-mid';
  return 'ds-verify-pill-low';
}

interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

function Segmented<T extends string>({ value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="ds-segmented">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn('ds-segmented-btn', value === opt.value && 'ds-segmented-btn-active')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export interface InstallBaseProps {
  callbacks: ScreenCallbacks;
}

export function InstallBaseScreen({ callbacks }: InstallBaseProps) {
  const { runtimeScans } = useApp();
  const [partId, setPartId] = useState<string>('');
  const [region, setRegion] = useState<string>('');
  const [windowFilter, setWindowFilter] = useState<InstallBaseWindowFilter>('all');
  const [groupBy, setGroupBy] = useState<InstallBaseGroupBy>('customer');

  const filters: InstallBaseCensusFilters = useMemo(
    () => ({
      partId: partId || undefined,
      region: region || undefined,
      window: windowFilter,
    }),
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
  const activeFilterCount = [partId, region, windowFilter !== 'all'].filter(Boolean).length;

  const tableColumns = useMemo(
    () => [
      {
        key: 'label',
        header: groupBy === 'customer' ? 'Customer' : 'Part',
        cell: (row: InstallBaseCensusRow) => (
          <div>
            <span className="font-medium text-foreground">{row.label}</span>
            {row.subtitle && <span className="block text-xs text-muted-foreground mt-0.5">{row.subtitle}</span>}
          </div>
        ),
      },
      {
        key: 'units',
        header: 'Units active',
        cell: (row: InstallBaseCensusRow) => (
          <span className="font-semibold tabular-nums">{row.unitsActive}</span>
        ),
      },
      {
        key: 'verified',
        header: 'Verified',
        hideOnMobile: true,
        cell: (row: InstallBaseCensusRow) => {
          const rate = row.unitsActive ? Math.round((row.unitsVerified / row.unitsActive) * 100) : 0;
          return (
            <span className={cn('ds-verify-pill', verifyPillClass(rate))}>
              {row.unitsVerified}/{row.unitsActive} · {rate}%
            </span>
          );
        },
      },
      {
        key: 'lastScan',
        header: 'Last scan',
        hideOnMobile: true,
        cell: (row: InstallBaseCensusRow) => (
          <span className="text-sm text-muted-foreground">{formatScanDate(row.lastScanAt)}</span>
        ),
      },
      {
        key: 'replacement',
        header: 'Replacement window',
        cell: (row: InstallBaseCensusRow) =>
          row.insufficientHistory ? (
            <span className="text-sm text-muted-foreground" title="Not enough install or scan history">
              Insufficient data
            </span>
          ) : (
            <span className="text-sm font-medium tabular-nums">{formatReplacementWindow(row.replacementWindowP50)}</span>
          ),
      },
    ],
    [groupBy],
  );

  const clearFilters = () => {
    setPartId('');
    setRegion('');
    setWindowFilter('all');
  };

  return (
    <div className="ds-page">
      <motion.div
        initial="initial"
        animate="animate"
        variants={staggerContainer}
        className="ds-page-inner-wide ds-stack"
      >
        <motion.div variants={fadeInUp}>
          <PageHeader
            icon={BarChart3}
            title="Install-Base Census"
            subtitle="Predictive installed-base intelligence from field scans and wear-cycle models"
            action={
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold tabular-nums text-foreground">{filteredUnits.length}</p>
                <p className="text-xs text-muted-foreground">units in cohort</p>
              </div>
            }
          />
        </motion.div>

        {/* Filters — single panel */}
        <motion.div variants={fadeInUp} className="ds-filter-panel">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <Filter size={15} className="text-muted-foreground" />
              Filters
            </p>
            <div className="flex items-center gap-3">
              {activeFilterCount > 0 && (
                <button type="button" onClick={clearFilters} className="text-xs text-primary hover:underline">
                  Clear all
                </button>
              )}
              <span className="text-xs text-muted-foreground">
                {activeFilterCount === 0 ? 'No filters applied' : `${activeFilterCount} active`}
              </span>
            </div>
          </div>
          <div className="ds-filter-row">
            <div className="ds-filter-field">
              <label htmlFor="ib-part">Part</label>
              <select
                id="ib-part"
                className="ds-form-input h-9"
                value={partId}
                onChange={(e) => setPartId(e.target.value)}
              >
                <option value="">All parts</option>
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>{p.sku}</option>
                ))}
              </select>
            </div>
            <div className="ds-filter-field">
              <label htmlFor="ib-region">Region</label>
              <select
                id="ib-region"
                className="ds-form-input h-9"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="">All regions</option>
                {regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="ds-filter-field">
              <label>Replacement window</label>
              <Segmented
                value={windowFilter}
                onChange={setWindowFilter}
                options={[
                  { value: 'all', label: 'All' },
                  { value: '90d', label: '≤ 90d' },
                  { value: '12mo', label: '≤ 12 mo' },
                ]}
              />
            </div>
            <div className="ds-filter-field">
              <label>Group by</label>
              <Segmented
                value={groupBy}
                onChange={setGroupBy}
                options={[
                  { value: 'customer', label: 'Customer' },
                  { value: 'part', label: 'Part' },
                ]}
              />
            </div>
          </div>
        </motion.div>

        {/* KPIs */}
        <motion.div variants={fadeInUp} className="ds-kpi-grid">
          <KpiCard
            label="Units active in field"
            value={kpis.unitsActive.toLocaleString()}
            statTrend={{ value: `${censusRows.length} ${groupBy} rows`, direction: 'flat' }}
            delay={0}
          />
          <KpiCard
            label="Units verified"
            value={`${kpis.unitsVerified}`}
            statTrend={{ value: `${kpis.verifyRate}% scan rate`, direction: kpis.verifyRate >= 80 ? 'up' : 'down' }}
            delay={0.04}
          />
          <KpiCard
            label="Due for replacement (90d)"
            value={kpis.unitsDue90Days.toLocaleString()}
            statTrend={{ value: 'Within 90-day horizon', direction: 'flat' }}
            delay={0.08}
          />
          <KpiCard
            label="Average age"
            value={`${kpis.avgAgeMonths} mo`}
            statTrend={{ value: 'As of Jun 2026', direction: 'flat' }}
            delay={0.12}
          />
        </motion.div>

        {/* Charts */}
        <motion.div variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <DataCard title="Age distribution" icon={BarChart3} elevated={false}>
            <AnimatedChartFrame className="h-52" delay={0.1}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={ageData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip
                    contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}
                    cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                  />
                  <Bar dataKey="count" fill="var(--foreground)" opacity={0.75} radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </AnimatedChartFrame>
          </DataCard>

          <DataCard title="Regional deployment" icon={MapPin} elevated={false}>
            {regionData.length === 0 ? (
              <EmptyState title="No regional data" description="Adjust filters to see deployment by region." className="py-8" />
            ) : (
              <AnimatedChartFrame className="h-52" delay={0.14}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={regionData} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="region" width={88} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                    <Bar dataKey="scans" fill="var(--primary)" opacity={0.88} radius={[0, 4, 4, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </AnimatedChartFrame>
            )}
          </DataCard>

          <DataCard
            title="12-month replacement demand"
            icon={LineChartIcon}
            elevated={false}
            action={
              <ExplanationPopover
                title="Forecast model"
                explanation="Predicted replacements from install date, wear cycles, and fleet history."
                attributions={['model__wear_cycle', 'model__install_base']}
              />
            }
          >
            <AnimatedChartFrame className="h-52" delay={0.18}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={demandData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} interval={1} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="units" stroke="var(--primary)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </AnimatedChartFrame>
          </DataCard>
        </motion.div>

        {/* Census table */}
        <motion.div variants={fadeInUp}>
          <DataCard
            title={`Census by ${groupBy}`}
            icon={Table2}
            action={<span className="text-xs text-muted-foreground">{censusRows.length} rows</span>}
            elevated={false}
          >
            <DataTable
              embedded
              columns={tableColumns}
              data={censusRows}
              keyFn={(row) => row.id}
              onRowClick={(row) => {
                callbacks.goToCustomer(row.customerId);
                callbacks.showToast(`Opening ${row.label}`, 'info');
              }}
              emptyTitle="No census rows"
              emptyDescription="No install-base units match the current filters."
            />
          </DataCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
