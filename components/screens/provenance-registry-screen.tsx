'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/motion';
import {
  AlertCircle,
  Building2,
  Boxes,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Fingerprint,
  Key,
  Lock,
  Network,
  RefreshCw,
  Server,
  Shield,
  Vote,
  X,
} from 'lucide-react';
import type { ScreenCallbacks } from '@/components/providers/app-provider';
import { useApp, useBatchAnchoring, useProvenanceAdminRole, useProvenanceRegistry } from '@/components/providers/app-provider';
import type { ProvenanceAdminRole } from '@/lib/data/ami-data';
import { PROVENANCE_ADMIN_ROLES } from '@/lib/provenance-admin-roles';
import {
  DAO_MINT_QUORUM,
  buildRegistrationDid,
  createRegistrationIdentity,
  daoMembers,
  filterProvenanceIdentities,
  getContractRegistryInfo,
  getMergedDaoProposals,
  getProvenanceIdentities,
  getProvenanceRegistryKpis,
  type DaoProposal,
  type ProvenanceIdentityFilter,
  type ProvenanceIdentityRow,
} from '@/lib/data/ami-data';
import { PageHeader } from '@/components/ui/page-header';
import { formatHexDisplay } from '@/lib/utils';
import {
  DataCard,
  DataTable,
  type DataTableColumn,
  ExplanationPopover,
  KpiCard,
  TableCellCode,
  TableCellStack,
} from '@/components/ui-ami';

type RegisterType = 'plant' | 'distributor' | 'service' | '';

export interface ProvenanceRegistryProps {
  callbacks: ScreenCallbacks;
}

