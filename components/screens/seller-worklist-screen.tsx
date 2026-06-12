'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/motion';
import { ArrowRight, Clock, Phone, RefreshCw, Target } from 'lucide-react';
import type { ScreenCallbacks } from '@/components/providers/app-provider';
import {
  formatEurAccount,
  getWorklistKpis,
  getWorklistRows,
  sortWorklistRows,
  type WorklistRow,
  type WorklistSortKey,
} from '@/lib/data/ami-data';
import { PageHeader } from '@/components/ui/page-header';
import {
  DataCard,
  DataTable,
  type DataTableColumn,
  KpiCard,
  ProvenanceHint,
  ScoreBadge,
  SignalChip,
} from '@/components/ui-ami';

type SignalFilter = 'all' | 'churn-risk' | 'replacement-due' | 'service-trigger' | 'grey-market-nearby';

export interface SellerWorklistProps {
  callbacks: ScreenCallbacks;
}

export function SellerWorklistScreen({ callbacks }: SellerWorklistProps) {
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<WorklistSortKey>('priority');
  const [signalFilter, setSignalFilter] = useState<SignalFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, []);

  const kpis = useMemo(() => getWorklistKpis(), []);
  const allRows = useMemo(() => getWorklistRows(), []);

  const visibleRows = useMemo(() => {
    let rows = allRows.filter((r) => !snoozedIds.has(r.id));
    if (signalFilter !== 'all') {
      rows = rows.filter((r) => r.signals.includes(signalFilter));
    }
    return sortWorklistRows(rows, sortBy);
  }, [allRows, snoozedIds, signalFilter, sortBy]);

  const handleSnooze = (row: WorklistRow) => {
    setSnoozedIds((prev) => new Set(prev).add(row.id));
    setExpandedId(null);
    callbacks.showToast(`Snoozed ${row.customerName} · ${row.partSku} until tomorrow`, 'info');
  };

  const handleRefresh = () => {
    setLoading(true);
    setSnoozedIds(new Set());
    setTimeout(() => {
      setLoading(false);
      callbacks.showToast('Worklist refreshed from latest signals', 'success');
    }, 400);
  };

  const columns = useMemo<DataTableColumn<WorklistRow>[]>(
    () => [
      {
        key: 'customer',
        header: 'Customer',
        cell: (row) => (
          <button
            type="button"
            onClick={() => callbacks.goToCustomer(row.customerId)}
            className="text-left font-semibold text-foreground hover:text-primary transition-colors"
          >
            {row.customerName}
            <span className="ds-table-cell-sub block font-normal">Priority {row.priority}</span>
          </button>
        ),
      },
      {
        key: 'signals',
        header: 'Signals',
        hideOnMobile: true,
        cell: (row) => (
          <div className="flex flex-wrap gap-1">
            {row.signals.map((s) => (
              <SignalChip key={s} signal={s} />
            ))}
          </div>
        ),
      },
      {
        key: 'part',
        header: 'Recommended part',
        cell: (row) => (
          <div>
            <span className="font-mono text-xs font-semibold text-primary">{row.partSku}</span>
            {row.partName && <span className="ds-table-cell-sub block">{row.partName}</span>}
          </div>
        ),
      },
      {
        key: 'value',
        header: 'Est. value',
        hideOnMobile: true,
        cell: (row) => <span className="font-semibold tabular-nums">{formatEurAccount(row.estValue)}</span>,
      },
      {
        key: 'win',
        header: 'Win',
        cell: (row) => <ScoreBadge value={row.winProbability} invert />,
      },
      {
        key: 'why',
        header: 'Why',
        hideOnMobile: true,
        className: 'max-w-[14rem]',
        cell: (row) => (
          <p className="text-xs text-muted-foreground truncate" title={row.reason}>
            {row.reason}
          </p>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        className: 'text-right',
        cell: (row) => (
          <div className="flex items-center justify-end gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => {
                callbacks.goToQuote({ customerId: row.customerId, partId: row.partId, from: 'worklist' });
                callbacks.showToast(`Quote draft for ${row.customerName}`, 'success');
              }}
              className="ds-btn-sm ds-btn-primary"
            >
              Draft quote <ArrowRight size={12} />
            </button>
            <button
              type="button"
              onClick={() => callbacks.showToast(`Call logged — ${row.customerName}`, 'success')}
              className="ds-btn-sm ds-btn-outline"
              title="Log call"
            >
              <Phone size={12} />
            </button>
            <button type="button" onClick={() => handleSnooze(row)} className="ds-btn-sm ds-btn-ghost" title="Snooze">
              <Clock size={12} />
            </button>
          </div>
        ),
      },
    ],
    [callbacks],
  );

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
            icon={Target}
            title="Seller Worklist"
            subtitle="AI-prioritized opportunities — ranked, dense, action-first"
            action={
              <button type="button" onClick={handleRefresh} className="ds-btn-md ds-btn-outline" aria-label="Refresh worklist">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
            }
          />
        </motion.div>

        <motion.div variants={fadeInUp} className="ds-kpi-grid">
          <KpiCard
            label="High-risk accounts"
            value={String(kpis.highRiskAccounts)}
            source="model__churn_risk"
            freshness="churn ≥ 50%"
            delay={0}
            loading={loading}
          />
          <KpiCard
            label="Units due for replacement"
            value={kpis.unitsDueReplacement.toLocaleString()}
            source="model__replacement_due"
            freshness="90-day horizon · install-base"
            delay={0.04}
            loading={loading}
          />
          <KpiCard
            label="Open recommended opportunities"
            value={String(kpis.openOpportunities)}
            source="model__next_best_part"
            freshness={`${allRows.length} ranked rows`}
            delay={0.08}
            loading={loading}
          />
          <KpiCard
            label="Quotes awaiting follow-up"
            value={String(kpis.quotesAwaitingFollowUp)}
            source="sap__quote_status"
            freshness="draft + sent quotes"
            delay={0.12}
            loading={loading}
          />
        </motion.div>

        <motion.div variants={fadeInUp} className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">Sort</span>
          {(
            [
              { id: 'priority' as const, label: 'Priority' },
              { id: 'churn' as const, label: 'Churn risk' },
              { id: 'value' as const, label: 'Est. value' },
              { id: 'win' as const, label: 'Win probability' },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSortBy(s.id)}
              className={`ds-filter-chip ${sortBy === s.id ? 'ds-filter-chip-active' : ''}`}
            >
              {s.label}
            </button>
          ))}

          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-2 mr-1">Signal</span>
          {(
            [
              { id: 'all' as const, label: 'All' },
              { id: 'churn-risk' as const, label: 'Churn' },
              { id: 'replacement-due' as const, label: 'Replacement' },
              { id: 'service-trigger' as const, label: 'Service' },
              { id: 'grey-market-nearby' as const, label: 'Grey-market' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSignalFilter(f.id)}
              className={`ds-filter-chip text-[11px] ${signalFilter === f.id ? 'ds-filter-chip-active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </motion.div>

        <motion.div variants={fadeInUp}>
          <DataCard
            title="Priority queue"
            action={<span className="text-xs text-muted-foreground">{visibleRows.length} opportunities</span>}
            padding={false}
          >
            <DataTable
              columns={columns}
              data={visibleRows}
              keyFn={(row) => row.id}
              loading={loading}
              emptyTitle="No prioritized opportunities right now"
              emptyDescription="All opportunities are snoozed or filtered out. Refresh or clear filters to see the queue."
              expandable
              expandedKey={expandedId}
              onExpandToggle={(row) => setExpandedId((prev) => (prev === row.id ? null : row.id))}
              renderExpanded={(row) => (
                <div className="px-4 py-3 space-y-2 bg-muted/20">
                  <div className="flex flex-wrap gap-1 md:hidden">
                    {row.signals.map((s) => (
                      <SignalChip key={s} signal={s} />
                    ))}
                  </div>
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">Rationale: </span>
                    {row.reason}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Install-base: </span>
                    {row.installBaseSummary}
                    {row.dataSparse && ` · churn risk ${row.churnRisk}%`}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <ProvenanceHint
                      source="model__next_best_part"
                      freshness={`priority ${row.priority} · win ${row.winProbability}%`}
                    />
                    <button
                      type="button"
                      onClick={() => callbacks.goToCustomer(row.customerId)}
                      className="text-xs text-primary hover:underline"
                    >
                      Open Account Wiki
                    </button>
                  </div>
                </div>
              )}
              className="border-0 shadow-none rounded-none"
            />
            <div className="px-4 pb-4">
              <ProvenanceHint
                source="model__priority_blend · model__next_best_part"
                freshness="ranked by shared recommendations"
              />
            </div>
          </DataCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
