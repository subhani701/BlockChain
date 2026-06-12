import { skfSeed } from './seed.skf';
import type {
  CounterfeitReport,
  DaoProposal,
  Dealer,
  DealerStatus,
  EnforcementEvent,
  ReportSeverity,
  ServiceRequest,
  SkfStore,
  TimeWindow,
  VerificationResult,
} from './types';

let store: SkfStore = structuredClone(skfSeed);

export function getSkfStore(): SkfStore {
  return store;
}

export function resetSkfStore(): void {
  store = structuredClone(skfSeed);
}

// --- Service requests ---

export function getServiceRequests(): ServiceRequest[] {
  return store.serviceRequests;
}

export function getServiceRequest(srId: string): ServiceRequest | undefined {
  return store.serviceRequests.find((sr) => sr.sr_id === srId);
}

export function scanServiceRequest(srId: string): ServiceRequest | null {
  const sr = getServiceRequest(srId);
  if (!sr) return null;
  const product = store.products[sr.product_serial];
  const chain = store.custodyChains[sr.product_serial] ?? [];
  const dealerEvent = [...chain].reverse().find((e) => e.actor_role === 'DEALER');
  const dealer = dealerEvent ? getDealerByDid(dealerEvent.actor_did) : undefined;
  const hasAnomaly = chain.some((e) => e.anomaly_flag);
  const dealerOk = dealer?.status === 'Authorized';

  let result: VerificationResult = 'AUTHENTIC';
  if (!product) result = 'CANNOT_VERIFY';
  else if (!dealerOk || hasAnomaly) result = 'COUNTERFEIT';
  else if (chain.length < 3) result = 'CANNOT_VERIFY';

  const attribution = [
    { check: 'merkle_proof_valid', passed: !!product, weight: 0.2, label: 'Merkle proof valid' },
    { check: 'root_anchored_on_chain', passed: !!product, weight: 0.15, label: 'Root anchored on chain' },
    { check: 'batch_active', passed: true, weight: 0.1, label: 'Batch active' },
    { check: 'dealer_authorized', passed: !!dealerOk, weight: 0.2, label: 'Dealer authorized' },
    { check: 'custody_continuous', passed: !hasAnomaly, weight: 0.15, label: 'Custody continuous' },
    { check: 'qr_not_replayed', passed: !chain.some((e) => e.anomaly_flag === 'qr_replay_suspected'), weight: 0.1, label: 'QR not replayed' },
    { check: 'region_consistent', passed: dealerOk ?? false, weight: 0.1, label: 'Region consistent' },
  ];

  const confidence = result === 'AUTHENTIC' ? 0.99 : result === 'COUNTERFEIT' ? 0.92 : 0.45;

  sr.verification = {
    result,
    confidence,
    timestamp: new Date().toISOString(),
    merkle_root: product ? '0x9c21…4f7a' : null,
    chain_anchor_ref: product ? '0x3a8b…12cd' : null,
    attribution,
  };
  return sr;
}

// --- Products & custody ---

export function getProduct(serial: string) {
  return store.products[serial];
}

export function getCustodyChain(serial: string) {
  return store.custodyChains[serial] ?? [];
}

export function getLastDealerFromChain(serial: string): { did: string; name: string } | null {
  const chain = getCustodyChain(serial);
  const dealer = [...chain].reverse().find((e) => e.actor_role === 'DEALER');
  return dealer ? { did: dealer.actor_did, name: dealer.actor_display_name } : null;
}

// --- Dealers ---

export function getDealers(): Dealer[] {
  return store.dealers;
}

export function getDealerByDid(did: string): Dealer | undefined {
  return store.dealers.find((d) => d.did === did);
}

export function getDealerById(id: string): Dealer | undefined {
  return store.dealers.find((d) => d.id === id);
}

export function setSelectedDealerStatus(did: string, status: DealerStatus): void {
  const dealer = getDealerByDid(did);
  if (dealer) dealer.status = status;
}

// --- Counterfeit reports ---

export function getCounterfeitReports(): CounterfeitReport[] {
  return store.counterfeitReports;
}

export function getCounterfeitReport(reportId: string): CounterfeitReport | undefined {
  return store.counterfeitReports.find((r) => r.report_id === reportId);
}

export function getReportsByDealer(dealerDid: string, days = 365): CounterfeitReport[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return store.counterfeitReports
    .filter((r) => r.dealer_did === dealerDid && new Date(r.reported_at).getTime() >= cutoff)
    .sort((a, b) => new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime());
}

export function fileCounterfeitReport(input: Omit<CounterfeitReport, 'report_id' | 'reported_at' | 'status'>): CounterfeitReport {
  const report: CounterfeitReport = {
    ...input,
    report_id: `CR-2026-${String(100 + store.counterfeitReports.length).padStart(4, '0')}`,
    reported_at: new Date().toISOString(),
    status: 'Submitted',
  };
  store.counterfeitReports.unshift(report);
  return report;
}

function windowMs(window: TimeWindow): number | null {
  if (window === 'lifetime') return null;
  const days = window === '30d' ? 30 : window === '90d' ? 90 : 365;
  return days * 24 * 60 * 60 * 1000;
}

export function getReportsInWindow(dealerDid: string | null, window: TimeWindow): CounterfeitReport[] {
  const ms = windowMs(window);
  const cutoff = ms ? Date.now() - ms : 0;
  return store.counterfeitReports.filter((r) => {
    if (dealerDid && r.dealer_did !== dealerDid) return false;
    if (ms && new Date(r.reported_at).getTime() < cutoff) return false;
    return true;
  });
}

