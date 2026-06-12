'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/motion';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Globe,
  Package,
  Users,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import type { ScreenCallbacks } from '@/components/providers/app-provider';
import { useApp } from '@/components/providers/app-provider';
import {
  ACCOUNT_WIKI_SWITCHER_IDS,
  buildAccountNarrative,
  customers,
  formatEurAccount,
  getAccountInstallBaseRows,
  getAccountTimeline,
  getCustomer,
  getPart,
  getRecommendationsForCustomer,
  getReplacementDueCountForCustomer,
  type AccountInstallBaseRow,
  type AccountTimelineEvent,
} from '@/lib/data/ami-data';
import {
  DataCard,
  DataTable,
  EmptyState,
  ExplanationPopover,
  ProvenanceHint,
  ScoreBadge,
  SignalChip,
  TableCellStack,
} from '@/components/ui-ami';
import { cn } from '@/lib/utils';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function timelineIcon(type: AccountTimelineEvent['type']) {
  switch (type) {
    case 'order':
      return FileText;
    case 'scan':
      return CheckCircle2;
    case 'dispute':
      return AlertTriangle;
    default:
      return Activity;
  }
}

export interface AccountWikiProps {
  callbacks: ScreenCallbacks;
  customerId?: string;
}

export function AccountWikiScreen({ callbacks, customerId: customerIdProp }: AccountWikiProps) {
  const router = useRouter();
  const params = useParams();
  const { runtimeScans, setSelectedCustomerId } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const customerId =
    customerIdProp ?? (typeof params?.customerId === 'string' ? params.customerId : undefined) ?? 'c3';

  useEffect(() => {
    setSelectedCustomerId(customerId);
  }, [customerId, setSelectedCustomerId]);

  const customer = getCustomer(customerId);
  const recommendations = useMemo(
    () => getRecommendationsForCustomer(customerId).sort((a, b) => b.priority - a.priority),
    [customerId],
  );
  const installRows = useMemo(() => {
    const rows = getAccountInstallBaseRows(customerId);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.partSku.toLowerCase().includes(q) ||
        row.partName.toLowerCase().includes(q),
    );
  }, [customerId, searchQuery]);
  const replacementDue = useMemo(() => getReplacementDueCountForCustomer(customerId), [customerId]);
  const timeline = useMemo(() => getAccountTimeline(customerId, runtimeScans), [customerId, runtimeScans]);
  const narrative = useMemo(
    () => (customer ? buildAccountNarrative(customer, customerId, runtimeScans) : null),
    [customer, customerId, runtimeScans],
  );

  const switchCustomer = (id: string) => {
    if (id === customerId) return;
    const c = getCustomer(id);
    setSearchQuery('');
    router.replace(`/account/${id}`, { scroll: false });
    if (c) callbacks.showToast(`Viewing ${c.name}`, 'info');
  };

  const installColumns = useMemo(
    () => [
      {
        key: 'sku',
        header: 'Part',
        cell: (row: AccountInstallBaseRow) => (
          <TableCellStack primary={row.partSku} secondary={row.partName} />
        ),
      },
      {
        key: 'installed',
        header: 'Installed',
        hideOnMobile: true,
        cell: (row: AccountInstallBaseRow) => (
          <span className="text-xs text-muted-foreground tabular-nums">{formatDate(row.installedAt)}</span>
        ),
      },
      {
        key: 'scan',
        header: 'Last scan',
        cell: (row: AccountInstallBaseRow) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {row.lastScanAt ? formatDate(row.lastScanAt) : '—'}
          </span>
        ),
      },
      {
        key: 'window',
        header: 'Replacement window',
        cell: (row: AccountInstallBaseRow) =>
          row.insufficientHistory ? (
            <span className="text-xs text-muted-foreground">Insufficient history</span>
          ) : (
            <span className="text-xs font-medium tabular-nums">{formatDate(row.replacementWindow!)}</span>
          ),
      },
    ],
    [],
  );

  if (!customer) {
    return (
      <div className="ds-page">
        <EmptyState title="Customer not found" description={`No account record for id ${customerId}.`} />
      </div>
    );
  }

  const churnExplanation =
    customer.churnDrivers.length > 0
      ? `Churn risk of ${customer.churnRisk}% is driven by: ${customer.churnDrivers.join('; ')}.`
      : `Churn risk of ${customer.churnRisk}% — no active drivers flagged; account health is stable relative to segment peers.`;

  return (
    <div className="ds-page">
      <motion.div
        initial="initial"
        animate="animate"
        variants={staggerContainer}
        className="ds-page-inner-wide"
      >
        <motion.div variants={fadeInUp}>
          <PageHeader
            icon={Users}
            title="Account Intelligence"
            subtitle="Living account profiles with predictive insights and install-base census"
            searchPlaceholder="Search parts in install-base census…"
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </motion.div>

        <motion.div variants={fadeInUp} className="ds-account-toolbar">
          <p className="ds-account-toolbar-label">Switch account</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="ds-account-chip-scroll min-w-0 flex-1 sm:items-center">
              {ACCOUNT_WIKI_SWITCHER_IDS.map((id) => {
                const c = getCustomer(id);
                if (!c) return null;
                const isActive = customerId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => switchCustomer(id)}
                    className={cn('ds-filter-chip shrink-0', isActive && 'ds-filter-chip-active')}
                  >
                    {c.name.split(' ').slice(0, 2).join(' ')}
                    {c.dataSparse && <span className="ml-1 text-[10px] opacity-70">· sparse</span>}
                  </button>
                );
              })}
            </div>
            <div className="relative w-full sm:w-auto sm:min-w-[12rem] shrink-0">
              <select
                value={customerId}
                onChange={(e) => switchCustomer(e.target.value)}
                className="ds-form-input h-9 w-full text-xs font-medium pr-8 appearance-none"
                aria-label="Select customer"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
            </div>
          </div>
        </motion.div>

        <motion.div key={customerId} variants={fadeInUp} initial="initial" animate="animate" className="ds-account-hero">
          <div className="ds-account-hero-body">
            <div className="ds-account-hero-layout">
              <div className="ds-account-hero-identity">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="ds-account-avatar" aria-hidden>
                    {customer.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg sm:text-xl font-semibold text-foreground leading-tight truncate">
                      {customer.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                        {customer.segment}
                      </span>
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        <Globe size={12} />
                        {customer.region}
                      </span>
                      {customer.dataSparse && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                          Data-sparse
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="ds-account-hero-aside">
                <div className="ds-account-kpi-grid">
                  {[
                    { label: 'Lifetime value', value: formatEurAccount(customer.lifetimeValue) },
                    { label: 'Units active', value: customer.unitsActive.toLocaleString() },
                    { label: 'First seen', value: customer.firstSeen },
                  ].map((item) => (
                    <div key={item.label} className="ds-account-kpi-item">
                      <p className="ds-account-kpi-label">{item.label}</p>
                      <p className="ds-account-kpi-value">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="ds-account-hero-actions">
                  <button
                    type="button"
                    onClick={() => {
                      callbacks.goToQuote({ customerId, from: 'account-wiki' });
                      callbacks.showToast(`Quote workbench opened for ${customer.name}`, 'info');
                    }}
                    className="ds-btn-md ds-btn-primary"
                  >
                    Open quote <ChevronRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => callbacks.showToast(`Activity logged for ${customer.name}`, 'success')}
                    className="ds-btn-md ds-btn-outline"
                  >
                    <Activity size={14} /> Log activity
                  </button>
                </div>
              </div>
            </div>

            <ProvenanceHint
              source="crm__account_master"
              freshness={`${customer.id} · synced 1h ago`}
              className="mt-4 pt-3 border-t border-border/50"
            />
          </div>
        </motion.div>

        <motion.div key={`pred-${customerId}`} variants={fadeInUp} className="ds-grid-3-equal ds-grid-equal-children">
          <DataCard
            fill
            compact
            disableMotion
            className="ds-card-equal-compact"
            title="Churn risk"
            action={
              <ExplanationPopover
                title="Why this score"
                explanation={churnExplanation}
                attributions={['model__churn_risk', ...customer.churnDrivers.map((d) => `driver:${d}`)]}
              />
            }
          >
            <div className="ds-card-body-stack">
              <div className="ds-card-body-main flex items-start gap-3">
                <ScoreBadge value={customer.churnRisk} invert className="text-sm px-2.5 py-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {customer.churnDrivers.length === 0
                    ? 'No active churn drivers'
                    : customer.churnDrivers.join(' · ')}
                </p>
              </div>
              <ProvenanceHint
                source="model__churn_risk"
                freshness="refreshed 6h ago"
                className="ds-card-provenance-footer"
              />
            </div>
          </DataCard>

          <DataCard fill compact disableMotion className="ds-card-equal-compact" title="Next-best-part">
            <div className="ds-card-body-stack">
              <div className="ds-card-body-main space-y-2 overflow-y-auto scrollbar-thin">
                {recommendations.length === 0 ? (
                  <EmptyState title="No recommendations" description="No ranked next-best-part signals yet." className="py-4" />
                ) : (
                  recommendations.slice(0, 2).map((rec) => {
                    const part = getPart(rec.partId);
                    return (
                      <div key={rec.id} className="ds-recommendation-row">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-mono font-semibold text-primary truncate">{part?.sku}</p>
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{part?.name}</p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {rec.signals.slice(0, 2).map((s) => (
                                <SignalChip key={s} signal={s} />
                              ))}
                            </div>
                          </div>
                          <ScoreBadge value={rec.winProbability} invert />
                        </div>
                        <button
                          type="button"
                          onClick={() => callbacks.goToQuote({ customerId, partId: rec.partId, from: 'account-wiki' })}
                          className="ds-link-primary mt-2 inline-flex items-center gap-1 text-xs"
                        >
                          Draft quote <ChevronRight size={12} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
              <ProvenanceHint
                source="model__next_best_part"
                freshness={`${recommendations.length} ranked signals`}
                className="ds-card-provenance-footer"
              />
            </div>
          </DataCard>

          <DataCard fill compact disableMotion className="ds-card-equal-compact" title="Replacement due">
            <div className="ds-card-body-stack">
              <div className="ds-card-body-main">
                <p className="text-3xl font-semibold text-foreground tabular-nums leading-none">{replacementDue}</p>
                <p className="text-xs text-muted-foreground mt-2">units within 90-day window</p>
                <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                  Derived from install-base wear cycles and predicted replacement windows.
                </p>
              </div>
              <ProvenanceHint
                source="model__wear_cycle · ib__install_base"
                freshness="p50 replacement forecast"
                className="ds-card-provenance-footer"
              />
            </div>
          </DataCard>
        </motion.div>

        <motion.div variants={fadeInUp} className="ds-grid-2-equal ds-grid-equal-children">
          <DataCard fill compact disableMotion className="ds-card-equal-compact" title="Install-base census">
            <div className="ds-card-body-stack">
              <div className="ds-card-body-main overflow-y-auto scrollbar-thin">
                {customer.dataSparse && installRows.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="Insufficient history"
                    description="This account was recently onboarded. Install-base rows will populate after the first SAP sync and field scans."
                  />
                ) : (
                  <DataTable
                    embedded
                    showFooter
                    columns={installColumns}
                    data={installRows}
                    keyFn={(row) => row.id}
                    emptyTitle="No install-base units"
                    emptyDescription={
                      searchQuery
                        ? 'No parts match your search in this account.'
                        : 'No deployed units recorded for this customer yet.'
                    }
                    className="w-full rounded-lg border border-border"
                  />
                )}
              </div>
              <ProvenanceHint
                source="ib__unit_count"
                freshness={`${installRows.length} units · census 12 min ago`}
                className="ds-card-provenance-footer"
              />
            </div>
          </DataCard>

          <DataCard
            fill
            compact
            disableMotion
            className="ds-card-equal-compact"
            title="Account narrative"
            action={
              narrative && (
                <ExplanationPopover
                  title="Generated narrative"
                  explanation="Two-paragraph summary synthesized from CRM identity, churn model, install-base census, field scans, and ranked recommendations."
                  attributions={narrative.attributions}
                />
              )
            }
          >
            <div className="ds-card-body-stack">
              <div className="ds-card-body-main space-y-3 overflow-y-auto scrollbar-thin">
                {narrative ? (
                  <>
                    <p className="text-sm text-muted-foreground leading-relaxed">{narrative.paragraph1}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{narrative.paragraph2}</p>
                  </>
                ) : (
                  <EmptyState title="Narrative unavailable" />
                )}
              </div>
              <ProvenanceHint
                source="model__narrative_summary"
                freshness="agent · refreshed on view"
                className="ds-card-provenance-footer"
              />
            </div>
          </DataCard>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <DataCard fill compact title="Account timeline">
            {timeline.length === 0 ? (
              <EmptyState title="No activity yet" description="Orders, scans, and service events will appear here." />
            ) : (
              <ul className="divide-y divide-border/70">
                {timeline.map((event) => {
                  const Icon = timelineIcon(event.type);
                  const isSuspect = event.detail.toLowerCase().includes('suspect');
                  return (
                    <li key={event.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <div
                        className={cn(
                          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                          event.type === 'dispute'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            : event.type === 'scan' && isSuspect
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                              : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {event.type === 'scan' && isSuspect ? <XCircle size={16} /> : <Icon size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{event.title}</p>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                            {event.type}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{event.detail}</p>
                        <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">{formatDate(event.timestamp)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <ProvenanceHint
              source="merged__account_timeline"
              freshness="orders · scans · service · disputes"
              className="mt-3 pt-3 border-t border-border/50"
            />
          </DataCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
