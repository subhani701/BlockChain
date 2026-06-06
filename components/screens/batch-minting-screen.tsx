'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/motion';
import {
  Activity,
  Check,
  CheckCircle2,
  ChevronRight,
  Database,
  Filter,
  Layers,
  Lock,
  Server,
  Trees,
} from 'lucide-react';
import type { ScreenCallbacks } from '@/components/providers/app-provider';
import { useApp, useBatchAnchoring, useProvenanceRegistry } from '@/components/providers/app-provider';
import {
  DAO_MINT_QUORUM,
  PROVENANCE_REGISTRY_ADDRESS,
  PROVENANCE_REGISTRY_CONTRACT,
  VOLTUS_CHAIN_LABEL,
  getBatchMerged,
  getBatchUnitPreviews,
  getIdentityByDid,
  getMerkleTreePreview,
  getPart,
  formatBatchSyncAge,
  getBatchPriorityLabel,
  getBatchTypeLabel,
  getBatchMintingKpis,
  getPendingMintBatches,
  getUnanchoredBatches,
  type Batch,
  type BatchPriority,
} from '@/lib/data/ami-data';
import { DataCard, DataTable, EmptyState, KpiCard, ProvenanceHint } from '@/components/ui-ami';

const progressEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

type BatchFilter = 'ready' | 'all' | 'review';

function QaBadge({ status }: { status: Batch['qaStatus'] }) {
  return (
    <span className={status === 'pass' ? 'ds-status-pill ds-status-pill-active' : 'ds-status-pill ds-status-pill-pending'}>
      {status === 'pass' ? 'Pass' : 'Review'}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: BatchPriority }) {
  const className =
    priority === 'rush'
      ? 'ds-badge-priority-rush'
      : priority === 'hold'
        ? 'ds-badge-priority-hold'
        : 'ds-badge-priority-standard';
  return <span className={className}>{getBatchPriorityLabel(priority)}</span>;
}

export interface BatchMintingProps {
  callbacks: ScreenCallbacks;
}