export function getCounterfeitRate(dealerDid: string, window: TimeWindow): number {
  const reports = getReportsInWindow(dealerDid, window);
  if (reports.length === 0) return 0;
  const confirmed = reports.filter((r) => r.severity !== 'SUSPECTED').length;
  return confirmed / Math.max(reports.length, 1);
}

// --- Enforcement ---

export function getEnforcementLog(dealerDid?: string): EnforcementEvent[] {
  const log = store.dealerEnforcementLog;
  return dealerDid ? log.filter((e) => e.dealer_did === dealerDid) : log;
}

export function addEnforcementEvent(event: Omit<EnforcementEvent, 'event_id'>): EnforcementEvent {
  const full: EnforcementEvent = { ...event, event_id: `ENF-${String(store.dealerEnforcementLog.length + 1).padStart(3, '0')}` };
  store.dealerEnforcementLog.unshift(full);
  return full;
}

// --- DAO proposals ---

export function getDaoProposals(): DaoProposal[] {
  return store.daoProposals;
}

export function getDaoProposal(proposalId: string): DaoProposal | undefined {
  return store.daoProposals.find((p) => p.proposal_id === proposalId);
}

export function openDaoProposal(input: Omit<DaoProposal, 'proposal_id' | 'opened_at' | 'closes_at' | 'votes' | 'status' | 'on_chain_tx'> & { ttl_hours?: number }): DaoProposal {
  const now = new Date();
  const closes = new Date(now.getTime() + (input.ttl_hours ?? 336) * 60 * 60 * 1000);
  const proposal: DaoProposal = {
    proposal_id: `DAO-2026-${String(50 + store.daoProposals.length).padStart(4, '0')}`,
    dealer_did: input.dealer_did,
    action_type: input.action_type,
    governance: input.governance,
    opened_at: now.toISOString(),
    closes_at: closes.toISOString(),
    rationale: input.rationale,
    evidence_hash: input.evidence_hash,
    votes: { for: 0, against: 0, abstain: 0, quorum_required: input.governance === 'dao_super_majority' ? 40 : 15 },
    status: 'Open',
    on_chain_tx: null,
  };
  store.daoProposals.unshift(proposal);
  return proposal;
}

// --- Aggregates for dealer console ---

export interface DealerLeaderboardRow {
  dealer: Dealer;
  reportCount: number;
  counterfeitRate: number;
  lastAction: string | null;
  lastActionAt: string | null;
  openProposals: number;
}

export function getDealerLeaderboard(filters: {
  region?: string;
  window: TimeWindow;
  statuses: DealerStatus[];
  minReports: number;
  severityFloor: ReportSeverity;
}): DealerLeaderboardRow[] {
  const severityRank: Record<ReportSeverity, number> = { SUSPECTED: 0, CONFIRMED_VISUAL: 1, CONFIRMED_LAB: 2 };

  return store.dealers
    .filter((d) => (filters.region && filters.region !== 'All' ? d.region === filters.region : true))
    .filter((d) => filters.statuses.length === 0 || filters.statuses.includes(d.status))
    .map((dealer) => {
      const reports = getReportsInWindow(dealer.did, filters.window).filter(
        (r) => severityRank[r.severity] >= severityRank[filters.severityFloor],
      );
      const lastEnf = getEnforcementLog(dealer.did)[0];
      const openProposals = store.daoProposals.filter((p) => p.dealer_did === dealer.did && p.status === 'Open').length;
      return {
        dealer,
        reportCount: reports.length,
        counterfeitRate: getCounterfeitRate(dealer.did, filters.window),
        lastAction: lastEnf?.type ?? null,
        lastActionAt: lastEnf?.occurred_at ?? null,
        openProposals,
      };
    })
    .filter((row) => row.reportCount >= filters.minReports)
    .sort((a, b) => b.counterfeitRate - a.counterfeitRate);
}

export function getCohortKpis(window: TimeWindow) {
  const dealers = store.dealers;
  const reports = getReportsInWindow(null, window);
  const rates = dealers.map((d) => getCounterfeitRate(d.did, window)).filter((r) => r > 0);
  rates.sort((a, b) => a - b);
  const median = rates.length ? rates[Math.floor(rates.length / 2)] : 0;

  return {
    authorized: dealers.filter((d) => d.status === 'Authorized').length,
    underReview: dealers.filter((d) => d.status === 'Under review').length,
    suspended: dealers.filter((d) => d.status === 'Suspended').length,
    blacklisted: dealers.filter((d) => d.status === 'Blacklisted').length,
    reports90d: getReportsInWindow(null, '90d').length,
    reportsWindow: reports.length,
    medianRate: median,
  };
}

export function getDealerWeeklySeries(dealerDid: string) {
  const reports = getReportsByDealer(dealerDid, 365);
  const weeks: Record<string, number> = {};
  for (let i = 7; i >= 0; i--) {
    weeks[`W${8 - i}`] = 0;
  }
  reports.slice(0, 20).forEach((r, i) => {
    const key = `W${Math.min(8, Math.floor(i / 3) + 1)}`;
    if (weeks[key] !== undefined) weeks[key]++;
  });
  return Object.entries(weeks).map(([week, count]) => ({ week, count }));
}

export function getDealerSignal(dealerDid: string) {
  return store.dealerSignalScores[dealerDid] ?? { score: 0, attributions: [] };
}

export function getUniqueReporters(dealerDid: string, window: TimeWindow): number {
  const reports = getReportsInWindow(dealerDid, window);
  return new Set(reports.map((r) => r.reporter_service_centre)).size;
}

export function formatDidShort(did: string): string {
  const parts = did.split(':');
  const id = parts[parts.length - 1] ?? did;
  return id.length > 16 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.round(diff / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' });
}
