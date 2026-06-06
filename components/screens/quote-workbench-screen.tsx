'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/motion';
import { Check, ClipboardCopy, FileText, Send, Sparkles } from 'lucide-react';
import type { ScreenCallbacks } from '@/components/providers/app-provider';
import { useApp } from '@/components/providers/app-provider';
import {
  buildQuoteWorkbenchState,
  createQuoteReleaseDecisionTrace,
  formatEurAccount,
  getWinProbabilityExplanation,
  getWinProbabilityFactors,
  getWinProbabilityTrend,
  WRITE_BACK_MODE_LABELS,
  type QuoteWorkbenchLine,
  type QuoteWorkbenchState,
  type WriteBackMode,
} from '@/lib/data/ami-data';
import {
  DataCard,
  DataTable,
  type DataTableColumn,
  EmptyState,
  ExplanationPopover,
  ProvenanceHint,
  WinProbabilityChart,
} from '@/components/ui-ami';

type LineFilter = 'all' | 'ai' | 'manual';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  won: 'Won',
  lost: 'Lost',
};

export interface QuoteWorkbenchProps {
  callbacks: ScreenCallbacks;
  quoteId?: string;
}

export function QuoteWorkbenchScreen({ callbacks, quoteId }: QuoteWorkbenchProps) {
  const { quoteContext, releaseQuote } = useApp();
  const [loading, setLoading] = useState(true);
  const [lineFilter, setLineFilter] = useState<LineFilter>('all');
  const [writeBackMode, setWriteBackMode] = useState<WriteBackMode>('draft-sap');
  const [lines, setLines] = useState<QuoteWorkbenchLine[]>([]);
  const [winProbability, setWinProbability] = useState(0);

  const baseState = useMemo(
    () =>
      buildQuoteWorkbenchState({
        quoteId,
        customerId: quoteContext.customerId,
        partId: quoteContext.partId,
        from: quoteContext.from,
      }),
    [quoteId, quoteContext],
  );

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (baseState) {
      setLines(baseState.lines);
      setWinProbability(baseState.winProbability);
    }
  }, [baseState]);

  const filteredLines = useMemo(() => {
    if (lineFilter === 'ai') return lines.filter((l) => l.aiDrafted);
    if (lineFilter === 'manual') return lines.filter((l) => !l.aiDrafted);
    return lines;
  }, [lines, lineFilter]);

  const quoteTotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0),
    [lines],
  );

  const acceptGuidedPrice = (partId: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.partId !== partId) return l;
        const nextWin = winProbability + l.winProbDelta;
        setWinProbability(Math.min(99, nextWin));
        return { ...l, unitPrice: l.guidedPrice };
      }),
    );
    callbacks.showToast('Guided price accepted — win probability updated', 'success');
  };

  const handlePrimaryAction = (state: QuoteWorkbenchState) => {
    const snapshot: QuoteWorkbenchState = { ...state, lines, winProbability };
    const trace = createQuoteReleaseDecisionTrace(writeBackMode, snapshot);

    if (writeBackMode === 'recommend') {
      const text = [
        `Quote ${state.quoteId} · ${state.customer.name}`,
        ...lines.map((l) => `${l.sku} × ${l.qty} @ €${l.unitPrice.toFixed(2)}`),
        `Total: ${formatEurAccount(quoteTotal)} · Win ${winProbability}%`,
      ].join('\n');
      void navigator.clipboard?.writeText(text);
      callbacks.showToast('Quote recommendation copied to clipboard', 'success');
      return;
    }

    releaseQuote(trace);
    if (writeBackMode === 'closed-loop') {
      callbacks.showToast(`Quote ${state.quoteId} released to SAP — decision trace logged`, 'success');
    } else {
      callbacks.showToast(`SAP draft created for ${state.customer.name}`, 'success');
    }
  };

  const lineColumns = useMemo<DataTableColumn<QuoteWorkbenchLine>[]>(
    () => [
      {
        key: 'part',
        header: 'Part',
        cell: (row) => (
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-foreground">{row.sku}</span>
              {row.aiDrafted && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded">
                  <Sparkles size={10} /> AI-drafted
                </span>
              )}
            </div>
            <span className="ds-table-cell-sub">{row.name}</span>
          </div>
        ),
      },
      {
        key: 'qty',
        header: 'Qty',
        cell: (row) => <span className="tabular-nums">{row.qty}</span>,
      },
      {
        key: 'unit',
        header: 'Unit price',
        cell: (row) => (
          <span className={row.unitPrice <= row.guidedPrice ? 'text-green-600 dark:text-green-400 font-semibold tabular-nums' : 'tabular-nums'}>
            €{row.unitPrice.toFixed(2)}
          </span>
        ),
      },
      {
        key: 'sap',
        header: 'SAP list',
        hideOnMobile: true,
        cell: (row) => <span className="text-muted-foreground tabular-nums">€{row.sapListPrice.toFixed(2)}</span>,
      },
      {
        key: 'margin',
        header: 'Margin',
        hideOnMobile: true,
        cell: (row) => <span className="tabular-nums">{(row.margin * 100).toFixed(0)}%</span>,
      },
      {
        key: 'total',
        header: 'Line total',
        cell: (row) => <span className="font-semibold tabular-nums">€{(row.qty * row.unitPrice).toFixed(2)}</span>,
      },
    ],
    [],
  );

  if (!loading && !baseState) {
    return (
      <div className="ds-page">
        <div className="ds-page-inner-wide">
          <EmptyState
            title="Quote not found"
            description="No shared quote or recommendation matches this preload context."
          />
        </div>
      </div>
    );
  }

  const winExplanation = useMemo(
    () => (baseState ? getWinProbabilityExplanation({ ...baseState, winProbability }) : null),
    [baseState, winProbability],
  );
  const winTrend = useMemo(
    () => (baseState ? getWinProbabilityTrend({ ...baseState, winProbability }, winProbability) : []),
    [baseState, winProbability],
  );
  const winFactors = useMemo(
    () => (baseState ? getWinProbabilityFactors({ ...baseState, winProbability }, winProbability) : []),
    [baseState, winProbability],
  );

  return (
    <div className="ds-page">
      <motion.div
        initial="initial"
        animate="animate"
        variants={staggerContainer}
        className="ds-page-inner-wide ds-stack"
      >
        <motion.div variants={fadeInUp} className="ds-page-header">
          <div>
            <h1 className="ds-title">
              <span className="ds-title-icon">
                <FileText className="h-5 w-5 text-primary" />
              </span>
              Quote Intelligence Workbench
            </h1>
            <p className="ds-subtitle">
              AI-assisted quoting with guided pricing and win probability
              {baseState?.preloadedFrom && (
                <span className="ml-2 text-primary font-medium">
                  · preloaded from {baseState.preloadedFrom.replace(/-/g, ' ')}
                </span>
              )}
            </p>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'all' as const, label: 'All lines' },
              { id: 'ai' as const, label: 'AI drafted' },
              { id: 'manual' as const, label: 'Manual' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setLineFilter(f.id)}
              className={`ds-filter-chip ${lineFilter === f.id ? 'ds-filter-chip-active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </motion.div>

        <div className="ds-grid-3 gap-4">
          {/* Left — quote editor */}
          <motion.div variants={fadeInUp} className="lg:col-span-2 space-y-4">
            <DataCard title={`Quote #${baseState?.quoteId ?? '…'}`}>
              {loading ? (
                <div className="grid md:grid-cols-3 gap-4 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-muted rounded" />
                  ))}
                </div>
              ) : baseState ? (
                <>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Customer</p>
                      <button
                        type="button"
                        onClick={() => callbacks.goToCustomer(baseState.customer.id)}
                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors mt-1 text-left"
                      >
                        {baseState.customer.name}
                      </button>
                      <p className="text-xs text-muted-foreground mt-0.5">{baseState.customer.segment} · {baseState.customer.region}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Valid until</p>
                      <p className="text-sm font-semibold text-foreground mt-1">{baseState.validUntil}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Total value</p>
                      <p className="text-lg font-bold text-primary mt-1 tabular-nums">{formatEurAccount(quoteTotal)}</p>
                    </div>
                  </div>
                  <span className="inline-flex mt-3 px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-full">
                    {STATUS_LABELS[baseState.status] ?? baseState.status}
                  </span>
                  <ProvenanceHint source="sap__quote_header · sap__customer_master" freshness="shared quote + customer layer" className="mt-3" />
                </>
              ) : null}
            </DataCard>

            {baseState?.recommendationReason && (
              <DataCard title="Preloaded recommendation">
                <p className="text-sm text-foreground">{baseState.recommendationReason}</p>
                <ProvenanceHint source="model__next_best_part" freshness={`seeded first line · ${quoteContext.partId ?? 'top rec'}`} className="mt-2" />
              </DataCard>
            )}

            <DataTable
              columns={lineColumns}
              data={filteredLines}
              keyFn={(row) => row.lineKey}
              loading={loading}
              emptyTitle="No line items"
              emptyDescription="Adjust the line filter or reload from a recommendation."
              className="shadow-none"
            />

            {/* Footer write-back */}
            <DataCard title="Write-back mode">
              <div className="flex flex-wrap gap-2 mb-4">
                {(
                  [
                    { id: 'recommend' as const, label: 'Recommend' },
                    { id: 'draft-sap' as const, label: 'Draft to SAP' },
                    { id: 'closed-loop' as const, label: 'Closed-loop' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setWriteBackMode(m.id)}
                    className={`ds-filter-chip ${writeBackMode === m.id ? 'ds-filter-chip-active' : ''}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {/* model__guided_pricing + model__win_probability outputs bind here; SAP write-back via BAPI_QUOTATION_CREATE / OData SalesQuote */}
                Model outputs bind to line pricing and win score; SAP release uses SD BAPI/OData on primary action.
              </p>
              <div className="ds-actions-split ds-quote-cta">
                <button
                  type="button"
                  disabled={!baseState || loading}
                  onClick={() => baseState && handlePrimaryAction(baseState)}
                  className="ds-btn-lg ds-btn-primary sm:h-9 sm:px-4"
                >
                  {writeBackMode === 'recommend' ? <ClipboardCopy size={17} /> : <Send size={17} />}
                  {WRITE_BACK_MODE_LABELS[writeBackMode]}
                </button>
                <button
                  type="button"
                  onClick={() => callbacks.showToast('Quote draft saved locally', 'success')}
                  className="ds-btn-md ds-btn-outline"
                >
                  Save draft
                </button>
              </div>
              <ProvenanceHint source="sap__quote_export" freshness={`mode: ${writeBackMode}`} className="mt-3" />
            </DataCard>
          </motion.div>

          {/* Right — intelligence */}
          <motion.div variants={fadeInUp} className="space-y-4">
            <DataCard
              title="Win probability"
              action={
                winExplanation && (
                  <ExplanationPopover
                    title="Why this win score"
                    explanation={winExplanation.text}
                    attributions={winExplanation.attributions}
                  />
                )
              }
            >
              <WinProbabilityChart
                value={winProbability}
                trend={winTrend}
                factors={winFactors}
                loading={loading}
              />
              <ProvenanceHint source="model__win_probability" freshness="refreshes on guided-price accept" className="mt-2" />
            </DataCard>

            <DataCard title="Guided pricing">
              {loading ? (
                <div className="space-y-2 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-muted rounded" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {lines.map((line) => {
                    const atGuided = Math.abs(line.unitPrice - line.guidedPrice) < 0.01;
                    return (
                      <div key={line.lineKey} className="rounded-lg border border-border p-3 bg-muted/20">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-mono font-semibold text-foreground">{line.sku}</span>
                          {atGuided ? (
                            <span className="text-[10px] font-semibold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded">
                              At guided
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded">
                              +{line.winProbDelta}% if guided
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground mb-2">
                          <div>
                            <p className="uppercase font-semibold">SAP list</p>
                            <p className="text-foreground tabular-nums">€{line.sapListPrice.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="uppercase font-semibold">Condition</p>
                            <p className="text-foreground tabular-nums">€{line.sapConditionPrice.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="uppercase font-semibold">Guided</p>
                            <p className="text-primary font-semibold tabular-nums">€{line.guidedPrice.toFixed(2)}</p>
                          </div>
                        </div>
                        {!atGuided && (
                          <button
                            type="button"
                            onClick={() => acceptGuidedPrice(line.partId)}
                            className="ds-btn-sm ds-btn-outline w-full"
                          >
                            <Check size={12} /> Accept guided price
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <ProvenanceHint source="model__guided_pricing · sap__condition_price" freshness="margin-bound recommendation per line" className="mt-3" />
            </DataCard>

            <DataCard title="Turnaround prediction">
              {loading ? (
                <div className="h-12 bg-muted rounded animate-pulse" />
              ) : (
                <>
                  <p className="text-2xl font-bold text-foreground tabular-nums">{baseState?.turnaroundDays.toFixed(1)} days</p>
                  <p className="text-xs text-muted-foreground mt-1">Median days-to-decision for similar quotes</p>
                  {baseState?.stalledNudge && (
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      {baseState.stalledNudge}
                    </p>
                  )}
                </>
              )}
              <ProvenanceHint source="quote__turnaround_p50" freshness="model output · similar quote cohort" className="mt-2" />
            </DataCard>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
