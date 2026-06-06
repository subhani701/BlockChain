'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/motion';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileText,
  Globe,
  Package,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react';
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
} from '@/components/ui-ami';

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
  initialCustomerId?: string;
}

export function AccountWikiScreen({ callbacks, initialCustomerId }: AccountWikiProps) {
  const router = useRouter();
  const { runtimeScans, setSelectedCustomerId } = useApp();
  const [customerId, setCustomerId] = useState(initialCustomerId ?? 'c3');

  useEffect(() => {
    if (initialCustomerId) setCustomerId(initialCustomerId);
  }, [initialCustomerId]);

  useEffect(() => {
    setSelectedCustomerId(customerId);
  }, [customerId, setSelectedCustomerId]);

  const customer = getCustomer(customerId);
  const recommendations = useMemo(
    () => getRecommendationsForCustomer(customerId).sort((a, b) => b.priority - a.priority),
    [customerId],
  );
  const installRows = useMemo(() => getAccountInstallBaseRows(customerId), [customerId]);
  const replacementDue = useMemo(() => getReplacementDueCountForCustomer(customerId), [customerId]);
  const timeline = useMemo(() => getAccountTimeline(customerId, runtimeScans), [customerId, runtimeScans]);
  const narrative = useMemo(
    () => (customer ? buildAccountNarrative(customer, customerId, runtimeScans) : null),
    [customer, customerId, runtimeScans],
  );

  const switchCustomer = (id: string) => {
    setCustomerId(id);
    router.push(`/account/${id}`);
    const c = getCustomer(id);
    if (c) callbacks.showToast(`Viewing ${c.name}`, 'info');
  };

  const installColumns = useMemo(
    () => [
      {
        key: 'sku',
        header: 'Part',
        cell: (row: AccountInstallBaseRow) => (
          <div>
            <span className="font-mono text-xs font-semibold text-primary">{row.partSku}</span>
            <span className="ds-table-cell-sub block truncate max-w-[12rem]">{row.partName}</span>
          </div>
        ),
      },
      {
        key: 'installed',
        header: 'Installed',
        hideOnMobile: true,
        cell: (row: AccountInstallBaseRow) => <span className="text-xs text-muted-foreground">{formatDate(row.installedAt)}</span>,
      },
      {
        key: 'scan',
        header: 'Last scan',
        cell: (row: AccountInstallBaseRow) => (
          <span className="text-xs text-muted-foreground">{row.lastScanAt ? formatDate(row.lastScanAt) : '—'}</span>
        ),
      },
      {
        key: 'window',
        header: 'Replacement window',
        cell: (row: AccountInstallBaseRow) =>
          row.insufficientHistory ? (
            <EmptyState
              title="Insufficient history"
              description="Not enough data to forecast."
              className="py-1 px-0 items-start text-left [&_p]:text-[10px] [&_p]:mt-0"
            />
          ) : (
            <span className="text-xs font-medium">{formatDate(row.replacementWindow!)}</span>
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
        className="ds-page-inner-wide ds-stack"
      >
        {/* Header */}
        <motion.div variants={fadeInUp} className="ds-page-header">
          <div>
            <h1 className="ds-title">
              <span className="ds-title-icon">
                <Users className="h-5 w-5 text-primary" />
              </span>
              Account Intelligence Wiki
            </h1>
            <p className="ds-subtitle">Living account profiles with predictive insights</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
        </motion.div>

        {/* Customer switcher */}
        <motion.div variants={fadeInUp} className="ds-filter-bar">
          {ACCOUNT_WIKI_SWITCHER_IDS.map((id) => {
            const c = getCustomer(id);
            if (!c) return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => switchCustomer(id)}
                className={`ds-filter-chip ${customerId === id ? 'ds-filter-chip-active' : ''}`}
              >
                {c.name.split(' ').slice(0, 2).join(' ')}
                {c.dataSparse && <span className="ml-1 text-[10px] opacity-70">· sparse</span>}
              </button>
            );
          })}
          <select
            value={customerId}
            onChange={(e) => switchCustomer(e.target.value)}
            className="ds-form-input text-xs py-1.5 ml-auto max-w-[11rem]"
            aria-label="Select customer"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </motion.div>

        {/* Identity band */}
        <AnimatePresence mode="wait">
          <motion.div
            key={customerId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="ds-card p-4"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-xl font-bold shadow-lg shadow-primary/25">
                  {customer.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{customer.name}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">{customer.segment}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Globe size={12} /> {customer.region}
                    </span>
                    {customer.dataSparse && (
                      <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded">
                        Data-sparse
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Lifetime value', value: formatEurAccount(customer.lifetimeValue) },
                  { label: 'Units active', value: customer.unitsActive.toLocaleString() },
                  { label: 'First seen', value: customer.firstSeen },
                ].map((item) => (
                  <div key={item.label} className="text-center lg:text-left">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">{item.label}</p>
                    <p className="text-lg font-bold text-foreground tabular-nums">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <ProvenanceHint source="crm__account_master" freshness={`${customer.id} · synced 1h ago`} className="mt-3" />
          </motion.div>
        </AnimatePresence>

        {/* Predictive row */}
        <AnimatePresence mode="wait">
          <motion.div key={`pred-${customerId}`} variants={fadeInUp} initial="initial" animate="animate" exit="exit" className="ds-grid-3">
            <DataCard
              title="Churn risk"
              action={
                <ExplanationPopover
                  title="Why this score"
                  explanation={churnExplanation}
                  attributions={['model__churn_risk', ...customer.churnDrivers.map((d) => `driver:${d}`)]}
                />
              }
            >
              <div className="flex flex-col items-center py-2">
                <ScoreBadge value={customer.churnRisk} invert className="text-base px-3 py-1" />
                <ul className="mt-3 w-full space-y-1">
                  {customer.churnDrivers.length === 0 ? (
                    <li className="text-xs text-muted-foreground text-center">No active churn drivers</li>
                  ) : (
                    customer.churnDrivers.map((driver) => (
                      <li key={driver} className="text-xs text-foreground flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                        {driver}
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <ProvenanceHint source="model__churn_risk" freshness="refreshed 6h ago" className="mt-2" />
            </DataCard>

            <DataCard title="Next-best-part">
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                {recommendations.length === 0 ? (
                  <EmptyState title="No recommendations" description="No ranked next-best-part signals yet." className="py-4" />
                ) : (
                  recommendations.slice(0, 4).map((rec) => {
                    const part = getPart(rec.partId);
                    return (
                      <div key={rec.id} className="p-2.5 rounded-lg border border-border bg-muted/20">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-mono font-semibold truncate">{part?.sku}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {rec.signals.map((s) => (
                                <SignalChip key={s} signal={s} />
                              ))}
                            </div>
                          </div>
                          <ScoreBadge value={rec.winProbability} invert />
                        </div>
                        <button
                          type="button"
                          onClick={() => callbacks.goToQuote({ customerId, partId: rec.partId, from: 'account-wiki' })}
                          className="ds-btn-sm ds-btn-primary w-full mt-2"
                        >
                          Draft quote <ChevronRight size={12} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
              <ProvenanceHint source="model__next_best_part" freshness={`${recommendations.length} ranked signals`} className="mt-2" />
            </DataCard>

            <DataCard title="Replacement due">
              <div className="flex flex-col items-center justify-center py-4">
                <p className="text-4xl font-bold text-foreground tabular-nums">{replacementDue}</p>
                <p className="text-sm text-muted-foreground mt-1">units within 90-day window</p>
                <p className="text-xs text-muted-foreground mt-3 text-center max-w-[14rem]">
                  Derived from install-base wear cycles and predicted replacement windows for {customer.name}.
                </p>
              </div>
              <ProvenanceHint source="model__wear_cycle · ib__install_base" freshness="p50 replacement forecast" className="mt-2" />
            </DataCard>
          </motion.div>
        </AnimatePresence>

        {/* Body two columns */}
        <motion.div variants={fadeInUp} className="ds-grid-2 items-start">
          <DataCard title="Install-base census">
            {customer.dataSparse && installRows.length === 0 ? (
              <EmptyState
                icon={Package}
                title="Insufficient history"
                description="This account was recently onboarded. Install-base rows will populate after the first SAP sync and field scans."
              />
            ) : (
              <DataTable
                columns={installColumns}
                data={installRows}
                keyFn={(row) => row.id}
                emptyTitle="No install-base units"
                emptyDescription="No deployed units recorded for this customer yet."
              />
            )}
            <ProvenanceHint source="ib__unit_count" freshness={`${installRows.length} units · census 12 min ago`} className="mt-2" />
          </DataCard>

          <DataCard
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
            {narrative ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">{narrative.paragraph1}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{narrative.paragraph2}</p>
              </div>
            ) : (
              <EmptyState title="Narrative unavailable" />
            )}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
              <Sparkles size={12} className="text-primary" />
              <span>Generated · explain</span>
              <ProvenanceHint source="model__narrative_summary" freshness="agent · refreshed on view" />
            </div>
          </DataCard>
        </motion.div>

        {/* Timeline */}
        <motion.div variants={fadeInUp}>
          <DataCard title="Account timeline">
            {timeline.length === 0 ? (
              <EmptyState title="No activity yet" description="Orders, scans, and service events will appear here." />
            ) : (
              <ul className="divide-y divide-border">
                {timeline.map((event) => {
                  const Icon = timelineIcon(event.type);
                  const isSuspect = event.detail.toLowerCase().includes('suspect');
                  return (
                    <li key={event.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          event.type === 'dispute'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            : event.type === 'scan' && isSuspect
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {event.type === 'scan' && isSuspect ? <XCircle size={16} /> : <Icon size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{event.title}</p>
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                            {event.type}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{event.detail}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">{formatDate(event.timestamp)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <ProvenanceHint source="merged__account_timeline" freshness="orders · scans · service · disputes" className="mt-3" />
          </DataCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
