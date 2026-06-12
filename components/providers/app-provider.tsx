'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { legacyPathForScreen, type LegacyScreenId } from '@/lib/navigation';
import {
  createAnchorDecisionTrace,
  createAnchorResult,
  createSuspectScanFromFieldVerify,
  getAnchorLogEntries,
  getAnchoredBatchCount,
  getBatchMerged,
  getChannelAlertCount,
  getChannelAlerts,
  getChannelMapAlerts,
  getChannelHealth,
  isBatchAnchored,
  mergeBatch,
  type Batch,
  type BatchAnchorOverride,
  type DaoProposalStatus,
  type DecisionTrace,
  type FieldVerifyContext,
  type Identity,
  type IdentityStatus,
  type ProvenanceAdminRole,
  type ProvenanceRuntimeState,
  type RuntimeBatchAnchors,
  type Scan,
  hasMintRightsForDid,
  identities,
} from '@/lib/data/ami-data';
import { getProvenanceAdminRoleOption } from '@/lib/provenance-admin-roles';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export interface NavigationOptions {
  silent?: boolean;
  customerId?: string;
  quoteId?: string;
  partId?: string;
  from?: string;
}

export interface ScreenCallbacks {
  showToast: (message: string, type?: ToastType) => void;
  navigateTo: (screen: LegacyScreenId, options?: NavigationOptions) => void;
  goToCustomer: (customerId: string, options?: { silent?: boolean }) => void;
  goToQuote: (options?: { quoteId?: string; customerId?: string; partId?: string; from?: string; silent?: boolean }) => void;
}