export function ProvenanceAdminScreen({ callbacks }: ProvenanceRegistryProps) {
  const {
    provenanceState,
    registerProvenanceIdentity,
    setProvenanceIdentityStatus,
    issueProvenanceVc,
    approveDaoProposal,
    rejectDaoProposal,
    runtimeBatchAnchors,
  } = useProvenanceRegistry();
  const { anchorLog } = useBatchAnchoring();

  const { provenanceAdminRole, setProvenanceAdminRole } = useApp();
  const { canWrite } = useProvenanceAdminRole();
  const [loading, setLoading] = useState(true);
  const [identityFilter, setIdentityFilter] = useState<ProvenanceIdentityFilter>('all');
  const [proposalFilter, setProposalFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [expandedDid, setExpandedDid] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerStep, setRegisterStep] = useState(1);
  const [registerType, setRegisterType] = useState<RegisterType>('');
  const [registerName, setRegisterName] = useState('');
  const [registerLocation, setRegisterLocation] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [generatedDid, setGeneratedDid] = useState('');
  const [isGeneratingDid, setIsGeneratingDid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!showRegisterModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showRegisterModal]);

  const identityRows = useMemo(() => getProvenanceIdentities(provenanceState), [provenanceState]);
  const visibleIdentities = useMemo(() => {
    const filtered = filterProvenanceIdentities(identityRows, identityFilter);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter(
      (row) =>
        row.did.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q) ||
        row.role.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q),
    );
  }, [identityRows, identityFilter, searchQuery]);
  const proposals = useMemo(
    () => getMergedDaoProposals(provenanceState.proposalStatusOverrides),
    [provenanceState.proposalStatusOverrides],
  );
  const visibleProposals = useMemo(() => {
    if (proposalFilter === 'pending') return proposals.filter((p) => p.status === 'pending');
    if (proposalFilter === 'approved') return proposals.filter((p) => p.status === 'approved');
    return proposals;
  }, [proposals, proposalFilter]);

  const registry = useMemo(() => getContractRegistryInfo(runtimeBatchAnchors), [runtimeBatchAnchors]);
  const kpis = useMemo(
    () => getProvenanceRegistryKpis(provenanceState, runtimeBatchAnchors),
    [provenanceState, runtimeBatchAnchors],
  );

  const identityColumns = useMemo<DataTableColumn<ProvenanceIdentityRow>[]>(
    () => [
      {
        key: 'did',
        header: 'DID',
        className: 'w-[26%]',
        headerClassName: 'pl-4',
        cellClassName: 'pl-4',
        cell: (row) => <TableCellCode>{row.did}</TableCellCode>,
      },
      {
        key: 'name',
        header: 'Organization',
        className: 'min-w-0 w-auto',
        cell: (row) => <TableCellStack primary={row.name} secondary={row.role} />,
      },
      {
        key: 'status',
        header: 'Status',
        className: 'w-[7.5rem]',
        cell: (row) => (
          <span
            className={
              row.status === 'active'
                ? 'ds-status-pill ds-status-pill-active capitalize'
                : 'ds-status-pill ds-status-pill-suspended capitalize'
            }
          >
            {row.status}
          </span>
        ),
      },
      {
        key: 'credentials',
        header: 'VCs',
        hideOnMobile: true,
        className: 'w-[4.5rem]',
        headerClassName: 'ds-th-right',
        cellClassName: 'ds-td-right tabular-nums',
        cell: (row) => row.credentials,
      },
      {
        key: 'actions',
        header: 'Actions',
        className: 'w-[11.5rem]',
        headerClassName: 'ds-th-right pr-4',
        cellClassName: 'ds-td-right pr-4',
        cell: (row) => (
          <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              disabled={!canWrite || row.status !== 'active'}
              onClick={() => {
                issueProvenanceVc(row.did);
                callbacks.showToast(`VC issued to ${row.name}`, 'success');
              }}
              className="ds-btn-sm ds-btn-primary disabled:opacity-40 whitespace-nowrap"
            >
              Issue VC
            </button>
            <button
              type="button"
              disabled={!canWrite}
              onClick={() => {
                const next = row.status === 'active' ? 'suspended' : 'active';
                setProvenanceIdentityStatus(row.did, next);
                callbacks.showToast(`${next === 'suspended' ? 'Suspended' : 'Reactivated'} ${row.name}`, next === 'suspended' ? 'warning' : 'success');
              }}
              className="ds-btn-sm ds-btn-outline disabled:opacity-40 whitespace-nowrap"
            >
              {row.status === 'active' ? 'Suspend' : 'Reactivate'}
            </button>
          </div>
        ),
      },
    ],
    [canWrite, callbacks, issueProvenanceVc, setProvenanceIdentityStatus],
  );

  const resetRegistration = () => {
    setShowRegisterModal(false);
    setRegisterStep(1);
    setRegisterType('');
    setRegisterName('');
    setRegisterLocation('');
    setRegisterEmail('');
    setGeneratedDid('');
    setRegistrationComplete(false);
  };

  const generateDid = () => {
    if (!registerType || !registerName.trim()) return;
    setIsGeneratingDid(true);
    setTimeout(() => {
      setGeneratedDid(buildRegistrationDid(registerType, registerName));
      setIsGeneratingDid(false);
      callbacks.showToast('DID generated — ready for registry write', 'success');
    }, 900);
  };

  const handleRegisterSubmit = () => {
    if (!registerType || !generatedDid) return;
    setIsSubmitting(true);
    setTimeout(() => {
      const identity = createRegistrationIdentity(registerType, registerName, generatedDid);
      registerProvenanceIdentity(identity);
      setIsSubmitting(false);
      setRegistrationComplete(true);
      callbacks.showToast(`${registerName} registered on ${registry.chain}`, 'success');
    }, 1200);
  };

  const handleProposalAction = (proposal: DaoProposal, action: 'approve' | 'reject') => {
    if (!canWrite) {
      callbacks.showToast('Plant/Quality admin role required', 'warning');
      return;
    }
    if (action === 'approve') {
      approveDaoProposal(proposal.id, proposal.relatedDid, proposal.gatesMinting);
      callbacks.showToast(`Approved: ${proposal.title}`, 'success');
    } else {
      rejectDaoProposal(proposal.id);
      callbacks.showToast(`Rejected: ${proposal.title}`, 'error');
    }
  };

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
            icon={Key}
            title="Provenance Registry"
            subtitle="DIDs, verifiable credentials, DAO governance, and on-chain registry"
            searchPlaceholder="Search identities, DIDs, organizations…"
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            action={
              <div className="relative w-full sm:w-auto sm:min-w-[12rem]">
                <select
                  value={provenanceAdminRole}
                  onChange={(e) => {
                    const role = e.target.value as ProvenanceAdminRole;
                    setProvenanceAdminRole(role);
                    const label = PROVENANCE_ADMIN_ROLES.find((r) => r.id === role)?.label ?? role;
                    callbacks.showToast(`Switched to ${label}`, 'info');
                  }}
                  className="ds-role-select w-full"
                  aria-label="Admin role"
                >
                  {PROVENANCE_ADMIN_ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
              </div>
            }
          />
        </motion.div>

        {!canWrite && (
          <motion.div variants={fadeInUp} className="ds-info-banner ds-info-banner-amber flex items-start gap-2">
            <Lock size={16} className="shrink-0 mt-0.5" />
            <p className="text-sm">
              Read-only mode — switch to <strong>Plant Admin</strong> or <strong>Quality Admin</strong> to issue VCs, suspend identities, vote on DAO proposals, or register DIDs.
            </p>
          </motion.div>
        )}

        <motion.div variants={fadeInUp} className="ds-kpi-grid">
          <KpiCard label="Registered DIDs" value={String(kpis.identityCount)} source="prov__did_registry" freshness={`${kpis.activeIdentities} active`} loading={loading} />
          <KpiCard label="Pending DAO votes" value={String(kpis.pendingProposals)} source="governance__dao_vote" freshness={`quorum ${DAO_MINT_QUORUM.required}/${DAO_MINT_QUORUM.total}`} delay={0.04} loading={loading} />
          <KpiCard label="Anchored batches" value={String(kpis.anchoredBatches)} source="ProvenanceRegistry.sol" freshness="roots only · zero PII" delay={0.08} loading={loading} />
          <KpiCard label="Chain health" value={registry.chainReachable ? 'Reachable' : 'Offline'} source="voltus__private_ethereum" freshness={`block ${registry.lastBlock}`} delay={0.12} loading={loading} />
        </motion.div>

        <div className="ds-admin-layout">
          <motion.div variants={fadeInUp} className="ds-admin-main">
            <DataCard
              className="w-full"
              compact
              title="Identities (DIDs)"
              action={
                <button
                  type="button"
                  disabled={!canWrite}
                  onClick={() => {
                    setShowRegisterModal(true);
                    callbacks.showToast('Identity registration started', 'info');
                  }}
                  className="ds-btn-sm ds-btn-primary disabled:opacity-40"
                >
                  + Register identity
                </button>
              }
            >
              <div className="flex flex-wrap gap-2 mb-3">
                {(
                  [
                    { id: 'all' as const, label: 'All' },
                    { id: 'plant' as const, label: 'Plants' },
                    { id: 'distributor' as const, label: 'Distributors' },
                    { id: 'service' as const, label: 'Service' },
                    { id: 'active' as const, label: 'Active' },
                    { id: 'suspended' as const, label: 'Suspended' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setIdentityFilter(f.id)}
                    className={`ds-filter-pill ${identityFilter === f.id ? 'ds-filter-pill-active' : 'ds-filter-pill-inactive'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <DataTable
                embedded
                showFooter
                tableLayout="fixed"
                columns={identityColumns}
                data={visibleIdentities}
                keyFn={(row) => row.did}
                loading={loading}
                emptyTitle="No identities match"
                expandable
                expandedKey={expandedDid}
                onExpandToggle={(row) => setExpandedDid((prev) => (prev === row.did ? null : row.did))}
                renderExpanded={(row) => (
                  <div className="px-3 py-2.5 bg-muted/20 text-[11px] space-y-1">
                    <p>
                      <span className="font-medium text-foreground">DID resolution: </span>
                      <TableCellCode>{row.did}</TableCellCode>
                    </p>
                    <p className="text-muted-foreground">
                      Registry read via DID resolver; VC issuance and suspend write back to ProvenanceRegistry.sol.
                    </p>
                  </div>
                )}
                className="w-full rounded-lg border border-border"
              />
            </DataCard>
          </motion.div>

          <motion.div variants={fadeInUp} className="ds-admin-rail">
            <DataCard
              className="w-full"
              compact
              title="Governance DAO"
              action={
                <ExplanationPopover
                  title="Minting gate"
                  explanation="Approved mint proposals authorize plant DIDs to call anchorBatch() in the Minting console. Quorum must be met before on-chain root persistence."
                  attributions={['governance__dao_vote', 'governance__mint_policy', 'prov__anchor_log']}
                />
              }
            >
              <div className="space-y-2 mb-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Voting threshold</span>
                  <span className="font-bold">{DAO_MINT_QUORUM.required} of {DAO_MINT_QUORUM.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Members</span>
                  <span className="font-bold">{daoMembers.length}</span>
                </div>
              </div>
              <div className="space-y-1.5 mb-3 max-h-28 overflow-y-auto">
                {daoMembers.map((m) => (
                  <div key={m.address} className="flex justify-between text-xs gap-2">
                    <code className="font-mono text-muted-foreground truncate">{formatHexDisplay(m.address)}</code>
                    <span className="text-foreground shrink-0">{m.role}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(['all', 'pending', 'approved'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setProposalFilter(f)}
                    className={`ds-filter-pill ${proposalFilter === f ? 'ds-filter-pill-active' : 'ds-filter-pill-inactive'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {visibleProposals.map((proposal) => (
                  <div key={proposal.id} className="p-2.5 rounded-lg border border-border/80 bg-muted/15">
                    <div className="flex items-start gap-2">
                      <Vote size={14} className="text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{proposal.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Votes {proposal.votesFor}/{proposal.votesTotal}
                          {proposal.gatesMinting && ' · gates minting'}
                        </p>
                        <span
                          className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded ${
                            proposal.status === 'approved'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                              : proposal.status === 'rejected'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          }`}
                        >
                          {proposal.status}
                        </span>
                      </div>
                    </div>
                    {proposal.status === 'pending' && (
                      <div className="flex gap-1 mt-2 justify-end">
                        <button
                          type="button"
                          disabled={!canWrite}
                          onClick={() => handleProposalAction(proposal, 'approve')}
                          className="ds-btn-sm bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 disabled:opacity-40"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={!canWrite}
                          onClick={() => handleProposalAction(proposal, 'reject')}
                          className="ds-btn-sm bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 disabled:opacity-40"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </DataCard>

            <DataCard
              className="w-full"
              compact
              title="Contract registry"
              action={
                <span className="text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded font-semibold">
                  Zero PII
                </span>
              }
            >
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Contract</p>
                  <p className="font-mono font-semibold mt-0.5">{registry.contract}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Address · {registry.chain}</p>
                  <p className="font-mono text-primary mt-0.5">{formatHexDisplay(registry.address)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Version</p>
                    <p className="font-semibold mt-0.5">{registry.version}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Anchored batches</p>
                    <p className="text-lg font-bold text-primary mt-0.5 tabular-nums">{registry.anchoredCount}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Server size={14} className="text-primary" />
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Health</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${registry.chainReachable ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-xs text-muted-foreground">
                    {registry.chainReachable ? 'Chain reachable' : 'Unreachable'} · last block #{registry.lastBlock}
                  </span>
                </div>
              </div>
              <div className="mt-3 max-h-32 overflow-y-auto space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Recent roots</p>
                {anchorLog.slice(0, 4).map((a) => (
                  <button
                    key={a.batchId}
                    type="button"
                    onClick={() => callbacks.navigateTo('batch-minting')}
                    className="w-full text-left text-xs hover:bg-muted/30 rounded px-1 py-1"
                  >
                    <span className="font-mono font-semibold text-primary">{a.batchId}</span>
                    <span className="text-muted-foreground block truncate">{a.root}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                Registry read/write binds to ProvenanceRegistry.sol; only Merkle roots are stored on-chain.
              </p>
            </DataCard>
          </motion.div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showRegisterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="ds-modal-overlay"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.target === e.currentTarget && resetRegistration()}
          >
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} className="ds-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ds-modal-hero">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="ds-title text-base">
                      <span className="ds-title-icon"><Fingerprint className="h-5 w-5 text-primary" /></span>
                      Register identity
                    </h2>
                    <p className="ds-subtitle">Step {registerStep} of 3 — DID + registry write</p>
                  </div>
                  <button type="button" onClick={resetRegistration} className="ds-btn-icon ds-btn-ghost" aria-label="Close">
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="ds-modal-body">
                {registrationComplete ? (
                  <div className="flex flex-col items-center py-6 gap-3 text-center">
                    <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                    <p className="font-semibold">Registration complete</p>
                    <code className="ds-chip ds-chip-primary max-w-full break-all">{generatedDid}</code>
                    <button type="button" onClick={resetRegistration} className="ds-btn-md ds-btn-primary mt-1">
                      Done
                    </button>
                  </div>
                ) : registerStep === 1 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Select organization type</p>
                    {(
                      [
                        { value: 'plant' as const, label: 'Plant', icon: Building2 },
                        { value: 'distributor' as const, label: 'Distributor', icon: Network },
                        { value: 'service' as const, label: 'Service center', icon: Boxes },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setRegisterType(t.value)}
                        className={`ds-select-card w-full ${registerType === t.value ? 'ds-select-card-active' : ''}`}
                      >
                        <t.icon size={18} className="text-primary" />
                        <span className="font-semibold">{t.label}</span>
                      </button>
                    ))}
                  </div>
                ) : registerStep === 2 ? (
                  <div className="ds-stack-sm">
                    <div className="ds-form-field">
                      <label className="ds-form-label" htmlFor="reg-name">Organization name</label>
                      <input id="reg-name" className="ds-form-input" value={registerName} onChange={(e) => setRegisterName(e.target.value)} placeholder="Schweinfurt L5" />
                    </div>
                    <div className="ds-form-field">
                      <label className="ds-form-label" htmlFor="reg-loc">Location</label>
                      <input id="reg-loc" className="ds-form-input" value={registerLocation} onChange={(e) => setRegisterLocation(e.target.value)} placeholder="Schweinfurt, DE" />
                    </div>
                    <div className="ds-form-field">
                      <label className="ds-form-label" htmlFor="reg-email">Admin email</label>
                      <input id="reg-email" type="email" className="ds-form-input" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} placeholder="admin@plant.voltus.io" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="ds-did-panel">
                      {generatedDid ? (
                        <code className="text-sm font-mono font-semibold text-primary break-all">{generatedDid}</code>
                      ) : (
                        <p className="text-sm text-muted-foreground">Generate a DID before submitting</p>
                      )}
                    </div>
                    <button type="button" onClick={generateDid} disabled={isGeneratingDid || !registerType || !registerName.trim()} className="ds-btn-md ds-btn-outline w-full">
                      {isGeneratingDid ? <RefreshCw size={14} className="animate-spin" /> : <Fingerprint size={14} />}
                      {isGeneratingDid ? 'Generating…' : 'Generate DID'}
                    </button>
                    <div className="ds-info-banner ds-info-banner-blue text-xs">
                      <Shield size={14} className="shrink-0" />
                      DAO governance may need to approve mint permissions after registration.
                    </div>
                  </div>
                )}
              </div>
              {!registrationComplete && (
                <div className="ds-modal-footer">
                  <button type="button" onClick={() => (registerStep === 1 ? resetRegistration() : setRegisterStep((s) => s - 1))} className="ds-btn-md ds-btn-outline">
                    <ChevronLeft size={14} /> {registerStep === 1 ? 'Cancel' : 'Back'}
                  </button>
                  {registerStep < 3 ? (
                    <button
                      type="button"
                      onClick={() => setRegisterStep((s) => s + 1)}
                      disabled={
                        (registerStep === 1 && !registerType) ||
                        (registerStep === 2 && (!registerName.trim() || !registerLocation.trim() || !registerEmail.trim()))
                      }
                      className="ds-btn-md ds-btn-primary disabled:opacity-40"
                    >
                      Continue <ChevronRight size={14} />
                    </button>
                  ) : (
                    <button type="button" onClick={handleRegisterSubmit} disabled={isSubmitting || !generatedDid} className="ds-btn-md ds-btn-success disabled:opacity-40">
                      {isSubmitting ? 'Registering…' : 'Register on-chain'}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