export function BatchMintingScreen({ callbacks }: BatchMintingProps) {
  const { anchorBatch, runtimeBatchAnchors } = useApp();
  const { anchorLog } = useBatchAnchoring();
  const { hasMintRights } = useProvenanceRegistry();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [transactionState, setTransactionState] = useState<'idle' | 'pending' | 'confirmed'>('idle');
  const [anchoredResult, setAnchoredResult] = useState<Batch | null>(null);
  const [batchFilter, setBatchFilter] = useState<BatchFilter>('all');

  const pendingBatches = useMemo(() => getPendingMintBatches(runtimeBatchAnchors), [runtimeBatchAnchors]);
  const unanchoredBatches = useMemo(() => getUnanchoredBatches(runtimeBatchAnchors), [runtimeBatchAnchors]);
  const mintKpis = useMemo(() => getBatchMintingKpis(runtimeBatchAnchors), [runtimeBatchAnchors]);

  const filteredBatches = useMemo(() => {
    if (batchFilter === 'ready') return pendingBatches;
    if (batchFilter === 'review') return unanchoredBatches.filter((b) => b.qaStatus === 'review');
    return unanchoredBatches;
  }, [batchFilter, pendingBatches, unanchoredBatches]);

  const selectedBatch = selectedBatchId ? getBatchMerged(selectedBatchId, runtimeBatchAnchors) : null;
  const selectedPart = selectedBatch ? getPart(selectedBatch.partId) : undefined;
  const merklePreview = selectedBatch && selectedPart ? getMerkleTreePreview(selectedBatch, selectedPart) : null;
  const unitPreviews = selectedBatch && selectedPart ? getBatchUnitPreviews(selectedBatch, selectedPart) : [];
  const signingIdentity = selectedBatch ? getIdentityByDid(selectedBatch.signingDid) : undefined;

  const handleSelectBatch = (batch: Batch) => {
    if (batch.qaStatus !== 'pass') {
      callbacks.showToast(`${batch.id} needs QA review before minting`, 'warning');
      return;
    }
    setSelectedBatchId(batch.id);
    setCurrentStep(2);
    setTransactionState('idle');
    setAnchoredResult(null);
    // Real SAP read: OData pull for batch header + unit SOR rows already synced to ami-data
    callbacks.showToast(`Selected ${batch.id} — building Merkle tree`, 'info');
  };

  const mintAuthorized = selectedBatch ? hasMintRights(selectedBatch.signingDid) : false;

  const handleAnchor = () => {
    if (!selectedBatchId || !selectedBatch) return;
    if (!hasMintRights(selectedBatch.signingDid)) {
      callbacks.showToast('DAO mint rights required — approve proposal in Provenance Registry', 'warning');
      return;
    }
    setTransactionState('pending');
    callbacks.showToast(`Submitting anchor transaction to ${VOLTUS_CHAIN_LABEL}…`, 'info');
    // DAO permission check + DID/VC signing occur before anchorBatch() contract call
    setTimeout(() => {
      const anchored = anchorBatch(selectedBatchId);
      if (anchored) {
        setAnchoredResult(anchored);
        setTransactionState('confirmed');
      } else {
        setTransactionState('idle');
      }
    }, 2000);
  };

  const handleReset = () => {
    setCurrentStep(1);
    setTransactionState('idle');
    setSelectedBatchId(null);
    setAnchoredResult(null);
    callbacks.showToast('Ready to anchor another batch', 'info');
  };

  const tableColumns = useMemo(
    () => [
      {
        key: 'id',
        header: 'Batch ID',
        mobilePrimary: true,
        cell: (batch: Batch) => (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="ds-mono-link">{batch.id}</span>
              <span className="ds-badge-batch-type">{getBatchTypeLabel(batch.batchType)}</span>
            </div>
            <span className="ds-table-cell-sub">
              {batch.plant} · Line {batch.line}
            </span>
            <span className="ds-table-cell-meta md:hidden">
              {batch.operator} · SAP {formatBatchSyncAge(batch.sapSyncedAt)}
            </span>
          </div>
        ),
      },
      {
        key: 'material',
        header: 'Material',
        cell: (batch: Batch) => {
          const part = getPart(batch.partId);
          return (
            <div className="min-w-0">
              <span className="font-mono text-foreground">{part?.sku ?? batch.partId}</span>
              <span className="ds-table-cell-sub">{part?.name}</span>
              <span className="hidden md:block text-[10px] text-muted-foreground mt-0.5">{part?.category}</span>
            </div>
          );
        },
      },
      {
        key: 'plant',
        header: 'Plant',
        hideOnMobile: true,
        cell: (batch: Batch) => (
          <div>
            <span className="text-foreground">{batch.plant}</span>
            <span className="block text-[10px] text-muted-foreground mt-0.5">Line {batch.line}</span>
          </div>
        ),
      },
      {
        key: 'operator',
        header: 'Operator',
        hideOnMobile: true,
        cell: (batch: Batch) => (
          <div>
            <span className="text-foreground">{batch.operator}</span>
            <span className="block text-[10px] text-muted-foreground mt-0.5">QA · {batch.qaInspector}</span>
          </div>
        ),
      },
      {
        key: 'units',
        header: 'Units',
        cell: (batch: Batch) => (
          <span className="font-semibold tabular-nums text-foreground">{batch.unitCount.toLocaleString()}</span>
        ),
      },
      {
        key: 'mfg',
        header: 'Mfg Window',
        hideOnMobile: true,
        cell: (batch: Batch) => <span className="text-xs text-muted-foreground whitespace-nowrap">{batch.mfgWindow}</span>,
      },
      {
        key: 'priority',
        header: 'Priority',
        hideOnMobile: true,
        cell: (batch: Batch) => <PriorityBadge priority={batch.priority} />,
      },
      {
        key: 'sync',
        header: 'SAP Sync',
        hideOnMobile: true,
        cell: (batch: Batch) => (
          <span className="text-xs font-mono text-muted-foreground">{formatBatchSyncAge(batch.sapSyncedAt)}</span>
        ),
      },
      {
        key: 'qa',
        header: 'QA',
        cell: (batch: Batch) => <QaBadge status={batch.qaStatus} />,
      },
    ],
    [],
  );

  return (
    <div className="ds-page">
      <motion.div initial="initial" animate="animate" variants={staggerContainer} className="ds-page-inner-wide ds-stack">
        <motion.div variants={fadeInUp} className="ds-page-header">
          <div>
            <h1 className="ds-title">
              <span className="ds-title-icon">
                <Layers className="h-5 w-5 text-primary" />
              </span>
              Batch Minting Console
            </h1>
            <p className="ds-subtitle">Anchor SAP batches to {VOLTUS_CHAIN_LABEL}</p>
          </div>
          <div className="ds-contract-pill">
            <Server size={14} className="text-muted-foreground shrink-0" />
            <span className="text-muted-foreground hidden xs:inline">{PROVENANCE_REGISTRY_CONTRACT}</span>
            <span className="text-foreground font-mono text-[11px] sm:text-xs break-all">{PROVENANCE_REGISTRY_ADDRESS}</span>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="ds-kpi-grid">
          <KpiCard
            label="Unanchored batches"
            value={String(mintKpis.unanchoredCount)}
            source="sap__batch_sor"
            freshness={`${mintKpis.readyCount} QA pass`}
          />
          <KpiCard
            label="Ready to anchor"
            value={String(mintKpis.readyCount)}
            source="prov__mint_queue"
            freshness="QA complete · awaiting root"
            delay={0.04}
          />
          <KpiCard
            label="Needs QA review"
            value={String(mintKpis.reviewCount)}
            source="sap__qa_status"
            freshness="hold before mint"
            delay={0.08}
          />
          <KpiCard
            label="Anchored on-chain"
            value={String(mintKpis.anchoredCount)}
            source="ProvenanceRegistry.sol"
            freshness={`quorum ${DAO_MINT_QUORUM.required}/${DAO_MINT_QUORUM.total}`}
            delay={0.12}
          />
        </motion.div>

        <motion.div variants={fadeInUp} className="ds-stepper">
          {[
            { num: 1, label: 'Select Batch' },
            { num: 2, label: 'Build Tree' },
            { num: 3, label: 'Anchor' },
          ].map((step, i) => (
            <React.Fragment key={step.num}>
              <motion.div
                whileHover={currentStep >= step.num ? { scale: 1.02 } : {}}
                onClick={() => {
                  if (currentStep > step.num) {
                    setCurrentStep(step.num as 1 | 2 | 3);
                    callbacks.showToast(`Returned to step ${step.num}: ${step.label}`, 'info');
                  }
                }}
                className={`ds-step ${
                  currentStep === step.num
                    ? 'bg-primary text-primary-foreground'
                    : currentStep > step.num
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <div className={`ds-step-num ${currentStep > step.num ? 'bg-green-500 text-white' : ''}`}>
                  {currentStep > step.num ? <Check size={12} /> : step.num}
                </div>
                <span className="ds-step-label">{step.label}</span>
              </motion.div>
              {i < 2 && <ChevronRight size={16} className="ds-step-chevron" />}
            </React.Fragment>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div key="step1" variants={fadeInUp} initial="initial" animate="animate" exit="exit" className="space-y-4">
              <div className="ds-info-banner ds-info-banner-blue">
                <div className="flex items-center gap-2 min-w-0">
                  <Database size={16} className="shrink-0" />
                  <span>
                    <strong className="font-semibold">Data from SAP</strong>
                    <span className="text-blue-800/80 dark:text-blue-200/80"> · synced 8 min ago</span>
                  </span>
                </div>
                <span className="text-xs font-medium tabular-nums">
                  {filteredBatches.length} shown · {mintKpis.readyCount} ready to anchor
                </span>
              </div>

              <DataCard
                title="SAP batches"
                action={
                  <span className="text-xs text-muted-foreground font-medium tabular-nums">
                    {filteredBatches.length} rows
                  </span>
                }
              >
                <div className="ds-filter-scroll mb-4">
                  <div className="ds-filter-bar">
                    {(
                      [
                        { id: 'all' as const, label: 'All Batches', icon: true },
                        { id: 'ready' as const, label: 'QA Pass', icon: false },
                        { id: 'review' as const, label: 'Needs Review', icon: false },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setBatchFilter(f.id);
                          const count =
                            f.id === 'ready'
                              ? pendingBatches.length
                              : f.id === 'review'
                                ? unanchoredBatches.filter((b) => b.qaStatus === 'review').length
                                : unanchoredBatches.length;
                          callbacks.showToast(`${f.label} · ${count} shown`, 'info');
                        }}
                        className={`ds-filter-chip ${batchFilter === f.id ? 'ds-filter-chip-active' : ''}`}
                      >
                        {f.icon && <Filter size={13} />}
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <DataTable
                  embedded
                  columns={tableColumns}
                  data={filteredBatches}
                  keyFn={(b) => b.id}
                  onRowClick={handleSelectBatch}
                  emptyTitle="No batches awaiting anchor"
                  emptyDescription="All QA-passed SAP batches are already on-chain, or sync is pending."
                  className="border border-border rounded-xl"
                />
                <ProvenanceHint
                  source="sap__batch_sor"
                  freshness={`${unanchoredBatches.length} unanchored · select a QA-pass row to build Merkle tree`}
                  className="mt-4"
                />
              </DataCard>
            </motion.div>
          )}

          {currentStep === 2 && selectedBatch && selectedPart && merklePreview && (
            <motion.div key="step2" variants={fadeInUp} initial="initial" animate="animate" exit="exit" className="ds-grid-2">
              <DataCard title="Merkle Tree">
                <div className="flex items-center gap-2 mb-3 -mt-1">
                  <Trees size={18} className="text-primary" />
                  <span className="text-xs text-muted-foreground">{selectedBatch.id} · {merklePreview.unitCount.toLocaleString()} leaves · depth {merklePreview.depth}</span>
                </div>
                <div className="bg-gradient-to-b from-muted/50 to-transparent rounded-lg border border-border p-4 flex flex-col items-center gap-3">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="ds-chip ds-chip-primary font-mono">
                    {merklePreview.root}
                  </motion.div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Root (32 bytes only)</p>
                  <div className="text-center text-muted-foreground text-xs space-y-1 font-mono">
                    <p>├─ h(L1·L2)</p>
                    <p>│  ├─ L1: {merklePreview.leafSamples.left}</p>
                    <p>│  └─ L2: {merklePreview.leafSamples.right}</p>
                    <p>└─ h(L3…L{merklePreview.unitCount})</p>
                    {merklePreview.remainingLeaves > 0 && (
                      <p className="text-[10px] pt-1">+ {merklePreview.remainingLeaves.toLocaleString()} additional leaves hashed off-chain</p>
                    )}
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-300 font-medium bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg border border-green-200 dark:border-green-800">
                    Only the 32-byte root is persisted — zero PII on chain
                  </p>
                  <ProvenanceHint source="prov__merkle_root" freshness={`${merklePreview.unitCount} unit hashes · built locally`} />
                </div>
              </DataCard>

              <DataCard title="Per-Unit SOR Preview">
                <div className="flex items-center gap-2 mb-3 -mt-1">
                  <Database size={18} className="text-primary" />
                  <span className="text-xs text-muted-foreground">Sample rows from SAP unit SOR</span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                  {unitPreviews.map((unit, i) => (
                    <motion.div
                      key={unit.unit}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06, ease: progressEase }}
                      className="bg-muted/50 rounded-lg p-3 border border-border"
                    >
                      <p className="text-xs font-mono font-semibold text-foreground">{unit.serial}</p>
                      <p className="text-xs text-muted-foreground mt-1">{unit.spec}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className={`text-xs font-medium ${unit.qa === 'Pass' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          QA: {unit.qa}
                        </span>
                        <span className="text-xs text-muted-foreground">{unit.operator}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </DataCard>

              <motion.div variants={fadeInUp} className="lg:col-span-2 ds-actions">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setCurrentStep(3);
                    // Real Merkle build: SHA-256 leaf hashes assembled into tree; only root submitted on-chain
                    callbacks.showToast('Merkle tree built — ready to anchor', 'success');
                  }}
                  className="ds-btn-lg ds-btn-primary"
                >
                  Review & Anchor <ChevronRight size={16} />
                </motion.button>
              </motion.div>
            </motion.div>
          )}

          {currentStep === 3 && selectedBatch && (
            <motion.div key="step3" variants={fadeInUp} initial="initial" animate="animate" exit="exit" className="ds-grid-3">
              <div className="lg:col-span-2 space-y-4">
                <DataCard title="Anchor Details">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Contract</p>
                      <p className="font-mono text-sm font-bold text-foreground mt-1">{PROVENANCE_REGISTRY_CONTRACT}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Network</p>
                      <p className="text-sm font-bold text-foreground mt-1">{VOLTUS_CHAIN_LABEL}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Signing plant DID</p>
                      <p className="font-mono text-sm font-semibold text-foreground mt-1">{selectedBatch.signingDid}</p>
                      {signingIdentity && (
                        <p className="text-xs text-muted-foreground mt-0.5">{signingIdentity.name} · {signingIdentity.credentials} VCs</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Batch</p>
                      <p className="font-mono text-sm font-bold text-primary mt-1">{selectedBatch.id}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Root: {selectedBatch.merkleRoot}</p>
                    </div>
                  </div>

                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg border mt-4 ${
                      mintAuthorized
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    <CheckCircle2
                      size={18}
                      className={`shrink-0 ${mintAuthorized ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}
                    />
                    <div>
                      <p className={`text-sm font-semibold ${mintAuthorized ? 'text-green-900 dark:text-green-100' : 'text-amber-900 dark:text-amber-100'}`}>
                        {mintAuthorized ? 'DAO Authorized' : 'DAO approval pending'}
                      </p>
                      <p className={`text-xs ${mintAuthorized ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}`}>
                        {mintAuthorized
                          ? `Multi-sig quorum met · ${DAO_MINT_QUORUM.required}/${DAO_MINT_QUORUM.total} signatures`
                          : `Approve mint proposal for ${selectedBatch.signingDid} in Provenance Registry`}
                      </p>
                    </div>
                  </div>
                  <ProvenanceHint source="governance__dao_quorum · prov__did_registry" freshness="mint policy v2.4 · plant DID active" className="mt-3" />
                </DataCard>

                {transactionState === 'idle' && (
                  <motion.div variants={fadeInUp} className="ds-actions">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleAnchor}
                      disabled={!mintAuthorized}
                      className="ds-btn-lg ds-btn-primary disabled:opacity-40"
                    >
                      <Lock size={16} /> Anchor Batch
                    </motion.button>
                  </motion.div>
                )}

                {transactionState === 'pending' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex flex-col items-center gap-3"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      className="w-12 h-12 border-4 border-transparent border-t-primary border-r-primary/50 rounded-full"
                    />
                    <p className="font-semibold text-blue-900 dark:text-blue-100">Submitting transaction…</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">anchorBatch() → {PROVENANCE_REGISTRY_CONTRACT}</p>
                  </motion.div>
                )}

                {transactionState === 'confirmed' && anchoredResult && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex flex-col items-center gap-3"
                  >
                    <CheckCircle2 size={48} className="text-green-600 dark:text-green-400" />
                    <h3 className="text-xl font-bold text-green-900 dark:text-green-100">Batch Anchored</h3>
                    <div className="w-full space-y-2">
                      <div className="bg-white dark:bg-card rounded-lg p-3 border border-green-200 dark:border-green-800">
                        <p className="text-xs text-muted-foreground">Block</p>
                        <p className="font-mono font-bold text-foreground">{anchoredResult.blockNumber}</p>
                      </div>
                      <div className="bg-white dark:bg-card rounded-lg p-3 border border-green-200 dark:border-green-800">
                        <p className="text-xs text-muted-foreground">Merkle Root</p>
                        <p className="font-mono font-bold text-foreground text-sm">{anchoredResult.merkleRoot}</p>
                      </div>
                    </div>
                    <button type="button" onClick={handleReset} className="ds-btn-md ds-btn-secondary mt-2">
                      Anchor Another Batch
                    </button>
                  </motion.div>
                )}
              </div>

              <DataCard title="Recent Anchors">
                <div className="flex items-center gap-2 mb-3 -mt-1">
                  <Activity size={18} className="text-primary" />
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
                  {anchorLog.length === 0 ? (
                    <EmptyState title="No anchors yet" description="Anchored batches will appear here and in Governance." />
                  ) : (
                    anchorLog.map((anchor) => (
                      <button
                        key={anchor.batchId}
                        type="button"
                        onClick={() => callbacks.showToast(`Anchor ${anchor.batchId} confirmed at block ${anchor.block}`, 'success')}
                        className="w-full text-left pb-2 border-b border-border last:border-0 hover:bg-muted/30 rounded-md px-1 -mx-1 transition-colors"
                      >
                        <p className="font-mono text-xs font-semibold text-primary">{anchor.batchId}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Block {anchor.block} · {anchor.timestamp}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <CheckCircle2 size={12} className="text-green-600 dark:text-green-400" />
                          <p className="text-[10px] text-muted-foreground">Confirmed · {anchor.did}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </DataCard>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