interface AppContextValue extends ScreenCallbacks {
  isDark: boolean;
  setIsDark: (value: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;
  quoteContext: { customerId?: string; partId?: string; from?: string };
  setQuoteContext: (ctx: { customerId?: string; partId?: string; from?: string }) => void;
  selectedDealerDid: string | null;
  setSelectedDealerDid: (did: string | null) => void;
  runtimeScans: Scan[];
  raiseChannelIntegrityAlert: (ctx: FieldVerifyContext) => void;
  channelAlertCount: number;
  runtimeBatchAnchors: RuntimeBatchAnchors;
  runtimeDecisionTraces: DecisionTrace[];
  anchorBatch: (batchId: string) => Batch | null;
  releaseQuote: (trace: DecisionTrace) => void;
  provenanceState: ProvenanceRuntimeState;
  registerProvenanceIdentity: (identity: Identity) => void;
  setProvenanceIdentityStatus: (did: string, status: IdentityStatus) => void;
  issueProvenanceVc: (did: string) => void;
  approveDaoProposal: (proposalId: string, relatedDid?: string, gatesMinting?: boolean) => void;
  rejectDaoProposal: (proposalId: string) => void;
  provenanceAdminRole: ProvenanceAdminRole;
  setProvenanceAdminRole: (role: ProvenanceAdminRole) => void;
}

const TOAST_DURATION_MS = 4200;
const MAX_VISIBLE_TOASTS = 5;

const TOAST_META: Record<ToastType, { icon: React.ElementType; iconWrap: string }> = {
  success: { icon: CheckCircle2, iconWrap: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' },
  error: { icon: XCircle, iconWrap: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' },
  warning: { icon: AlertTriangle, iconWrap: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' },
  info: { icon: Info, iconWrap: 'bg-primary/10 text-primary' },
};

const AppContext = createContext<AppContextValue | null>(null);

function getInitialTheme(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem('voltus-theme');
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

function getInitialSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('voltus-sidebar-collapsed') === 'true';
  } catch {
    return false;
  }
}

function ToastNotification({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const meta = TOAST_META[toast.type];
  const Icon = meta.icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 48, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 32, scale: 0.96 }}
      transition={{ type: 'spring', damping: 26, stiffness: 340 }}
      className="ds-toast-item"
      role="status"
      aria-live="polite"
    >
      <div className={`ds-toast-icon ${meta.iconWrap}`}>
        <Icon size={16} strokeWidth={2.25} />
      </div>
      <p className="ds-toast-message">{toast.message}</p>
      <button type="button" onClick={() => onDismiss(toast.id)} className="ds-toast-dismiss" aria-label="Dismiss notification">
        <X size={14} />
      </button>
    </motion.div>
  );
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(getInitialTheme());
    setSidebarCollapsed(getInitialSidebarCollapsed());
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [quoteContext, setQuoteContext] = useState<{ customerId?: string; partId?: string; from?: string }>({});
  const [selectedDealerDid, setSelectedDealerDid] = useState<string | null>(null);
  const [runtimeScans, setRuntimeScans] = useState<Scan[]>([]);
  const [runtimeBatchAnchors, setRuntimeBatchAnchors] = useState<RuntimeBatchAnchors>({});
  const [runtimeDecisionTraces, setRuntimeDecisionTraces] = useState<DecisionTrace[]>([]);
  const [runtimeProvenanceIdentities, setRuntimeProvenanceIdentities] = useState<Identity[]>([]);
  const [runtimeIdentityStatus, setRuntimeIdentityStatus] = useState<Record<string, IdentityStatus>>({});
  const [runtimeIdentityCredentials, setRuntimeIdentityCredentials] = useState<Record<string, number>>({});
  const [runtimeProposalStatus, setRuntimeProposalStatus] = useState<Record<string, DaoProposalStatus>>({});
  const [runtimeMintGrantedDids, setRuntimeMintGrantedDids] = useState<string[]>([]);
  const [provenanceAdminRole, setProvenanceAdminRole] = useState<ProvenanceAdminRole>('plant-admin');
  const toastTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const toastIdRef = useRef(0);

  const dismissToast = useCallback((id: string) => {
    const timeout = toastTimeoutsRef.current.get(id);
    if (timeout) clearTimeout(timeout);
    toastTimeoutsRef.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${++toastIdRef.current}`;
    setToasts((prev) => [...prev, { id, message, type }].slice(-MAX_VISIBLE_TOASTS));
    const timeout = setTimeout(() => dismissToast(id), TOAST_DURATION_MS);
    toastTimeoutsRef.current.set(id, timeout);
  }, [dismissToast]);

  const navigateTo = useCallback((screen: LegacyScreenId, options?: NavigationOptions) => {
    if (options?.customerId) setSelectedCustomerId(options.customerId);
    if (options?.customerId || options?.partId || options?.from) {
      setQuoteContext({
        customerId: options.customerId,
        partId: options.partId,
        from: options.from,
      });
    }
    setSidebarOpen(false);
    router.push(legacyPathForScreen(screen, options));
    if (!options?.silent) showToast(`Opened ${screen.replace(/-/g, ' ')}`, 'info');
  }, [router, showToast]);

  const goToCustomer = useCallback((customerId: string, options?: { silent?: boolean }) => {
    setSelectedCustomerId(customerId);
    setSidebarOpen(false);
    router.push(`/account/${customerId}`);
    if (!options?.silent) showToast(`Viewing account`, 'info');
  }, [router, showToast]);

  const raiseChannelIntegrityAlert = useCallback((ctx: FieldVerifyContext) => {
    const scan = createSuspectScanFromFieldVerify(ctx);
    setRuntimeScans((prev) => [...prev, scan]);
    // prov.scan.performed — emit audit event to governance trace + channel integrity pipeline
    showToast(`Channel alert raised for ${ctx.customer.name} · ${ctx.customer.region}`, 'warning');
  }, [showToast]);

  const anchorBatch = useCallback((batchId: string): Batch | null => {
    const batch = getBatchMerged(batchId, runtimeBatchAnchors);
    if (!batch || batch.qaStatus !== 'pass' || isBatchAnchored(batch)) {
      showToast('Batch is not eligible for anchoring', 'error');
      return null;
    }

    const result: BatchAnchorOverride = createAnchorResult(batchId, runtimeBatchAnchors);
    const anchored = mergeBatch(batch, { [batchId]: result });

    setRuntimeBatchAnchors((prev) => ({ ...prev, [batchId]: result }));
    setRuntimeDecisionTraces((prev) => [createAnchorDecisionTrace(anchored), ...prev]);
    // anchorBatch() — ProvenanceRegistry.sol on Voltus Private Ethereum; DID/VC signing + DAO check precede tx
    showToast(`Batch ${batchId} anchored at block ${result.blockNumber}`, 'success');
    return anchored;
  }, [runtimeBatchAnchors, showToast]);

  const releaseQuote = useCallback((trace: DecisionTrace) => {
    setRuntimeDecisionTraces((prev) => [trace, ...prev]);
    // releaseQuote() — SAP SD BAPI_QUOTATION_CREATE / OData SalesQuote API; model__guided_pricing + model__win_probability bind in workbench
  }, []);

  const provenanceState: ProvenanceRuntimeState = {
    runtimeIdentities: runtimeProvenanceIdentities,
    statusOverrides: runtimeIdentityStatus,
    credentialOverrides: runtimeIdentityCredentials,
    proposalStatusOverrides: runtimeProposalStatus,
    mintGrantedDids: runtimeMintGrantedDids,
  };

  const registerProvenanceIdentity = useCallback((identity: Identity) => {
    setRuntimeProvenanceIdentities((prev) => [...prev, identity]);
    // registerProvenanceIdentity() — DID resolution + ProvenanceRegistry.sol write; DAO may gate mint permissions
  }, []);

  const setProvenanceIdentityStatus = useCallback((did: string, status: IdentityStatus) => {
    setRuntimeIdentityStatus((prev) => ({ ...prev, [did]: status }));
    // setProvenanceIdentityStatus() — registry status update + VC revocation on suspend
  }, []);

  const issueProvenanceVc = useCallback((did: string) => {
    setRuntimeIdentityCredentials((prev) => {
      const base = identities.find((i) => i.did === did)?.credentials ?? prev[did] ?? 0;
      return { ...prev, [did]: (prev[did] ?? base) + 1 };
    });
    // issueProvenanceVc() — VC issuance pipeline; binds to governance__vc_policy
  }, []);

  const approveDaoProposal = useCallback((proposalId: string, relatedDid?: string, gatesMinting?: boolean) => {
    setRuntimeProposalStatus((prev) => ({ ...prev, [proposalId]: 'approved' }));
    if (gatesMinting && relatedDid) {
      setRuntimeMintGrantedDids((prev) => (prev.includes(relatedDid) ? prev : [...prev, relatedDid]));
    }
    // approveDaoProposal() — DAO contract vote tally; gates anchorBatch() mint policy in Minting console
  }, []);

  const rejectDaoProposal = useCallback((proposalId: string) => {
    setRuntimeProposalStatus((prev) => ({ ...prev, [proposalId]: 'rejected' }));
  }, []);

  const goToQuote = useCallback((options?: { quoteId?: string; customerId?: string; partId?: string; from?: string; silent?: boolean }) => {
    if (options?.customerId || options?.partId || options?.from) {
      setQuoteContext({
        customerId: options?.customerId,
        partId: options?.partId,
        from: options?.from,
      });
    }
    setSidebarOpen(false);
    router.push(legacyPathForScreen('quote-workbench', options));
    if (!options?.silent) showToast('Quote workbench opened', 'info');
  }, [router, showToast]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem('voltus-theme', isDark ? 'dark' : 'light');
    } catch { /* ignore */ }
  }, [isDark]);

  useEffect(() => {
    try {
      localStorage.setItem('voltus-sidebar-collapsed', sidebarCollapsed ? 'true' : 'false');
    } catch { /* ignore */ }
  }, [sidebarCollapsed]);

  useEffect(() => {
    const timeouts = toastTimeoutsRef.current;
    return () => {
      timeouts.forEach((t) => clearTimeout(t));
      timeouts.clear();
    };
  }, []);

  const channelAlertCount = getChannelAlertCount(runtimeScans);

  const value: AppContextValue = {
    showToast,
    navigateTo,
    goToCustomer,
    goToQuote,
    isDark,
    setIsDark,
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebarCollapsed,
    selectedCustomerId,
    setSelectedCustomerId,
    quoteContext,
    setQuoteContext,
    selectedDealerDid,
    setSelectedDealerDid,
    runtimeScans,
    raiseChannelIntegrityAlert,
    channelAlertCount,
    runtimeBatchAnchors,
    runtimeDecisionTraces,
    anchorBatch,
    releaseQuote,
    provenanceState,
    registerProvenanceIdentity,
    setProvenanceIdentityStatus,
    issueProvenanceVc,
    approveDaoProposal,
    rejectDaoProposal,
    provenanceAdminRole,
    setProvenanceAdminRole,
  };

  return (
    <AppContext.Provider value={value}>
      <div className="ds-toast-stack" aria-label="Notifications">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastNotification key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </AnimatePresence>
      </div>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function useScreenCallbacks(): ScreenCallbacks {
  const { showToast, navigateTo, goToCustomer, goToQuote } = useApp();
  return { showToast, navigateTo, goToCustomer, goToQuote };
}

export function useChannelIntegrity() {
  const { runtimeScans } = useApp();
  const mapAlerts = getChannelMapAlerts(runtimeScans);
  return {
    runtimeScans,
    alerts: getChannelAlerts(runtimeScans),
    mapAlerts,
    alertCount: getChannelAlertCount(runtimeScans),
    mapAlertCount: mapAlerts.length,
    health: getChannelHealth(runtimeScans),
  };
}

export function useBatchAnchoring() {
  const { runtimeBatchAnchors, runtimeDecisionTraces } = useApp();
  return {
    runtimeBatchAnchors,
    runtimeDecisionTraces,
    anchorLog: getAnchorLogEntries(runtimeBatchAnchors),
    anchoredCount: getAnchoredBatchCount(runtimeBatchAnchors),
  };
}

export function useDealerSelection() {
  const { selectedDealerDid, setSelectedDealerDid } = useApp();
  return { selectedDealerDid, setSelectedDealerDid };
}

export function useProvenanceRegistry() {
  const {
    provenanceState,
    registerProvenanceIdentity,
    setProvenanceIdentityStatus,
    issueProvenanceVc,
    approveDaoProposal,
    rejectDaoProposal,
    runtimeBatchAnchors,
    provenanceAdminRole,
    setProvenanceAdminRole,
  } = useApp();
  return {
    provenanceState,
    registerProvenanceIdentity,
    setProvenanceIdentityStatus,
    issueProvenanceVc,
    approveDaoProposal,
    rejectDaoProposal,
    runtimeBatchAnchors,
    provenanceAdminRole,
    setProvenanceAdminRole,
    hasMintRights: (did: string) => hasMintRightsForDid(did, provenanceState),
  };
}

export function useProvenanceAdminRole() {
  const { provenanceAdminRole } = useApp();
  const option = getProvenanceAdminRoleOption(provenanceAdminRole);
  return {
    adminRole: provenanceAdminRole,
    canWrite: option.canWrite,
    showProfile: option.showProfile,
    roleLabel: option.label,
  };
}
