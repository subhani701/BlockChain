export type DealerStatus = 'Authorized' | 'Under review' | 'Warned' | 'Suspended' | 'Blacklisted';
export type ReportSeverity = 'SUSPECTED' | 'CONFIRMED_VISUAL' | 'CONFIRMED_LAB';
export type VerificationResult = 'AUTHENTIC' | 'COUNTERFEIT' | 'CANNOT_VERIFY' | 'NOT_YET_SCANNED';
export type ServiceRequestStatus = 'Open' | 'In Progress' | 'Closed';
export type ReportStatus = 'Submitted' | 'Under review' | 'Confirmed' | 'Dismissed';
export type EnforcementType = 'WARN' | 'SUSPEND' | 'REINSTATE' | 'BLACKLIST' | 'APPEAL';
export type DaoActionType = 'WARN' | 'SUSPEND' | 'BLACKLIST' | 'REINSTATE';
export type DaoGovernance = 'single_signer' | 'dao_simple_majority' | 'dao_super_majority';
export type DaoProposalStatus = 'Open' | 'Passed' | 'Failed' | 'Executed' | 'Cancelled';
export type CustodyRole = 'PLANT' | 'DISTRIBUTOR' | 'DEALER' | 'SERVICE_CENTRE' | 'CUSTOMER';

export interface Product {
  serial: string;
  sku: string;
  batch_id: string;
  manufactured_at: string;
}

export interface VerificationAttribution {
  check: string;
  passed: boolean;
  weight: number;
  label: string;
}

export interface Verification {
  result: VerificationResult;
  confidence: number | null;
  timestamp: string | null;
  attribution: VerificationAttribution[];
  merkle_root: string | null;
  chain_anchor_ref: string | null;
}

export interface Dealer {
  id: string;
  did: string;
  display_name: string;
  region: string;
  status: DealerStatus;
  authorized_since: string;
}

export interface ServiceRequest {
  sr_id: string;
  customer_display_name: string;
  service_centre: { id: string; display_name: string };
  technician: { did: string; display_name: string };
  product_serial: string;
  opened_at: string;
  status: ServiceRequestStatus;
  verification: Verification | null;
}

export interface CustodyEvent {
  actor_did: string;
  actor_role: CustodyRole;
  actor_display_name: string;
  occurred_at: string;
  vc_id: string;
  on_chain_ref: string | null;
  anomaly_flag: string | null;
}

export interface CounterfeitReport {
  report_id: string;
  sr_id: string;
  dealer_did: string;
  product_serial: string;
  sku: string;
  severity: ReportSeverity;
  failure_modes: string[];
  photos: string[];
  lab_report_url: string | null;
  technician_did: string;
  reporter_service_centre: string;
  reported_at: string;
  status: ReportStatus;
  customer_consent_to_share: boolean;
  technician_notes?: string;
  dealer_invoice_no?: string;
}

export interface EnforcementEvent {
  event_id: string;
  dealer_did: string;
  type: EnforcementType;
  occurred_at: string;
  actor: string;
  dao_proposal_ref: string | null;
  on_chain_tx: string | null;
  rationale_short: string;
}

export interface DaoProposal {
  proposal_id: string;
  dealer_did: string;
  action_type: DaoActionType;
  governance: DaoGovernance;
  opened_at: string;
  closes_at: string;
  rationale: string;
  evidence_hash: string;
  votes: { for: number; against: number; abstain: number; quorum_required: number };
  status: DaoProposalStatus;
  on_chain_tx: string | null;
}

export interface DealerSignalAttribution {
  factor: string;
  contribution: number;
  label: string;
}

export interface SkfStore {
  serviceRequests: ServiceRequest[];
  counterfeitReports: CounterfeitReport[];
  dealers: Dealer[];
  dealerEnforcementLog: EnforcementEvent[];
  daoProposals: DaoProposal[];
  products: Record<string, Product>;
  custodyChains: Record<string, CustodyEvent[]>;
  dealerSignalScores: Record<string, { score: number; attributions: DealerSignalAttribution[] }>;
}

export type TimeWindow = '30d' | '90d' | '365d' | 'lifetime';
