'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/motion';
import {
  BadgeCheck,
  Database,
  History,
  Layers,
  Lock,
  RotateCcw,
  Search,
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import type { ScreenCallbacks } from '@/components/providers/app-provider';
import { useBatchAnchoring } from '@/components/providers/app-provider';
import {
  GOVERNANCE_COMPLIANCE_BADGES,
  filterGovernanceTraces,
  getGovernanceConfigHistory,
  getGovernanceKpis,
  getGovernanceTraceRows,
  searchGovernanceTraces,
  type GovernanceTraceFilter,
  type GovernanceTraceRow,
} from '@/lib/data/ami-data';
import {
  DataCard,
  DataTable,
  type DataTableColumn,
  EmptyState,
  KpiCard,
  ProvenanceHint,
} from '@/components/ui-ami';

const OUTCOME_BADGE: Record<GovernanceTraceRow['outcomeKind'], string> = {
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  released: 'bg-primary/10 text-primary',
  logged: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
};

const CATEGORY_LABELS: Record<string, string> = {
  sync_mode: 'Sync mode',
  action_boundary: 'Action boundary',
  guardrail: 'Guardrail',
  model_binding: 'Model binding',
  governance: 'Governance',
};

export interface GovernanceProps {
  callbacks: ScreenCallbacks;
}

export function GovernanceScreen({ callbacks }: GovernanceProps) {
  const { anchorLog, runtimeDecisionTraces, runtimeBatchAnchors } = useBatchAnchoring();
  const [loading, setLoading] = useState(true);
  const [traceSearch, setTraceSearch] = useState('');
  const [traceFilter, setTraceFilter] = useState<GovernanceTraceFilter>('all');
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const allTraces = useMemo(() => getGovernanceTraceRows(runtimeDecisionTraces, 40), [runtimeDecisionTraces]);
  const configHistory = useMemo(() => getGovernanceConfigHistory(), []);
  const kpis = useMemo(
    () => getGovernanceKpis(runtimeDecisionTraces, runtimeBatchAnchors),
    [runtimeDecisionTraces, runtimeBatchAnchors],
  );

  const visibleTraces = useMemo(() => {
    const searched = searchGovernanceTraces(allTraces, traceSearch);
    return filterGovernanceTraces(searched, traceFilter);
  }, [allTraces, traceSearch, traceFilter]);

  const traceColumns = useMemo<DataTableColumn<GovernanceTraceRow>[]>(
    () => [
      {
        key: 'timestamp',
        header: 'Timestamp',
        hideOnMobile: true,
        cell: (row) => <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">{row.timestamp}</span>,
      },
      {
        key: 'actor',
        header: 'Actor',
        cell: (row) => (
          <span
            className={`text-xs px-2 py-0.5 rounded font-medium ${
              row.actorKind === 'agent' ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground'
            }`}
          >
            {row.actor}
          </span>
        ),
      },
      {
        key: 'action',
        header: 'Action',
        cell: (row) => <span className="text-sm text-foreground">{row.action}</span>,
      },
      {
        key: 'inputs',
        header: 'Inputs / features',
        hideOnMobile: true,
        className: 'max-w-[12rem]',
        cell: (row) => (
          <span className="text-xs font-mono text-muted-foreground truncate block" title={row.inputs}>
            {row.inputs}
          </span>
        ),
      },
      {
        key: 'rule',
        header: 'Rule / guardrail',
        hideOnMobile: true,
        cell: (row) => <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{row.ruleApplied}</span>,
      },
      {
        key: 'outcome',
        header: 'Outcome',
        cell: (row) => (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${OUTCOME_BADGE[row.outcomeKind]}`}>
            {row.outcomeKind}
          </span>
        ),
      },
    ],
    [],
  );

  const configColumns = useMemo<DataTableColumn<(typeof configHistory)[0]>[]>(
    () => [
      {
        key: 'setting',
        header: 'Setting',
        cell: (row) => (
          <div>
            <p className="text-sm font-semibold text-foreground">
              {row.setting}: {row.value}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{CATEGORY_LABELS[row.category] ?? row.category}</p>
          </div>
        ),
      },
      {
        key: 'version',
        header: 'Version',
        cell: (row) => <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{row.version}</span>,
      },
      {
        key: 'changed',
        header: 'Changed by',
        hideOnMobile: true,
        cell: (row) => (
          <div className="text-xs text-muted-foreground">
            <p>{row.changedBy}</p>
            <p>{row.changedAt}</p>
          </div>
        ),
      },
      {
        key: 'rollback',
        header: '',
        className: 'text-right',
        cell: (row) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              callbacks.showToast(`Rollback queued: ${row.setting} → ${row.previousVersion ?? row.version}`, 'warning');
            }}
            className="ds-btn-sm ds-btn-ghost text-primary"
          >
            <RotateCcw size={12} /> Rollback
          </button>
        ),
      },
    ],
    [callbacks],
  );

  const anchorColumns = useMemo<DataTableColumn<(typeof anchorLog)[0]>[]>(
    () => [
      {
        key: 'batch',
        header: 'Batch',
        cell: (row) => <span className="font-mono text-sm font-semibold text-primary">{row.batchId}</span>,
      },
      {
        key: 'root',
        header: 'Merkle root',
        hideOnMobile: true,
        cell: (row) => <code className="text-xs font-mono text-muted-foreground">{row.root}</code>,
      },
      {
        key: 'block',
        header: 'Block',
        cell: (row) => <span className="text-xs tabular-nums">{row.block}</span>,
      },
      {
        key: 'did',
        header: 'Signing DID',
        hideOnMobile: true,
        cell: (row) => <code className="text-xs font-mono text-muted-foreground">{row.did}</code>,
      },
      {
        key: 'anchored',
        header: 'Anchored',
        cell: (row) => <span className="text-xs text-muted-foreground whitespace-nowrap">{row.timestamp}</span>,
      },
    ],
    [],
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
                <Shield className="h-5 w-5 text-primary" />
              </span>
              Governance & Audit Console
            </h1>
            <p className="ds-subtitle">Decision traces, versioned configuration, and on-chain anchors — no customer PII</p>
          </div>
        </motion.div>

        {/* Compliance + indicators strip */}
        <motion.div variants={fadeInUp} className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {GOVERNANCE_COMPLIANCE_BADGES.map((badge) => (
              <div
                key={badge}
                className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
              >
                <BadgeCheck size={16} className="text-green-600 dark:text-green-400" />
                <span className="text-sm font-semibold text-green-700 dark:text-green-300">{badge}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="ds-filter-chip ds-filter-chip-active inline-flex items-center gap-1.5">
              <Lock size={12} /> Append-only audit log
            </span>
            <span className="ds-filter-chip inline-flex items-center gap-1.5">
              <Users size={12} /> Multi-tenant isolation
            </span>
            <span className="ds-filter-chip inline-flex items-center gap-1.5 text-muted-foreground">
              <Database size={12} /> Zero customer PII in traces
            </span>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="ds-kpi-grid">
          <KpiCard
            label="Decision traces"
            value={String(kpis.traceCount)}
            source="governance__decision_trace"
            freshness={`${kpis.runtimeTraceCount} runtime (demo)`}
            loading={loading}
          />
          <KpiCard
            label="Config versions"
            value={String(kpis.configVersions)}
            source="governance__config_registry"
            freshness="versioned like code"
            delay={0.04}
            loading={loading}
          />
          <KpiCard
            label="On-chain anchors"
            value={String(kpis.anchorCount)}
            source="prov__anchor_log"
            freshness="roots only · zero PII"
            delay={0.08}
            loading={loading}
          />
          <KpiCard
            label="Replay coverage"
            value="100%"
            source="governance__audit_replay"
            freshness="full inputs + rules stored"
            delay={0.12}
            loading={loading}
          />
        </motion.div>

        {/* Section 1 — Decision Traces */}
        <motion.div variants={fadeInUp}>
          <DataCard
            title="Decision traces"
            action={
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <History size={14} className="text-primary" />
                {visibleTraces.length} records
              </span>
            }
          >
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={traceSearch}
                  onChange={(e) => setTraceSearch(e.target.value)}
                  placeholder="Search action, inputs, rule, actor…"
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Search decision traces"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'all' as const, label: 'All' },
                    { id: 'agent' as const, label: 'Agent' },
                    { id: 'user' as const, label: 'User' },
                    { id: 'approved' as const, label: 'Approved' },
                    { id: 'released' as const, label: 'Released' },
                    { id: 'logged' as const, label: 'Logged' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setTraceFilter(f.id);
                      setExpandedTraceId(null);
                    }}
                    className={`ds-filter-chip text-[11px] ${traceFilter === f.id ? 'ds-filter-chip-active' : ''}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <DataTable
              columns={traceColumns}
              data={visibleTraces}
              keyFn={(row) => row.id}
              loading={loading}
              emptyTitle="No decision traces match"
              emptyDescription="Adjust search or filters. Runtime traces from Quote Workbench and Batch Minting appear here."
              expandable
              expandedKey={expandedTraceId}
              onExpandToggle={(row) => setExpandedTraceId((prev) => (prev === row.id ? null : row.id))}
              onRowClick={(row) => setExpandedTraceId((prev) => (prev === row.id ? null : row.id))}
              renderExpanded={(row) => (
                <div className="px-4 py-3 space-y-2 bg-muted/20 border-t border-border">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Full trace replay</p>
                  <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Trace ID</dt>
                      <dd className="font-mono text-foreground">{row.id}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Timestamp (ISO)</dt>
                      <dd className="font-mono text-foreground">{row.timestampIso}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Actor</dt>
                      <dd className="text-foreground">{row.actor}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Action</dt>
                      <dd className="text-foreground">{row.action}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground">Inputs / features</dt>
                      <dd className="font-mono text-foreground break-all">{row.inputs}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Rule / guardrail</dt>
                      <dd className="font-mono text-foreground">{row.ruleApplied}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Outcome</dt>
                      <dd className="text-foreground">{row.outcome}</dd>
                    </div>
                  </dl>
                  <ProvenanceHint source="governance__decision_trace" freshness="immutable append-only record" className="pt-1" />
                </div>
              )}
              className="shadow-none border border-border rounded-lg"
            />
            <ProvenanceHint
              source="governance__decision_trace"
              freshness="includes runtime traces from Quote Workbench + Batch Minting"
              className="mt-3"
            />
          </DataCard>
        </motion.div>

        {/* Section 2 — Configuration History */}
        <motion.div variants={fadeInUp}>
          <DataCard
            title="Configuration history"
            action={
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Settings size={14} className="text-primary" />
                Versioned like code
              </span>
            }
          >
            <p className="text-xs text-muted-foreground mb-3">
              Sync mode, action boundary, guardrails, and model bindings — each change is versioned with author and rollback target.
            </p>
            <DataTable
              columns={configColumns}
              data={configHistory}
              keyFn={(row) => row.id}
              loading={loading}
              emptyTitle="No configuration records"
              className="shadow-none border border-border rounded-lg"
            />
            <ProvenanceHint source="governance__config_registry" freshness={`${configHistory.length} versions · rollback by version tag`} className="mt-3" />
          </DataCard>
        </motion.div>

        {/* Section 3 — On-Chain Anchor Log */}
        <motion.div variants={fadeInUp}>
          <DataCard
            title="On-chain anchor log"
            action={
              <span className="text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded font-semibold">
                Roots only — zero PII on chain
              </span>
            }
          >
            <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
              <Layers size={14} className="text-primary" />
              Only 32-byte Merkle roots are persisted on Voltus Private Ethereum — no serial numbers, customer names, or unit PII.
            </p>
            {anchorLog.length === 0 && !loading ? (
              <EmptyState
                title="No anchored batches yet"
                description="Anchor a batch in the Minting Console to see roots appear here."
              />
            ) : (
              <DataTable
                columns={anchorColumns}
                data={anchorLog}
                keyFn={(row) => row.batchId}
                loading={loading}
                onRowClick={(row) => callbacks.showToast(`Anchor ${row.batchId} · block ${row.block}`, 'info')}
                className="shadow-none border border-border rounded-lg"
              />
            )}
            <ProvenanceHint source="prov__anchor_log · ProvenanceRegistry.sol" freshness={`${anchorLog.length} roots on-chain`} className="mt-3" />
          </DataCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
