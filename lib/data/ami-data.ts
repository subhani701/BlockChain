// VoltusWave AMI — single source of truth for mock data
// All screens import from here. IDs are stable for cross-screen navigation.

export type CustomerSegment = 'Distributor' | 'Fleet' | 'Service Chain' | 'OEM Direct';
export type ScanResult = 'genuine' | 'suspect';
export type QuoteStatus = 'draft' | 'sent' | 'won' | 'lost';
export type SignalType = 'churn-risk' | 'replacement-due' | 'service-trigger' | 'grey-market-nearby';
export type IdentityRole = 'Plant' | 'Distributor' | 'Service';
export type IdentityStatus = 'active' | 'suspended';

export interface Customer {
  id: string;
  name: string;
  segment: CustomerSegment;
  region: string;
  lifetimeValue: number;
  unitsActive: number;
  firstSeen: string;
  churnRisk: number;
  churnDrivers: string[];
  winProbability: number;
  daysToPay: number;
  openDisputes: number;
  dataSparse?: boolean;
}

export interface Part {
  id: string;
  sku: string;
  name: string;
  category: string;
  unitPrice: number;
  listPrice: number;
  wearCycleMonths: number;
}

export type BatchType = 'production' | 'rework' | 'pilot';
export type BatchPriority = 'standard' | 'rush' | 'hold';

export interface Batch {
  id: string;
  partId: string;
  plant: string;
  line: string;
  unitCount: number;
  mfgWindow: string;
  qaStatus: 'pass' | 'review';
  merkleRoot: string;
  blockNumber: string;
  anchoredAt: string;
  signingDid: string;
  batchType: BatchType;
  priority: BatchPriority;
  operator: string;
  qaInspector: string;
  sapSyncedAt: string;
}

export interface Scan {
  id: string;
  partId: string;
  batchId: string;
  customerId: string;
  geo: { lat: number; lng: number; region: string };
  result: ScanResult;
  verifierDid: string;
  timestamp: string;
}

export interface InstallBaseUnit {
  id: string;
  partId: string;
  customerId: string;
  installedAt: string;
  lastScanAt: string | null;
  predictedReplacementWindow: string | null;
}

export interface Recommendation {
  id: string;
  customerId: string;
  partId: string;
  reason: string;
  estValue: number;
  winProbability: number;
  signals: SignalType[];
  priority: number;
}

export interface QuoteLineItem {
  partId: string;
  qty: number;
  unitPrice: number;
  margin: number;
}

export interface Quote {
  id: string;
  customerId: string;
  lineItems: QuoteLineItem[];
  status: QuoteStatus;
  winProbability: number;
  createdBy: 'agent' | 'user';
  turnaroundDays: number;
}

export interface DecisionTrace {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  inputs: string;
  ruleApplied: string;
  outcome: string;
}

export interface Identity {
  did: string;
  role: IdentityRole;
  status: IdentityStatus;
  credentials: number;
  name: string;
}

export interface ChannelAlert {
  region: string;
  suspectCount: number;
  customerIds: string[];
  severity: 'warning' | 'critical';
  message: string;
}

const DASHBOARD_AS_OF = new Date('2026-06-05');

// ─── Parts (~10) ───────────────────────────────────────────────────────────

export const parts: Part[] = [
  { id: 'p1', sku: 'SKF-6205-2RS', name: 'Deep groove ball bearing 6205 sealed', category: 'Bearings', unitPrice: 42.5, listPrice: 45.0, wearCycleMonths: 18 },
  { id: 'p2', sku: 'FAG-6206-C3', name: 'Ball bearing 6206 C3 clearance', category: 'Bearings', unitPrice: 38.0, listPrice: 40.5, wearCycleMonths: 20 },
  { id: 'p3', sku: 'NSK-6205-2Z', name: 'Shielded ball bearing 6205', category: 'Bearings', unitPrice: 35.75, listPrice: 37.5, wearCycleMonths: 16 },
  { id: 'p4', sku: 'SKF-6308-2RS', name: 'Heavy duty bearing 6308 sealed', category: 'Bearings', unitPrice: 52.0, listPrice: 54.5, wearCycleMonths: 24 },
  { id: 'p5', sku: 'MANN-W712/75', name: 'Oil filter cartridge W712/75', category: 'Filters', unitPrice: 12.4, listPrice: 14.0, wearCycleMonths: 6 },
  { id: 'p6', sku: 'GATES-K060841', name: 'Serpentine drive belt K060841', category: 'Belts', unitPrice: 28.9, listPrice: 31.0, wearCycleMonths: 12 },
  { id: 'p7', sku: 'ELRING-701289', name: 'Crankshaft seal kit 701289', category: 'Seals', unitPrice: 18.6, listPrice: 21.0, wearCycleMonths: 36 },
  { id: 'p8', sku: 'SKF-6210-2RS', name: 'Ball bearing 6210 sealed', category: 'Bearings', unitPrice: 67.25, listPrice: 69.0, wearCycleMonths: 22 },
  { id: 'p9', sku: 'FAG-6208-2RS', name: 'Ball bearing 6208 sealed', category: 'Bearings', unitPrice: 39.5, listPrice: 41.25, wearCycleMonths: 18 },
  { id: 'p10', sku: 'NSK-6206-2Z', name: 'Shielded ball bearing 6206', category: 'Bearings', unitPrice: 34.25, listPrice: 36.0, wearCycleMonths: 17 },
];

// ─── Customers (12) ───────────────────────────────────────────────────────

export const customers: Customer[] = [
  { id: 'c1', name: 'Rhine Valley Distribution', segment: 'Distributor', region: 'DACH', lifetimeValue: 2840000, unitsActive: 12400, firstSeen: '2019-03-12', churnRisk: 18, churnDrivers: [], winProbability: 82, daysToPay: 28, openDisputes: 0 },
  { id: 'c2', name: 'Meridian Fleet Services', segment: 'Fleet', region: 'Western EU', lifetimeValue: 1920000, unitsActive: 8600, firstSeen: '2020-07-01', churnRisk: 34, churnDrivers: ['Payment stretch', 'Competitor trial'], winProbability: 71, daysToPay: 42, openDisputes: 1 },
  { id: 'c3', name: 'Autohaus Müller GmbH', segment: 'Service Chain', region: 'DACH', lifetimeValue: 890000, unitsActive: 3200, firstSeen: '2021-02-18', churnRisk: 22, churnDrivers: ['Seasonal slowdown'], winProbability: 78, daysToPay: 31, openDisputes: 0 },
  { id: 'c4', name: 'Nordsee Parts GmbH', segment: 'Distributor', region: 'DACH', lifetimeValue: 1560000, unitsActive: 5800, firstSeen: '2018-11-05', churnRisk: 12, churnDrivers: [], winProbability: 88, daysToPay: 25, openDisputes: 0 },
  { id: 'c5', name: 'Italia Parts S.r.l.', segment: 'Distributor', region: 'Southern EU', lifetimeValue: 1340000, unitsActive: 4900, firstSeen: '2019-09-22', churnRisk: 28, churnDrivers: ['Grey-market exposure'], winProbability: 65, daysToPay: 38, openDisputes: 2 },
  { id: 'c6', name: 'Baltic Motor Group', segment: 'Fleet', region: 'Northern EU', lifetimeValue: 720000, unitsActive: 2100, firstSeen: '2022-04-10', churnRisk: 45, churnDrivers: ['Install-base drift', 'Low scan rate'], winProbability: 58, daysToPay: 45, openDisputes: 1 },
  { id: 'c7', name: 'Lyon Service Center', segment: 'Service Chain', region: 'Western EU', lifetimeValue: 540000, unitsActive: 1800, firstSeen: '2020-12-03', churnRisk: 31, churnDrivers: ['Replacement backlog'], winProbability: 74, daysToPay: 33, openDisputes: 0 },
  { id: 'c8', name: 'Eastern Motors', segment: 'Distributor', region: 'Eastern EU', lifetimeValue: 410000, unitsActive: 1200, firstSeen: '2017-06-15', churnRisk: 72, churnDrivers: ['Suspect scan cluster', 'Suspended DID peer'], winProbability: 32, daysToPay: 58, openDisputes: 3 },
  { id: 'c9', name: 'Pacific Rim Logistics', segment: 'OEM Direct', region: 'APAC', lifetimeValue: 3100000, unitsActive: 15200, firstSeen: '2016-01-20', churnRisk: 15, churnDrivers: [], winProbability: 91, daysToPay: 22, openDisputes: 0 },
  { id: 'c10', name: 'Alpine Workshop Chain', segment: 'Service Chain', region: 'DACH', lifetimeValue: 680000, unitsActive: 2400, firstSeen: '2021-08-30', churnRisk: 26, churnDrivers: ['Parts mix shift'], winProbability: 69, daysToPay: 35, openDisputes: 0 },
  { id: 'c11', name: 'Celtic Fleet Co-op', segment: 'Fleet', region: 'Western EU', lifetimeValue: 120000, unitsActive: 180, firstSeen: '2026-01-08', churnRisk: 8, churnDrivers: [], winProbability: 55, daysToPay: 30, openDisputes: 0, dataSparse: true },
  { id: 'c12', name: 'Vistula Auto Parts', segment: 'Distributor', region: 'Eastern EU', lifetimeValue: 95000, unitsActive: 95, firstSeen: '2026-02-14', churnRisk: 5, churnDrivers: [], winProbability: 48, daysToPay: 28, openDisputes: 0, dataSparse: true },
];

// ─── Identities (~14) ───────────────────────────────────────────────────

export const identities: Identity[] = [
  { did: 'did:voltus:plant:sw7', role: 'Plant', status: 'active', credentials: 3, name: 'Schweinfurt L7' },
  { did: 'did:voltus:plant:st1', role: 'Plant', status: 'active', credentials: 2, name: 'Stuttgart W1' },
  { did: 'did:voltus:plant:sw5', role: 'Plant', status: 'active', credentials: 2, name: 'Schweinfurt L5' },
  { did: 'did:voltus:plant:ham01', role: 'Plant', status: 'active', credentials: 1, name: 'Hamburg Assembly' },
  { did: 'did:voltus:dist:rhine', role: 'Distributor', status: 'active', credentials: 1, name: 'Rhine Valley Distribution' },
  { did: 'did:voltus:dist:nordsee', role: 'Distributor', status: 'active', credentials: 2, name: 'Nordsee Parts GmbH' },
  { did: 'did:voltus:dist:italia', role: 'Distributor', status: 'active', credentials: 1, name: 'Italia Parts S.r.l.' },
  { did: 'did:voltus:dist:vistula', role: 'Distributor', status: 'active', credentials: 1, name: 'Vistula Auto Parts' },
  { did: 'did:voltus:dist:eastern', role: 'Distributor', status: 'suspended', credentials: 0, name: 'Eastern Motors' },
  { did: 'did:voltus:dist:baltic', role: 'Distributor', status: 'suspended', credentials: 0, name: 'Baltic Motor Group' },
  { did: 'did:voltus:service:lyo03', role: 'Service', status: 'active', credentials: 1, name: 'Lyon Service Center' },
  { did: 'did:voltus:service:muc01', role: 'Service', status: 'active', credentials: 1, name: 'Munich Service Center' },
  { did: 'did:voltus:service:alp01', role: 'Service', status: 'active', credentials: 2, name: 'Alpine Workshop Chain' },
  { did: 'did:voltus:service:mer01', role: 'Service', status: 'active', credentials: 1, name: 'Meridian Fleet Services' },
];

// ─── Batches (~8) ─────────────────────────────────────────────────────────

export const batches: Batch[] = [
  { id: 'B-2026-04-K9', partId: 'p1', plant: 'Schweinfurt L7', line: 'L7-A', unitCount: 2400, mfgWindow: '2026-04-01 — 2026-04-15', qaStatus: 'pass', merkleRoot: '0xA7F3…9B21', blockNumber: '19847291', anchoredAt: '2026-04-16T08:12:00Z', signingDid: 'did:voltus:plant:sw7', batchType: 'production', priority: 'standard', operator: 'K. Weber', qaInspector: 'M. Hoffmann', sapSyncedAt: '2026-06-05T07:52:00Z' },
  { id: 'B-2026-03-M2', partId: 'p2', plant: 'Stuttgart W1', line: 'W1-B', unitCount: 1800, mfgWindow: '2026-03-10 — 2026-03-22', qaStatus: 'pass', merkleRoot: '0xC4E1…2F88', blockNumber: '19840102', anchoredAt: '2026-03-23T14:30:00Z', signingDid: 'did:voltus:plant:st1', batchType: 'production', priority: 'standard', operator: 'S. Richter', qaInspector: 'A. Klein', sapSyncedAt: '2026-06-05T07:48:00Z' },
  { id: 'B-2026-02-H7', partId: 'p3', plant: 'Schweinfurt L7', line: 'L7-C', unitCount: 3200, mfgWindow: '2026-02-05 — 2026-02-18', qaStatus: 'pass', merkleRoot: '0xB2D9…4410', blockNumber: '19822045', anchoredAt: '2026-02-19T09:45:00Z', signingDid: 'did:voltus:plant:sw7', batchType: 'production', priority: 'rush', operator: 'K. Weber', qaInspector: 'M. Hoffmann', sapSyncedAt: '2026-06-05T07:45:00Z' },
  { id: 'B-2026-01-P4', partId: 'p4', plant: 'Schweinfurt L5', line: 'L5-A', unitCount: 960, mfgWindow: '2026-01-12 — 2026-01-20', qaStatus: 'review', merkleRoot: '0xD8A2…7731', blockNumber: '19810233', anchoredAt: '2026-01-21T11:00:00Z', signingDid: 'did:voltus:plant:sw7', batchType: 'rework', priority: 'hold', operator: 'J. Fischer', qaInspector: 'L. Brandt', sapSyncedAt: '2026-06-05T07:40:00Z' },
  { id: 'B-2025-12-F1', partId: 'p5', plant: 'Stuttgart W1', line: 'W1-A', unitCount: 12000, mfgWindow: '2025-12-01 — 2025-12-10', qaStatus: 'pass', merkleRoot: '0xE1C0…5592', blockNumber: '19798001', anchoredAt: '2025-12-11T07:20:00Z', signingDid: 'did:voltus:plant:st1', batchType: 'production', priority: 'standard', operator: 'S. Richter', qaInspector: 'A. Klein', sapSyncedAt: '2026-06-05T07:38:00Z' },
  { id: 'B-2025-11-S3', partId: 'p6', plant: 'Schweinfurt L7', line: 'L7-D', unitCount: 4500, mfgWindow: '2025-11-08 — 2025-11-15', qaStatus: 'pass', merkleRoot: '0xF3B7…8820', blockNumber: '19785012', anchoredAt: '2025-11-16T16:10:00Z', signingDid: 'did:voltus:plant:sw7', batchType: 'production', priority: 'standard', operator: 'K. Weber', qaInspector: 'M. Hoffmann', sapSyncedAt: '2026-06-05T07:35:00Z' },
  { id: 'B-2025-10-E8', partId: 'p7', plant: 'Stuttgart W1', line: 'W1-C', unitCount: 2800, mfgWindow: '2025-10-02 — 2025-10-12', qaStatus: 'pass', merkleRoot: '0xA9E4…3317', blockNumber: '19772088', anchoredAt: '2025-10-13T10:05:00Z', signingDid: 'did:voltus:plant:st1', batchType: 'production', priority: 'standard', operator: 'S. Richter', qaInspector: 'A. Klein', sapSyncedAt: '2026-06-05T07:32:00Z' },
  { id: 'B-2026-04-K2', partId: 'p8', plant: 'Schweinfurt L7', line: 'L7-B', unitCount: 720, mfgWindow: '2026-04-08 — 2026-04-14', qaStatus: 'pass', merkleRoot: '0xB7F2…9044', blockNumber: '19848100', anchoredAt: '2026-04-15T12:00:00Z', signingDid: 'did:voltus:plant:sw7', batchType: 'pilot', priority: 'rush', operator: 'K. Weber', qaInspector: 'M. Hoffmann', sapSyncedAt: '2026-06-05T07:30:00Z' },
  // Pending SAP batches — awaiting on-chain anchor
  { id: 'B-2026-04-J8', partId: 'p9', plant: 'Schweinfurt L5', line: 'L5-B', unitCount: 220, mfgWindow: '2026-04-10 — 2026-04-14', qaStatus: 'pass', merkleRoot: '0xC8E4…1A33', blockNumber: '', anchoredAt: '', signingDid: 'did:voltus:plant:sw7', batchType: 'production', priority: 'rush', operator: 'J. Fischer', qaInspector: 'M. Hoffmann', sapSyncedAt: '2026-06-05T07:57:00Z' },
  { id: 'B-2026-04-L3', partId: 'p4', plant: 'Schweinfurt L7', line: 'L7-E', unitCount: 310, mfgWindow: '2026-04-08 — 2026-04-11', qaStatus: 'pass', merkleRoot: '0xD1F6…2B44', blockNumber: '', anchoredAt: '', signingDid: 'did:voltus:plant:sw7', batchType: 'production', priority: 'standard', operator: 'K. Weber', qaInspector: 'M. Hoffmann', sapSyncedAt: '2026-06-05T07:55:00Z' },
  { id: 'B-2026-04-M2', partId: 'p10', plant: 'Stuttgart W1', line: 'W1-D', unitCount: 85, mfgWindow: '2026-04-13 — 2026-04-15', qaStatus: 'review', merkleRoot: '0xE2A7…3C55', blockNumber: '', anchoredAt: '', signingDid: 'did:voltus:plant:st1', batchType: 'rework', priority: 'hold', operator: 'S. Richter', qaInspector: 'L. Brandt', sapSyncedAt: '2026-06-05T07:54:00Z' },
  { id: 'B-2026-04-N1', partId: 'p1', plant: 'Schweinfurt L7', line: 'L7-A', unitCount: 480, mfgWindow: '2026-04-09 — 2026-04-12', qaStatus: 'pass', merkleRoot: '0xF3C8…4D66', blockNumber: '', anchoredAt: '', signingDid: 'did:voltus:plant:sw7', batchType: 'production', priority: 'standard', operator: 'K. Weber', qaInspector: 'M. Hoffmann', sapSyncedAt: '2026-06-05T07:53:00Z' },
  { id: 'B-2026-04-P5', partId: 'p5', plant: 'Stuttgart W1', line: 'W1-A', unitCount: 2400, mfgWindow: '2026-04-07 — 2026-04-11', qaStatus: 'pass', merkleRoot: '0xA4D9…5E77', blockNumber: '', anchoredAt: '', signingDid: 'did:voltus:plant:st1', batchType: 'production', priority: 'rush', operator: 'S. Richter', qaInspector: 'A. Klein', sapSyncedAt: '2026-06-05T07:51:00Z' },
  { id: 'B-2026-04-Q2', partId: 'p6', plant: 'Schweinfurt L7', line: 'L7-D', unitCount: 890, mfgWindow: '2026-04-11 — 2026-04-14', qaStatus: 'review', merkleRoot: '0xB5E0…6F88', blockNumber: '', anchoredAt: '', signingDid: 'did:voltus:plant:sw7', batchType: 'production', priority: 'standard', operator: 'K. Weber', qaInspector: 'L. Brandt', sapSyncedAt: '2026-06-05T07:50:00Z' },
  { id: 'B-2026-04-R7', partId: 'p3', plant: 'Schweinfurt L5', line: 'L5-C', unitCount: 156, mfgWindow: '2026-04-12 — 2026-04-15', qaStatus: 'pass', merkleRoot: '0xC6F1…7089', blockNumber: '', anchoredAt: '', signingDid: 'did:voltus:plant:sw7', batchType: 'pilot', priority: 'standard', operator: 'J. Fischer', qaInspector: 'M. Hoffmann', sapSyncedAt: '2026-06-05T07:49:00Z' },
  { id: 'B-2026-04-S4', partId: 'p2', plant: 'Stuttgart W1', line: 'W1-B', unitCount: 340, mfgWindow: '2026-04-10 — 2026-04-13', qaStatus: 'pass', merkleRoot: '0xD702…8190', blockNumber: '', anchoredAt: '', signingDid: 'did:voltus:plant:st1', batchType: 'production', priority: 'standard', operator: 'S. Richter', qaInspector: 'A. Klein', sapSyncedAt: '2026-06-05T07:47:00Z' },
  { id: 'B-2026-04-T9', partId: 'p7', plant: 'Schweinfurt L7', line: 'L7-C', unitCount: 112, mfgWindow: '2026-04-14 — 2026-04-15', qaStatus: 'pass', merkleRoot: '0xE813…9201', blockNumber: '', anchoredAt: '', signingDid: 'did:voltus:plant:sw7', batchType: 'production', priority: 'rush', operator: 'K. Weber', qaInspector: 'M. Hoffmann', sapSyncedAt: '2026-06-05T07:46:00Z' },
];

export const PROVENANCE_REGISTRY_CONTRACT = 'ProvenanceRegistry.sol';
export const PROVENANCE_REGISTRY_ADDRESS = '0xDef2…3B7f';
export const VOLTUS_CHAIN_LABEL = 'Voltus Private Ethereum';
export const DAO_MINT_QUORUM = { required: 4, total: 5 } as const;
export const ANCHOR_BLOCK_BASE = 19849200;

// ─── Scans (~40) ──────────────────────────────────────────────────────────

const scanRegions = [
  { region: 'DACH', lat: 50.1, lng: 8.7 },
  { region: 'Western EU', lat: 48.85, lng: 2.35 },
  { region: 'Southern EU', lat: 45.46, lng: 9.19 },
  { region: 'Eastern EU', lat: 52.23, lng: 21.01 },
  { region: 'Northern EU', lat: 59.33, lng: 18.07 },
];

function buildScans(): Scan[] {
  const scans: Scan[] = [];
  const customerIds = customers.map((c) => c.id);
  const batchIds = batches.map((b) => b.id);
  let idx = 0;
  for (let i = 0; i < 40; i++) {
    const batch = batches[i % batches.length];
    const customer = customers[i % customerIds.length];
    const geo = scanRegions[i % scanRegions.length];
    // Cluster suspect scans in Eastern EU for channel integrity story
    const isEasternCluster = i >= 32 && i < 38;
    const result: ScanResult = isEasternCluster ? 'suspect' : i % 11 === 0 ? 'suspect' : 'genuine';
    const customerId = isEasternCluster ? 'c8' : customer.id;
    scans.push({
      id: `scan-${++idx}`,
      partId: batch.partId,
      batchId: batch.id,
      customerId,
      geo: { ...geo, region: isEasternCluster ? 'Eastern EU' : geo.region },
      result,
      verifierDid: 'did:voltus:am-scanner-07',
      timestamp: new Date(2026, 3, 1 + (i % 28), 8 + (i % 12), i % 60).toISOString(),
    });
  }
  return scans;
}

export const scans: Scan[] = buildScans();

// ─── Install base (~30) ───────────────────────────────────────────────────

function buildInstallBase(): InstallBaseUnit[] {
  const units: InstallBaseUnit[] = [];
  for (let i = 0; i < 30; i++) {
    const customer = customers[i % customers.length];
    const part = parts[i % parts.length];
    const sparse = customer.dataSparse === true;
    units.push({
      id: `ibu-${i + 1}`,
      partId: part.id,
      customerId: customer.id,
      installedAt: sparse ? '2026-02-01' : `202${3 + (i % 3)}-${String((i % 12) + 1).padStart(2, '0')}-15`,
      lastScanAt: sparse ? null : `2026-0${(i % 4) + 1}-${String((i % 20) + 1).padStart(2, '0')}`,
      predictedReplacementWindow: sparse ? null : `2026-${String((i % 6) + 7).padStart(2, '0')}-01`,
    });
  }
  return units;
}

export const installBaseUnits: InstallBaseUnit[] = buildInstallBase();

// ─── Recommendations (~15) ──────────────────────────────────────────────────

export const recommendations: Recommendation[] = [
  { id: 'r1', customerId: 'c3', partId: 'p1', reason: 'Replacement window opening on SKF-6205 install base', estValue: 18400, winProbability: 78, signals: ['replacement-due', 'service-trigger'], priority: 92 },
  { id: 'r2', customerId: 'c2', partId: 'p4', reason: 'Fleet wear cycle exceeded on heavy-duty bearings', estValue: 32100, winProbability: 71, signals: ['replacement-due'], priority: 88 },
  { id: 'r3', customerId: 'c8', partId: 'p3', reason: 'Suspect scan cluster near Eastern Motors channel', estValue: 8900, winProbability: 32, signals: ['grey-market-nearby', 'churn-risk'], priority: 95 },
  { id: 'r4', customerId: 'c1', partId: 'p2', reason: 'Cross-sell from recent genuine scan volume', estValue: 24600, winProbability: 82, signals: ['service-trigger'], priority: 84 },
  { id: 'r5', customerId: 'c5', partId: 'p7', reason: 'Seal kit due on Italia Parts service line', estValue: 6200, winProbability: 65, signals: ['replacement-due'], priority: 76 },
  { id: 'r6', customerId: 'c6', partId: 'p5', reason: 'Filter replacement overdue across Baltic fleet', estValue: 4100, winProbability: 58, signals: ['replacement-due', 'churn-risk'], priority: 80 },
  { id: 'r7', customerId: 'c4', partId: 'p9', reason: 'Upsell from Nordsee Q1 bearing orders', estValue: 19800, winProbability: 88, signals: ['service-trigger'], priority: 79 },
  { id: 'r8', customerId: 'c7', partId: 'p6', reason: 'Drive belt wear signal from Lyon service scans', estValue: 5400, winProbability: 74, signals: ['replacement-due'], priority: 72 },
  { id: 'r9', customerId: 'c10', partId: 'p8', reason: 'Alpine workshop chain expansion parts gap', estValue: 11200, winProbability: 69, signals: ['service-trigger'], priority: 70 },
  { id: 'r10', customerId: 'c9', partId: 'p10', reason: 'Pacific Rim volume discount renegotiation window', estValue: 52000, winProbability: 91, signals: ['service-trigger'], priority: 86 },
  { id: 'r11', customerId: 'c3', partId: 'p4', reason: 'Autohaus Müller cross-sell on premium bearing line', estValue: 9800, winProbability: 78, signals: ['service-trigger'], priority: 68 },
  { id: 'r12', customerId: 'c2', partId: 'p6', reason: 'Meridian fleet belt service campaign', estValue: 7300, winProbability: 71, signals: ['replacement-due'], priority: 66 },
  { id: 'r13', customerId: 'c8', partId: 'p1', reason: 'Channel integrity remediation quote for Eastern Motors', estValue: 15600, winProbability: 32, signals: ['grey-market-nearby', 'churn-risk'], priority: 94 },
  { id: 'r14', customerId: 'c11', partId: 'p5', reason: 'Onboarding starter kit for Celtic Fleet', estValue: 1200, winProbability: 55, signals: ['service-trigger'], priority: 45 },
  { id: 'r15', customerId: 'c12', partId: 'p3', reason: 'Initial stocking recommendation for Vistula Auto', estValue: 800, winProbability: 48, signals: ['service-trigger'], priority: 40 },
].map((r) => ({
  ...r,
  priority: r.priority ?? Math.round(r.winProbability * 0.6 + (r.estValue / 1000) * 0.4),
}));

// ─── Quotes (~5) ──────────────────────────────────────────────────────────

export const quotes: Quote[] = [
  {
    id: 'Q-2026-0847',
    customerId: 'c3',
    lineItems: [
      { partId: 'p1', qty: 24, unitPrice: 42.5, margin: 0.12 },
      { partId: 'p2', qty: 12, unitPrice: 38.0, margin: 0.1 },
      { partId: 'p3', qty: 48, unitPrice: 35.75, margin: 0.14 },
      { partId: 'p4', qty: 36, unitPrice: 52.0, margin: 0.11 },
    ],
    status: 'draft',
    winProbability: 78,
    createdBy: 'agent',
    turnaroundDays: 2,
  },
  {
    id: 'Q-2026-0812',
    customerId: 'c1',
    lineItems: [{ partId: 'p2', qty: 120, unitPrice: 37.5, margin: 0.09 }],
    status: 'sent',
    winProbability: 82,
    createdBy: 'user',
    turnaroundDays: 1,
  },
  {
    id: 'Q-2026-0799',
    customerId: 'c9',
    lineItems: [{ partId: 'p10', qty: 500, unitPrice: 33.0, margin: 0.08 }],
    status: 'won',
    winProbability: 91,
    createdBy: 'agent',
    turnaroundDays: 3,
  },
  {
    id: 'Q-2026-0755',
    customerId: 'c8',
    lineItems: [{ partId: 'p3', qty: 60, unitPrice: 34.0, margin: 0.05 }],
    status: 'lost',
    winProbability: 32,
    createdBy: 'user',
    turnaroundDays: 5,
  },
  {
    id: 'Q-2026-0830',
    customerId: 'c2',
    lineItems: [{ partId: 'p4', qty: 80, unitPrice: 50.0, margin: 0.1 }, { partId: 'p6', qty: 40, unitPrice: 27.5, margin: 0.12 }],
    status: 'draft',
    winProbability: 71,
    createdBy: 'agent',
    turnaroundDays: 2,
  },
];

// ─── Decision traces (~20) ──────────────────────────────────────────────────

export const decisionTraces: DecisionTrace[] = [
  { id: 'dt1', timestamp: '2026-06-04T09:12:00Z', actor: 'agent', action: 'Ranked worklist opportunity', inputs: 'customer=c3, part=p1', ruleApplied: 'model__next_best_part', outcome: 'Priority 92 — draft quote suggested' },
  { id: 'dt2', timestamp: '2026-06-04T08:45:00Z', actor: 'Sarah Chen', action: 'Approved batch anchor', inputs: 'batch=B-2026-04-K9', ruleApplied: 'governance__mint_policy', outcome: 'Anchored to block 19847291' },
  { id: 'dt3', timestamp: '2026-06-03T16:30:00Z', actor: 'agent', action: 'Flagged channel alert', inputs: 'region=Eastern EU, scans=6', ruleApplied: 'model__channel_integrity', outcome: 'Severity critical — Eastern Motors' },
  { id: 'dt4', timestamp: '2026-06-03T14:00:00Z', actor: 'agent', action: 'Computed churn risk', inputs: 'customer=c8', ruleApplied: 'model__churn_risk', outcome: 'Score 72 — suspect scan cluster' },
  { id: 'dt5', timestamp: '2026-06-03T11:20:00Z', actor: 'Marcus Weber', action: 'Issued verifiable credential', inputs: 'did=voltus:service:lyo03', ruleApplied: 'governance__vc_policy', outcome: 'VC issued — service center' },
  { id: 'dt6', timestamp: '2026-06-02T10:05:00Z', actor: 'agent', action: 'Generated quote draft', inputs: 'quote=Q-2026-0847', ruleApplied: 'model__guided_pricing', outcome: 'Win probability 78%' },
  { id: 'dt7', timestamp: '2026-06-02T09:30:00Z', actor: 'agent', action: 'Verified field scan', inputs: 'scan=scan-12, batch=B-2026-04-K9', ruleApplied: 'prov__merkle_verify', outcome: 'Genuine — Schweinfurt L7' },
  { id: 'dt8', timestamp: '2026-06-01T17:00:00Z', actor: 'Sarah Chen', action: 'Suspended distributor DID', inputs: 'did=voltus:dist:eastern', ruleApplied: 'governance__dao_vote', outcome: 'Eastern Motors suspended' },
  { id: 'dt9', timestamp: '2026-06-01T15:45:00Z', actor: 'agent', action: 'Updated install-base census', inputs: 'customer=c6', ruleApplied: 'model__install_base', outcome: 'Units active 2100 — drift detected' },
  { id: 'dt10', timestamp: '2026-05-31T12:00:00Z', actor: 'agent', action: 'Scored win probability', inputs: 'quote=Q-2026-0812', ruleApplied: 'model__win_probability', outcome: '82% — competitive pricing' },
  { id: 'dt11', timestamp: '2026-05-30T08:20:00Z', actor: 'Marcus Weber', action: 'Registered plant identity', inputs: 'did=voltus:plant:sw7', ruleApplied: 'prov__did_registry', outcome: 'Active — 3 credentials' },
  { id: 'dt12', timestamp: '2026-05-29T14:10:00Z', actor: 'agent', action: 'Detected replacement window', inputs: 'customer=c2, part=p4', ruleApplied: 'model__wear_cycle', outcome: 'Replacement due Q3 2026' },
  { id: 'dt13', timestamp: '2026-05-28T11:00:00Z', actor: 'agent', action: 'Rejected suspect scan', inputs: 'scan=scan-35', ruleApplied: 'prov__merkle_verify', outcome: 'Suspect — merkle mismatch' },
  { id: 'dt14', timestamp: '2026-05-27T09:15:00Z', actor: 'Sarah Chen', action: 'Reviewed governance proposal', inputs: 'proposal=suspend-eastern', ruleApplied: 'governance__dao_vote', outcome: 'Approved 4/5' },
  { id: 'dt15', timestamp: '2026-05-26T16:40:00Z', actor: 'agent', action: 'Ranked worklist', inputs: 'filter=all', ruleApplied: 'model__priority_blend', outcome: '15 opportunities ranked' },
  { id: 'dt16', timestamp: '2026-05-25T10:30:00Z', actor: 'agent', action: 'Enriched account profile', inputs: 'customer=c5', ruleApplied: 'model__account_wiki', outcome: 'Grey-market exposure flagged' },
  { id: 'dt17', timestamp: '2026-05-24T13:20:00Z', actor: 'Marcus Weber', action: 'Submitted quote to SAP', inputs: 'quote=Q-2026-0799', ruleApplied: 'sap__quote_export', outcome: 'Won — Pacific Rim' },
  { id: 'dt18', timestamp: '2026-05-23T08:00:00Z', actor: 'agent', action: 'Built merkle tree', inputs: 'batch=B-2026-03-M2', ruleApplied: 'prov__batch_mint', outcome: '1800 units — anchored' },
  { id: 'dt19', timestamp: '2026-05-22T15:00:00Z', actor: 'agent', action: 'Onboarded sparse customer', inputs: 'customer=c11', ruleApplied: 'model__onboarding', outcome: 'Limited history — monitor' },
  { id: 'dt20', timestamp: '2026-05-21T11:45:00Z', actor: 'agent', action: 'Computed census KPIs', inputs: 'filter=recent', ruleApplied: 'model__install_base', outcome: 'Verified rate 94.2%' },
];

// ─── Selectors ──────────────────────────────────────────────────────────────

export function getCustomer(id: string): Customer | undefined {
  return customers.find((c) => c.id === id);
}

export function getPart(id: string): Part | undefined {
  return parts.find((p) => p.id === id);
}

export function getBatch(id: string): Batch | undefined {
  return batches.find((b) => b.id === id);
}

export function formatBatchSyncAge(iso: string, asOf: Date = DASHBOARD_AS_OF): string {
  const mins = Math.max(0, Math.round((asOf.getTime() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export function getBatchTypeLabel(type: BatchType): string {
  const labels: Record<BatchType, string> = {
    production: 'Production',
    rework: 'Rework',
    pilot: 'Pilot run',
  };
  return labels[type];
}

export function getBatchPriorityLabel(priority: BatchPriority): string {
  const labels: Record<BatchPriority, string> = {
    standard: 'Standard',
    rush: 'Rush',
    hold: 'On hold',
  };
  return labels[priority];
}

export function getIdentityByDid(did: string): Identity | undefined {
  return identities.find((i) => i.did === did);
}

export type BatchAnchorOverride = { blockNumber: string; anchoredAt: string };
export type RuntimeBatchAnchors = Record<string, BatchAnchorOverride>;

export function isBatchAnchored(batch: Batch): boolean {
  return Boolean(batch.blockNumber && batch.anchoredAt);
}

export function mergeBatch(batch: Batch, overrides: RuntimeBatchAnchors): Batch {
  const override = overrides[batch.id];
  return override ? { ...batch, ...override } : batch;
}

export function getAllBatches(overrides: RuntimeBatchAnchors = {}): Batch[] {
  return batches.map((b) => mergeBatch(b, overrides));
}

export function getBatchMerged(id: string, overrides: RuntimeBatchAnchors = {}): Batch | undefined {
  const batch = getBatch(id);
  return batch ? mergeBatch(batch, overrides) : undefined;
}

/** SAP batches ready to mint: QA pass and not yet anchored */
export function getPendingMintBatches(overrides: RuntimeBatchAnchors = {}): Batch[] {
  return getAllBatches(overrides).filter((b) => b.qaStatus === 'pass' && !isBatchAnchored(b));
}

export function getBatchMintingKpis(overrides: RuntimeBatchAnchors = {}) {
  const unanchored = getUnanchoredBatches(overrides);
  const ready = getPendingMintBatches(overrides);
  const needsReview = unanchored.filter((b) => b.qaStatus === 'review');
  return {
    unanchoredCount: unanchored.length,
    readyCount: ready.length,
    reviewCount: needsReview.length,
    anchoredCount: getAnchoredBatchCount(overrides),
  };
}

export function getUnanchoredBatches(overrides: RuntimeBatchAnchors = {}): Batch[] {
  return getAllBatches(overrides).filter((b) => !isBatchAnchored(b));
}

export function getAnchoredBatches(overrides: RuntimeBatchAnchors = {}, limit?: number): Batch[] {
  const anchored = getAllBatches(overrides)
    .filter(isBatchAnchored)
    .sort((a, b) => new Date(b.anchoredAt).getTime() - new Date(a.anchoredAt).getTime());
  return limit ? anchored.slice(0, limit) : anchored;
}

export function getAnchoredBatchCount(overrides: RuntimeBatchAnchors = {}): number {
  return getAnchoredBatches(overrides).length;
}

export interface AnchorLogEntry {
  batchId: string;
  root: string;
  block: number;
  did: string;
  timestamp: string;
  timestampIso: string;
}

function formatAnchorDisplay(iso: string): string {
  const d = new Date(iso);
  const ref = new Date('2026-06-05T12:00:00Z');
  const sameDay = d.toDateString() === ref.toDateString();
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (sameDay) return `${time} today`;
  const yesterday = new Date(ref);
  yesterday.setDate(ref.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${time}`;
  }
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ` ${time}`;
}

export function getAnchorLogEntries(overrides: RuntimeBatchAnchors = {}, limit = 8): AnchorLogEntry[] {
  return getAnchoredBatches(overrides, limit).map((b) => ({
    batchId: b.id,
    root: b.merkleRoot,
    block: Number.parseInt(b.blockNumber, 10),
    did: b.signingDid,
    timestamp: formatAnchorDisplay(b.anchoredAt),
    timestampIso: b.anchoredAt,
  }));
}

export interface BatchUnitPreview {
  unit: string;
  serial: string;
  spec: string;
  qa: string;
  operator: string;
}

export function getBatchUnitPreviews(batch: Batch, part: Part, count = 6): BatchUnitPreview[] {
  const n = Math.min(count, 8);
  return Array.from({ length: n }, (_, i) => ({
    unit: String(i + 1).padStart(3, '0'),
    serial: `${part.sku}-${String(i + 1).padStart(3, '0')}`,
    spec: part.name,
    qa: batch.qaStatus === 'pass' ? 'Pass' : 'Review',
    operator: `OP-${2847 + i}`,
  }));
}

export interface MerkleTreePreview {
  root: string;
  unitCount: number;
  depth: number;
  leafSamples: { left: string; right: string };
  remainingLeaves: number;
}

export function getMerkleTreePreview(batch: Batch, part: Part): MerkleTreePreview {
  const depth = Math.max(1, Math.ceil(Math.log2(Math.max(batch.unitCount, 2))));
  return {
    root: batch.merkleRoot,
    unitCount: batch.unitCount,
    depth,
    leafSamples: {
      left: `${part.sku}-001`,
      right: `${part.sku}-002`,
    },
    remainingLeaves: Math.max(0, batch.unitCount - 2),
  };
}

export function createAnchorResult(
  batchId: string,
  existingOverrides: RuntimeBatchAnchors,
): BatchAnchorOverride {
  const runtimeCount = Object.keys(existingOverrides).length;
  return {
    blockNumber: String(ANCHOR_BLOCK_BASE + runtimeCount),
    anchoredAt: new Date().toISOString(),
  };
}

export function createAnchorDecisionTrace(batch: Batch): DecisionTrace {
  return {
    id: `dt-runtime-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: 'Sarah Chen',
    action: `Approved batch anchor ${batch.id}`,
    inputs: `batch=${batch.id}`,
    ruleApplied: 'governance__mint_policy',
    outcome: `Anchored to block ${batch.blockNumber}`,
  };
}

export function getDecisionTracesMerged(runtimeTraces: DecisionTrace[] = [], limit = 20): DecisionTrace[] {
  return [...runtimeTraces, ...decisionTraces]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

// ─── Governance & Audit selectors ────────────────────────────────────────────

export const GOVERNANCE_COMPLIANCE_BADGES = ['SOC 2', 'ISO 27001', 'DPDPA', 'HIPAA'] as const;

export interface GovernanceConfigRecord {
  id: string;
  version: string;
  changedBy: string;
  changedAt: string;
  setting: string;
  value: string;
  category: 'sync_mode' | 'action_boundary' | 'guardrail' | 'model_binding' | 'governance';
  previousVersion?: string;
}

export const governanceConfigHistory: GovernanceConfigRecord[] = [
  { id: 'cfg1', version: 'v2.4.1', changedBy: 'admin@voltus.io', changedAt: '2026-06-01', setting: 'action_boundary', value: 'recommend', category: 'action_boundary', previousVersion: 'v2.4.0' },
  { id: 'cfg2', version: 'v2.4.0', changedBy: 'admin@voltus.io', changedAt: '2026-05-28', setting: 'price_guardrail', value: '±15%', category: 'guardrail', previousVersion: 'v2.3.9' },
  { id: 'cfg3', version: 'v2.3.9', changedBy: 'admin@voltus.io', changedAt: '2026-05-20', setting: 'churn_threshold', value: '50%', category: 'guardrail', previousVersion: 'v2.3.8' },
  { id: 'cfg4', version: 'v2.3.8', changedBy: 'mwagner@voltus.io', changedAt: '2026-05-14', setting: 'dao_quorum', value: '4 of 5', category: 'governance', previousVersion: 'v2.3.7' },
  { id: 'cfg5', version: 'v2.3.7', changedBy: 'admin@voltus.io', changedAt: '2026-05-08', setting: 'verify_fail_rate', value: '2.0%', category: 'guardrail', previousVersion: 'v2.3.6' },
  { id: 'cfg6', version: 'v2.3.6', changedBy: 'aklein@voltus.io', changedAt: '2026-04-30', setting: 'sap_sync_interval', value: '15 min', category: 'sync_mode', previousVersion: 'v2.3.5' },
  { id: 'cfg7', version: 'v2.3.5', changedBy: 'admin@voltus.io', changedAt: '2026-04-22', setting: 'model__win_probability', value: 'v3.2.1 binding', category: 'model_binding', previousVersion: 'v2.3.4' },
  { id: 'cfg8', version: 'v2.3.4', changedBy: 'admin@voltus.io', changedAt: '2026-04-15', setting: 'model__guided_pricing', value: 'v2.8.0 binding', category: 'model_binding', previousVersion: 'v2.3.3' },
  { id: 'cfg9', version: 'v2.3.3', changedBy: 'mwagner@voltus.io', changedAt: '2026-04-08', setting: 'sync_mode', value: 'closed-loop', category: 'sync_mode', previousVersion: 'v2.3.2' },
];

export type GovernanceTraceFilter = 'all' | 'agent' | 'user' | 'approved' | 'released' | 'logged';

export type TraceOutcomeKind = 'approved' | 'released' | 'logged';

export interface GovernanceTraceRow {
  id: string;
  timestamp: string;
  timestampIso: string;
  actor: string;
  actorKind: 'agent' | 'user' | 'human';
  action: string;
  inputs: string;
  ruleApplied: string;
  outcome: string;
  outcomeKind: TraceOutcomeKind;
}

function formatGovernanceTimestamp(iso: string): string {
  return new Date(iso)
    .toLocaleString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    .replace(',', '');
}

function classifyTraceActor(actor: string): GovernanceTraceRow['actorKind'] {
  if (actor === 'agent') return 'agent';
  if (actor.startsWith('user:')) return 'user';
  return 'human';
}

function classifyTraceOutcome(outcome: string): TraceOutcomeKind {
  const lower = outcome.toLowerCase();
  if (lower.includes('anchored') || lower.includes('approved')) return 'approved';
  if (lower.includes('released') || lower.includes('sap')) return 'released';
  return 'logged';
}

export function toGovernanceTraceRow(trace: DecisionTrace): GovernanceTraceRow {
  const outcomeKind = classifyTraceOutcome(trace.outcome);
  return {
    id: trace.id,
    timestamp: formatGovernanceTimestamp(trace.timestamp),
    timestampIso: trace.timestamp,
    actor: trace.actor,
    actorKind: classifyTraceActor(trace.actor),
    action: trace.action,
    inputs: trace.inputs,
    ruleApplied: trace.ruleApplied,
    outcome: trace.outcome,
    outcomeKind,
  };
}

export function getGovernanceTraceRows(runtimeTraces: DecisionTrace[] = [], limit = 40): GovernanceTraceRow[] {
  return getDecisionTracesMerged(runtimeTraces, limit).map(toGovernanceTraceRow);
}

export function searchGovernanceTraces(rows: GovernanceTraceRow[], query: string): GovernanceTraceRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (r) =>
      r.action.toLowerCase().includes(q) ||
      r.inputs.toLowerCase().includes(q) ||
      r.ruleApplied.toLowerCase().includes(q) ||
      r.outcome.toLowerCase().includes(q) ||
      r.actor.toLowerCase().includes(q),
  );
}

export function filterGovernanceTraces(
  rows: GovernanceTraceRow[],
  filter: GovernanceTraceFilter,
): GovernanceTraceRow[] {
  switch (filter) {
    case 'agent':
      return rows.filter((r) => r.actorKind === 'agent');
    case 'user':
      return rows.filter((r) => r.actorKind === 'user' || r.actorKind === 'human');
    case 'approved':
      return rows.filter((r) => r.outcomeKind === 'approved');
    case 'released':
      return rows.filter((r) => r.outcomeKind === 'released');
    case 'logged':
      return rows.filter((r) => r.outcomeKind === 'logged');
    default:
      return rows;
  }
}

export function getGovernanceConfigHistory(): GovernanceConfigRecord[] {
  return [...governanceConfigHistory];
}

export function getGovernanceKpis(runtimeTraces: DecisionTrace[] = [], runtimeAnchors: RuntimeBatchAnchors = {}) {
  const traces = getGovernanceTraceRows(runtimeTraces, 100);
  const anchors = getAnchorLogEntries(runtimeAnchors, 100);
  return {
    traceCount: traces.length,
    configVersions: governanceConfigHistory.length,
    anchorCount: anchors.length,
    runtimeTraceCount: runtimeTraces.length,
  };
}

// ─── Provenance Registry selectors ───────────────────────────────────────────

export type ProvenanceAdminRole = 'plant-admin' | 'quality-admin' | 'oem-viewer';
export type DaoProposalStatus = 'pending' | 'approved' | 'rejected';
export type ProvenanceIdentityFilter = 'all' | 'plant' | 'distributor' | 'service' | 'active' | 'suspended';

export const PROVENANCE_REGISTRY_VERSION = 'v2.1.0';

export const DEFAULT_MINT_AUTHORIZED_DIDS = ['did:voltus:plant:sw7', 'did:voltus:plant:st1'] as const;

export interface DaoMember {
  address: string;
  role: string;
}

export interface DaoProposal {
  id: string;
  title: string;
  votesFor: number;
  votesTotal: number;
  status: DaoProposalStatus;
  gatesMinting: boolean;
  relatedDid?: string;
}

export const daoMembers: DaoMember[] = [
  { address: '0xAbc1…2345', role: 'Plant Admin' },
  { address: '0xDef2…6789', role: 'Quality Lead' },
  { address: '0xGhi3…0123', role: 'Security' },
  { address: '0xJkl4…4567', role: 'Compliance' },
  { address: '0xMno5…8901', role: 'Operations' },
];

export const daoProposals: DaoProposal[] = [
  {
    id: 'prop-sw7-mint',
    title: 'Grant plant SW7 mint rights',
    votesFor: 3,
    votesTotal: DAO_MINT_QUORUM.total,
    status: 'pending',
    gatesMinting: true,
    relatedDid: 'did:voltus:plant:sw7',
  },
  {
    id: 'prop-lyon-vc',
    title: 'Issue VC to Lyon Service Center',
    votesFor: 2,
    votesTotal: DAO_MINT_QUORUM.total,
    status: 'pending',
    gatesMinting: false,
    relatedDid: 'did:voltus:service:lyo03',
  },
  {
    id: 'prop-eastern-suspend',
    title: 'Suspend Eastern Motors DID',
    votesFor: 4,
    votesTotal: DAO_MINT_QUORUM.total,
    status: 'approved',
    gatesMinting: false,
    relatedDid: 'did:voltus:dist:eastern',
  },
  {
    id: 'prop-st1-quota',
    title: 'Grant Stuttgart W1 expanded mint quota',
    votesFor: 5,
    votesTotal: DAO_MINT_QUORUM.total,
    status: 'approved',
    gatesMinting: true,
    relatedDid: 'did:voltus:plant:st1',
  },
  {
    id: 'prop-sw5-mint',
    title: 'Authorize Schweinfurt L5 batch minting',
    votesFor: 3,
    votesTotal: DAO_MINT_QUORUM.total,
    status: 'pending',
    gatesMinting: true,
    relatedDid: 'did:voltus:plant:sw5',
  },
  {
    id: 'prop-ham-onboard',
    title: 'Onboard Hamburg Assembly plant DID',
    votesFor: 1,
    votesTotal: DAO_MINT_QUORUM.total,
    status: 'pending',
    gatesMinting: true,
    relatedDid: 'did:voltus:plant:ham01',
  },
  {
    id: 'prop-nordsee-vc',
    title: 'Issue distributor VC to Nordsee Parts',
    votesFor: 4,
    votesTotal: DAO_MINT_QUORUM.total,
    status: 'approved',
    gatesMinting: false,
    relatedDid: 'did:voltus:dist:nordsee',
  },
  {
    id: 'prop-baltic-suspend',
    title: 'Suspend Baltic Motor Group DID',
    votesFor: 4,
    votesTotal: DAO_MINT_QUORUM.total,
    status: 'approved',
    gatesMinting: false,
    relatedDid: 'did:voltus:dist:baltic',
  },
  {
    id: 'prop-italia-review',
    title: 'Grey-market review — Italia Parts S.r.l.',
    votesFor: 2,
    votesTotal: DAO_MINT_QUORUM.total,
    status: 'pending',
    gatesMinting: false,
    relatedDid: 'did:voltus:dist:italia',
  },
  {
    id: 'prop-alpine-vc',
    title: 'Renew Alpine Workshop service credentials',
    votesFor: 5,
    votesTotal: DAO_MINT_QUORUM.total,
    status: 'approved',
    gatesMinting: false,
    relatedDid: 'did:voltus:service:alp01',
  },
  {
    id: 'prop-eastern-appeal',
    title: 'Eastern Motors reinstatement appeal',
    votesFor: 1,
    votesTotal: DAO_MINT_QUORUM.total,
    status: 'rejected',
    gatesMinting: false,
    relatedDid: 'did:voltus:dist:eastern',
  },
  {
    id: 'prop-mint-policy',
    title: 'Adopt mint policy v2.5 — quorum unchanged',
    votesFor: 3,
    votesTotal: DAO_MINT_QUORUM.total,
    status: 'pending',
    gatesMinting: false,
  },
];

export interface ProvenanceIdentityRow {
  did: string;
  name: string;
  role: IdentityRole;
  status: IdentityStatus;
  credentials: number;
}

export interface ContractRegistryInfo {
  contract: string;
  address: string;
  chain: string;
  version: string;
  anchoredCount: number;
  lastBlock: number;
  chainReachable: boolean;
}

export interface ProvenanceRuntimeState {
  runtimeIdentities: Identity[];
  statusOverrides: Record<string, IdentityStatus>;
  credentialOverrides: Record<string, number>;
  proposalStatusOverrides: Record<string, DaoProposalStatus>;
  mintGrantedDids: string[];
}

export function getMergedDaoProposals(
  proposalStatusOverrides: Record<string, DaoProposalStatus> = {},
): DaoProposal[] {
  return daoProposals.map((p) => ({
    ...p,
    status: proposalStatusOverrides[p.id] ?? p.status,
  }));
}

export function getProvenanceIdentities(state: Partial<ProvenanceRuntimeState> = {}): ProvenanceIdentityRow[] {
  const {
    runtimeIdentities = [],
    statusOverrides = {},
    credentialOverrides = {},
  } = state;
  const merged = [...identities, ...runtimeIdentities];
  return merged.map((id) => ({
    did: id.did,
    name: id.name,
    role: id.role,
    status: statusOverrides[id.did] ?? id.status,
    credentials: credentialOverrides[id.did] ?? id.credentials,
  }));
}

export function filterProvenanceIdentities(
  rows: ProvenanceIdentityRow[],
  filter: ProvenanceIdentityFilter,
): ProvenanceIdentityRow[] {
  switch (filter) {
    case 'plant':
      return rows.filter((r) => r.role === 'Plant');
    case 'distributor':
      return rows.filter((r) => r.role === 'Distributor');
    case 'service':
      return rows.filter((r) => r.role === 'Service');
    case 'active':
      return rows.filter((r) => r.status === 'active');
    case 'suspended':
      return rows.filter((r) => r.status === 'suspended');
    default:
      return rows;
  }
}

export function getContractRegistryInfo(runtimeBatchAnchors: RuntimeBatchAnchors = {}): ContractRegistryInfo {
  const anchored = getAnchoredBatches(runtimeBatchAnchors);
  const lastBlock = anchored.length
    ? Math.max(...anchored.map((b) => Number.parseInt(b.blockNumber, 10)))
    : Number.parseInt(batches.find((b) => b.blockNumber)?.blockNumber ?? String(ANCHOR_BLOCK_BASE), 10);
  return {
    contract: PROVENANCE_REGISTRY_CONTRACT,
    address: PROVENANCE_REGISTRY_ADDRESS,
    chain: VOLTUS_CHAIN_LABEL,
    version: PROVENANCE_REGISTRY_VERSION,
    anchoredCount: getAnchoredBatchCount(runtimeBatchAnchors),
    lastBlock,
    chainReachable: true,
  };
}

export function hasMintRightsForDid(
  did: string,
  state: Partial<ProvenanceRuntimeState> = {},
): boolean {
  const rows = getProvenanceIdentities(state);
  const identity = rows.find((r) => r.did === did);
  if (identity?.status === 'suspended') return false;

  const mintGranted = [...DEFAULT_MINT_AUTHORIZED_DIDS, ...(state.mintGrantedDids ?? [])];
  if (mintGranted.includes(did)) return true;

  const proposals = getMergedDaoProposals(state.proposalStatusOverrides);
  return proposals.some(
    (p) => p.gatesMinting && p.relatedDid === did && p.status === 'approved',
  );
}

export function buildRegistrationDid(type: 'plant' | 'distributor' | 'service', name: string): string {
  const prefix = type === 'plant' ? 'plant' : type === 'distributor' ? 'dist' : 'service';
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'org';
  const suffix = Math.random().toString(36).slice(2, 6);
  return `did:voltus:${prefix}:${slug}${suffix}`;
}

export function createRegistrationIdentity(
  type: 'plant' | 'distributor' | 'service',
  name: string,
  did: string,
): Identity {
  const roleMap: Record<typeof type, IdentityRole> = {
    plant: 'Plant',
    distributor: 'Distributor',
    service: 'Service',
  };
  return {
    did,
    name,
    role: roleMap[type],
    status: 'active',
    credentials: 0,
  };
}

export function getProvenanceRegistryKpis(
  state: Partial<ProvenanceRuntimeState> = {},
  runtimeBatchAnchors: RuntimeBatchAnchors = {},
) {
  const identityRows = getProvenanceIdentities(state);
  const proposals = getMergedDaoProposals(state.proposalStatusOverrides);
  const registry = getContractRegistryInfo(runtimeBatchAnchors);
  return {
    identityCount: identityRows.length,
    activeIdentities: identityRows.filter((r) => r.status === 'active').length,
    pendingProposals: proposals.filter((p) => p.status === 'pending').length,
    anchoredBatches: registry.anchoredCount,
  };
}

export function getQuote(id: string): Quote | undefined {
  return quotes.find((q) => q.id === id);
}

export function getAllScans(runtimeScans: Scan[] = []): Scan[] {
  return [...scans, ...runtimeScans];
}

export function getScansForCustomer(customerId: string, runtimeScans: Scan[] = []): Scan[] {
  return getAllScans(runtimeScans).filter((s) => s.customerId === customerId);
}

/** Field Verify demo scenarios — real Part + Batch from shared layer */
export const FIELD_VERIFY_VERIFIER_DID = 'did:voltus:am-scanner-07';

export const FIELD_VERIFY_GENUINE = {
  batchId: 'B-2026-04-K9',
  partId: 'p1',
  customerId: 'c3',
  unitSerial: 'SKF-6205-2RS-A41',
} as const;

export const FIELD_VERIFY_SUSPECT = {
  batchId: 'B-2026-02-H7',
  partId: 'p3',
  customerId: 'c8',
  unitSerial: 'NSK-6205-2Z-X99',
} as const;

export interface FieldVerifyContext {
  mode: 'genuine' | 'suspect';
  serial: string;
  part: Part;
  batch: Batch;
  customer: Customer;
  plant: string;
  mfgDate: string;
  merkleRoot: string;
  blockNumber: string;
  verifierDid: string;
  chainLabel: string;
}

export function getFieldVerifyContext(mode: 'genuine' | 'suspect'): FieldVerifyContext | null {
  const scenario = mode === 'genuine' ? FIELD_VERIFY_GENUINE : FIELD_VERIFY_SUSPECT;
  const part = getPart(scenario.partId);
  const batch = getBatch(scenario.batchId);
  const customer = getCustomer(scenario.customerId);
  if (!part || !batch || !customer) return null;

  const mfgDate = batch.mfgWindow.split('—').pop()?.trim() ?? batch.mfgWindow;

  return {
    mode,
    serial: scenario.unitSerial,
    part,
    batch,
    customer,
    plant: batch.plant,
    mfgDate,
    merkleRoot: batch.merkleRoot,
    blockNumber: batch.blockNumber,
    verifierDid: FIELD_VERIFY_VERIFIER_DID,
    chainLabel: 'Voltus Private Ethereum',
  };
}

export function createSuspectScanFromFieldVerify(
  ctx: FieldVerifyContext,
  id?: string,
): Scan {
  return {
    id: id ?? `scan-field-${Date.now()}`,
    partId: ctx.part.id,
    batchId: ctx.batch.id,
    customerId: ctx.customer.id,
    geo: {
      lat: ctx.customer.region === 'Eastern EU' ? 52.23 : 48.14,
      lng: ctx.customer.region === 'Eastern EU' ? 21.01 : 11.58,
      region: ctx.customer.region,
    },
    result: 'suspect',
    verifierDid: ctx.verifierDid,
    timestamp: new Date().toISOString(),
  };
}

export function getInstallBaseForCustomer(customerId: string): InstallBaseUnit[] {
  return installBaseUnits.filter((u) => u.customerId === customerId);
}

// ─── Install-Base Census selectors ─────────────────────────────────────────

export type InstallBaseWindowFilter = 'all' | '90d' | '12mo';
export type InstallBaseGroupBy = 'customer' | 'part';

export interface InstallBaseCensusFilters {
  partId?: string;
  region?: string;
  window?: InstallBaseWindowFilter;
}

function installBaseUnitAgeMonths(unit: InstallBaseUnit, asOf = DASHBOARD_AS_OF): number {
  const installed = new Date(unit.installedAt);
  return Math.max(0, Math.round((asOf.getTime() - installed.getTime()) / (30.44 * 24 * 60 * 60 * 1000)));
}

function unitMatchesReplacementWindow(unit: InstallBaseUnit, window: InstallBaseWindowFilter): boolean {
  if (window === 'all') return true;
  if (!unit.predictedReplacementWindow) return false;
  const due = new Date(unit.predictedReplacementWindow).getTime();
  const asOf = DASHBOARD_AS_OF.getTime();
  const horizonMs = window === '90d' ? 90 : 365;
  const horizon = asOf + horizonMs * 24 * 60 * 60 * 1000;
  return due >= asOf && due <= horizon;
}

export function filterInstallBaseUnits(
  filters: InstallBaseCensusFilters = {},
  runtimeScans: Scan[] = [],
): InstallBaseUnit[] {
  const scanCustomerIdsByRegion = filters.region
    ? new Set(
        getAllScans(runtimeScans)
          .filter((s) => s.geo.region === filters.region)
          .map((s) => s.customerId),
      )
    : null;

  return installBaseUnits.filter((unit) => {
    if (filters.partId && unit.partId !== filters.partId) return false;
    const customer = getCustomer(unit.customerId);
    if (filters.region) {
      const inCustomerRegion = customer?.region === filters.region;
      const inScanRegion = scanCustomerIdsByRegion?.has(unit.customerId);
      if (!inCustomerRegion && !inScanRegion) return false;
    }
    if (!unitMatchesReplacementWindow(unit, filters.window ?? 'all')) return false;
    return true;
  });
}

export function getInstallBaseKpis(filters: InstallBaseCensusFilters = {}, runtimeScans: Scan[] = []) {
  const units = filterInstallBaseUnits(filters, runtimeScans);
  const verified = units.filter((u) => u.lastScanAt !== null).length;
  const horizon90 = DASHBOARD_AS_OF.getTime() + 90 * 24 * 60 * 60 * 1000;
  const due90 = units.filter((u) => {
    if (!u.predictedReplacementWindow) return false;
    const due = new Date(u.predictedReplacementWindow).getTime();
    return due >= DASHBOARD_AS_OF.getTime() && due <= horizon90;
  }).length;
  const ages = units.map((u) => installBaseUnitAgeMonths(u));
  const avgAge = ages.length ? ages.reduce((s, a) => s + a, 0) / ages.length : 0;
  return {
    unitsActive: units.length,
    unitsVerified: verified,
    unitsDue90Days: due90,
    avgAgeMonths: Math.round(avgAge * 10) / 10,
    verifyRate: units.length ? Math.round((verified / units.length) * 1000) / 10 : 0,
  };
}

export function getInstallBaseAgeDistribution(
  filters: InstallBaseCensusFilters = {},
  runtimeScans: Scan[] = [],
): { bucket: string; count: number }[] {
  const units = filterInstallBaseUnits(filters, runtimeScans);
  const buckets = [
    { bucket: '0–12 mo', min: 0, max: 12 },
    { bucket: '13–24 mo', min: 13, max: 24 },
    { bucket: '25–36 mo', min: 25, max: 36 },
    { bucket: '37+ mo', min: 37, max: Infinity },
  ];
  return buckets.map(({ bucket, min, max }) => ({
    bucket,
    count: units.filter((u) => {
      const age = installBaseUnitAgeMonths(u);
      return age >= min && age <= max;
    }).length,
  }));
}

export function getInstallBaseRegionalDeployment(
  filters: InstallBaseCensusFilters = {},
  runtimeScans: Scan[] = [],
): { region: string; scans: number }[] {
  const units = filterInstallBaseUnits(filters, runtimeScans);
  const customerIds = new Set(units.map((u) => u.customerId));
  const partIds = new Set(units.map((u) => u.partId));

  const byRegion = new Map<string, number>();
  for (const scan of getAllScans(runtimeScans)) {
    if (!customerIds.has(scan.customerId) && !partIds.has(scan.partId)) continue;
    if (filters.region) {
      const custRegion = getCustomer(scan.customerId)?.region;
      if (scan.geo.region !== filters.region && custRegion !== filters.region) continue;
    }
    if (filters.partId && scan.partId !== filters.partId) continue;
    byRegion.set(scan.geo.region, (byRegion.get(scan.geo.region) ?? 0) + 1);
  }

  return Array.from(byRegion.entries())
    .map(([region, scans]) => ({ region, scans }))
    .sort((a, b) => b.scans - a.scans);
}

function medianReplacementDate(dates: string[]): string | null {
  if (dates.length === 0) return null;
  const sorted = [...dates].sort();
  return sorted[Math.floor(sorted.length / 2)];
}

export interface InstallBaseCensusRow {
  id: string;
  customerId: string;
  partId?: string;
  label: string;
  subtitle?: string;
  unitsActive: number;
  unitsVerified: number;
  lastScanAt: string | null;
  replacementWindowP50: string | null;
  insufficientHistory: boolean;
}

export function getInstallBaseCensusRows(
  filters: InstallBaseCensusFilters = {},
  groupBy: InstallBaseGroupBy = 'customer',
  runtimeScans: Scan[] = [],
): InstallBaseCensusRow[] {
  const units = filterInstallBaseUnits(filters, runtimeScans);

  if (groupBy === 'customer') {
    const byCustomer = new Map<string, InstallBaseUnit[]>();
    for (const unit of units) {
      const list = byCustomer.get(unit.customerId) ?? [];
      list.push(unit);
      byCustomer.set(unit.customerId, list);
    }
    return Array.from(byCustomer.entries())
      .map(([customerId, group]) => {
        const customer = getCustomer(customerId);
        const verified = group.filter((u) => u.lastScanAt).length;
        const lastScans = group.map((u) => u.lastScanAt).filter(Boolean) as string[];
        const windows = group.map((u) => u.predictedReplacementWindow).filter(Boolean) as string[];
        const insufficient = customer?.dataSparse === true || windows.length === 0;
        return {
          id: customerId,
          customerId,
          label: customer?.name ?? customerId,
          subtitle: customer?.region,
          unitsActive: group.length,
          unitsVerified: verified,
          lastScanAt: lastScans.length ? lastScans.sort().reverse()[0] : null,
          replacementWindowP50: insufficient ? null : medianReplacementDate(windows),
          insufficientHistory: insufficient,
        };
      })
      .sort((a, b) => b.unitsActive - a.unitsActive);
  }

  const byPart = new Map<string, InstallBaseUnit[]>();
  for (const unit of units) {
    const list = byPart.get(unit.partId) ?? [];
    list.push(unit);
    byPart.set(unit.partId, list);
  }
  return Array.from(byPart.entries())
    .map(([partId, group]) => {
      const part = getPart(partId);
      const custCounts = new Map<string, number>();
      for (const u of group) custCounts.set(u.customerId, (custCounts.get(u.customerId) ?? 0) + 1);
      const customerId = [...custCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? group[0].customerId;
      const verified = group.filter((u) => u.lastScanAt).length;
      const lastScans = group.map((u) => u.lastScanAt).filter(Boolean) as string[];
      const windows = group.map((u) => u.predictedReplacementWindow).filter(Boolean) as string[];
      const allSparse = group.every((u) => getCustomer(u.customerId)?.dataSparse);
      return {
        id: partId,
        customerId,
        partId,
        label: part?.sku ?? partId,
        subtitle: part?.name,
        unitsActive: group.length,
        unitsVerified: verified,
        lastScanAt: lastScans.length ? lastScans.sort().reverse()[0] : null,
        replacementWindowP50: allSparse || windows.length === 0 ? null : medianReplacementDate(windows),
        insufficientHistory: allSparse || windows.length === 0,
      };
    })
    .sort((a, b) => b.unitsActive - a.unitsActive);
}

export function getInstallBaseRegions(): string[] {
  return [...new Set(customers.map((c) => c.region))].sort();
}

export function getRecommendationsForCustomer(customerId: string): Recommendation[] {
  return recommendations.filter((r) => r.customerId === customerId);
}

export function getRecommendationsRanked(): Recommendation[] {
  return [...recommendations].sort((a, b) => b.priority - a.priority);
}

// ─── Seller Worklist selectors ─────────────────────────────────────────────

const HIGH_CHURN_WORKLIST_THRESHOLD = 50;

export function getWorklistKpis() {
  return {
    highRiskAccounts: customers.filter((c) => c.churnRisk >= HIGH_CHURN_WORKLIST_THRESHOLD).length,
    unitsDueReplacement: getUnitsDueForReplacement90Days(),
    openOpportunities: recommendations.length,
    quotesAwaitingFollowUp: quotes.filter((q) => q.status === 'draft' || q.status === 'sent').length,
  };
}

export interface WorklistRow {
  id: string;
  customerId: string;
  customerName: string;
  partId: string;
  partSku: string;
  partName: string;
  estValue: number;
  winProbability: number;
  churnRisk: number;
  priority: number;
  reason: string;
  signals: SignalType[];
  installBaseSummary: string;
  dataSparse: boolean;
}

export function getWorklistRows(): WorklistRow[] {
  return getRecommendationsRanked().map((rec) => {
    const customer = getCustomer(rec.customerId);
    const part = getPart(rec.partId);
    const ibUnits = getInstallBaseForCustomer(rec.customerId);
    const verified = ibUnits.filter((u) => u.lastScanAt).length;
    const due = getReplacementDueCountForCustomer(rec.customerId);
    const sparse = customer?.dataSparse === true;

    const installBaseSummary = sparse
      ? 'Data-sparse account — limited install-base and scan history'
      : `${ibUnits.length} install-base units · ${verified} verified · ${due} due ≤90 days`;

    return {
      id: rec.id,
      customerId: rec.customerId,
      customerName: customer?.name ?? rec.customerId,
      partId: rec.partId,
      partSku: part?.sku ?? rec.partId,
      partName: part?.name ?? '',
      estValue: rec.estValue,
      winProbability: rec.winProbability,
      churnRisk: customer?.churnRisk ?? 0,
      priority: rec.priority,
      reason: rec.reason,
      signals: rec.signals,
      installBaseSummary,
      dataSparse: sparse,
    };
  });
}

export type WorklistSortKey = 'priority' | 'churn' | 'value' | 'win';

export function sortWorklistRows(rows: WorklistRow[], sortBy: WorklistSortKey): WorklistRow[] {
  const sorted = [...rows];
  switch (sortBy) {
    case 'churn':
      return sorted.sort((a, b) => b.churnRisk - a.churnRisk);
    case 'value':
      return sorted.sort((a, b) => b.estValue - a.estValue);
    case 'win':
      return sorted.sort((a, b) => b.winProbability - a.winProbability);
    default:
      return sorted.sort((a, b) => b.priority - a.priority);
  }
}

export function getQuotesForCustomer(customerId: string): Quote[] {
  return quotes.filter((q) => q.customerId === customerId);
}

// ─── Quote Workbench selectors ───────────────────────────────────────────────

export type WriteBackMode = 'recommend' | 'draft-sap' | 'closed-loop';

export const WRITE_BACK_MODE_LABELS: Record<WriteBackMode, string> = {
  recommend: 'Copy to clipboard',
  'draft-sap': 'Create draft in SAP',
  'closed-loop': 'Create & release in SAP',
};

export const DEFAULT_QUOTE_ID = 'Q-2026-0847';

export interface QuoteWorkbenchLine {
  lineKey: string;
  partId: string;
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
  margin: number;
  sapListPrice: number;
  sapConditionPrice: number;
  guidedPrice: number;
  winProbDelta: number;
  aiDrafted: boolean;
}

export interface QuoteWorkbenchState {
  quoteId: string;
  customer: Customer;
  status: QuoteStatus;
  lines: QuoteWorkbenchLine[];
  winProbability: number;
  turnaroundDays: number;
  validUntil: string;
  preloadedFrom?: string;
  recommendationReason?: string;
  stalledNudge?: string;
}

export function getRecommendationForPair(customerId: string, partId: string): Recommendation | undefined {
  return recommendations.find((r) => r.customerId === customerId && r.partId === partId);
}

function suggestQtyFromRecommendation(rec: Recommendation, part: Part): number {
  return Math.max(12, Math.round(rec.estValue / part.unitPrice / 12) * 12);
}

function computeGuidedPrice(part: Part, margin: number): number {
  return Math.round(part.listPrice * (1 - margin) * 100) / 100;
}

function enrichQuoteLine(line: QuoteLineItem, aiDrafted: boolean): QuoteWorkbenchLine | null {
  const part = getPart(line.partId);
  if (!part) return null;
  const guidedPrice = computeGuidedPrice(part, line.margin);
  const winProbDelta =
    line.unitPrice > guidedPrice
      ? Math.min(8, Math.round(((line.unitPrice - guidedPrice) / part.listPrice) * 40))
      : 0;
  return {
    lineKey: `${line.partId}-${line.qty}`,
    partId: line.partId,
    sku: part.sku,
    name: part.name,
    qty: line.qty,
    unitPrice: line.unitPrice,
    margin: line.margin,
    sapListPrice: part.listPrice,
    sapConditionPrice: part.unitPrice,
    guidedPrice,
    winProbDelta,
    aiDrafted,
  };
}

function seedLineFromRecommendation(rec: Recommendation): QuoteWorkbenchLine | null {
  const part = getPart(rec.partId);
  if (!part) return null;
  const margin = 0.11;
  const qty = suggestQtyFromRecommendation(rec, part);
  const guidedPrice = computeGuidedPrice(part, margin);
  return {
    lineKey: `seed-${rec.partId}`,
    partId: rec.partId,
    sku: part.sku,
    name: part.name,
    qty,
    unitPrice: guidedPrice,
    margin,
    sapListPrice: part.listPrice,
    sapConditionPrice: part.unitPrice,
    guidedPrice,
    winProbDelta: 0,
    aiDrafted: true,
  };
}

export function buildQuoteWorkbenchState(ctx: {
  quoteId?: string;
  customerId?: string;
  partId?: string;
  from?: string;
}): QuoteWorkbenchState | null {
  const quoteId = ctx.quoteId ?? DEFAULT_QUOTE_ID;
  const baseQuote = getQuote(quoteId);
  const customerId = ctx.customerId ?? baseQuote?.customerId ?? 'c3';
  const customer = getCustomer(customerId);
  if (!customer) return null;

  const rec =
    ctx.partId
      ? getRecommendationForPair(customerId, ctx.partId)
      : getRecommendationsForCustomer(customerId).sort((a, b) => b.priority - a.priority)[0];

  let lines: QuoteWorkbenchLine[] = [];
  let status: QuoteStatus = 'draft';
  let winProbability = customer.winProbability;
  let turnaroundDays = 2.3;

  if (ctx.partId && rec) {
    const seed = seedLineFromRecommendation(rec);
    if (seed) lines.push(seed);
    const customerQuote = getQuotesForCustomer(customerId).find((q) => q.status === 'draft') ?? getQuote(quoteId);
    if (customerQuote && customerQuote.customerId === customerId) {
      status = customerQuote.status;
      winProbability = customerQuote.winProbability;
      turnaroundDays = customerQuote.turnaroundDays;
      for (const li of customerQuote.lineItems) {
        if (li.partId !== ctx.partId) {
          const row = enrichQuoteLine(li, customerQuote.createdBy === 'agent');
          if (row) lines.push(row);
        }
      }
    } else {
      winProbability = rec.winProbability;
      turnaroundDays = 2.3;
    }
  } else if (baseQuote && baseQuote.customerId === customerId) {
    lines = baseQuote.lineItems
      .map((li, i) => enrichQuoteLine(li, baseQuote.createdBy === 'agent' && i < 3))
      .filter((r): r is QuoteWorkbenchLine => r !== null);
    status = baseQuote.status;
    winProbability = baseQuote.winProbability;
    turnaroundDays = baseQuote.turnaroundDays;
  } else {
    const customerQuote = getQuotesForCustomer(customerId).find((q) => q.status === 'draft');
    if (customerQuote) {
      lines = customerQuote.lineItems
        .map((li, i) => enrichQuoteLine(li, customerQuote.createdBy === 'agent' && i < 3))
        .filter((r): r is QuoteWorkbenchLine => r !== null);
      status = customerQuote.status;
      winProbability = customerQuote.winProbability;
      turnaroundDays = customerQuote.turnaroundDays;
    } else if (rec) {
      const seed = seedLineFromRecommendation(rec);
      if (seed) lines.push(seed);
      winProbability = rec.winProbability;
    }
  }

  if (lines.length === 0) return null;

  const validUntil = new Date(DASHBOARD_AS_OF);
  validUntil.setDate(validUntil.getDate() + 25);

  let stalledNudge: string | undefined;
  if (status === 'sent' && turnaroundDays >= 3) {
    stalledNudge = `Quote open ${turnaroundDays}+ days — nudge ${customer.name} before win probability decays`;
  } else if (status === 'draft' && ctx.from) {
    stalledNudge = `Preloaded from ${ctx.from.replace(/-/g, ' ')} — review guided pricing before release`;
  }

  return {
    quoteId,
    customer,
    status,
    lines,
    winProbability,
    turnaroundDays,
    validUntil: validUntil.toISOString().slice(0, 10),
    preloadedFrom: ctx.from,
    recommendationReason: rec?.reason,
    stalledNudge,
  };
}

export interface WinProbabilityTrendPoint {
  label: string;
  probability: number;
  event?: string;
}

export interface WinProbabilityFactor {
  key: string;
  label: string;
  score: number;
}

/** Seven-day win-probability trajectory for the quote workbench chart */
export function getWinProbabilityTrend(
  state: QuoteWorkbenchState,
  currentWin: number,
): WinProbabilityTrendPoint[] {
  const start = Math.max(18, currentWin - 22);
  const mid = Math.round((start + currentWin) / 2);
  const guidedBoost = state.lines.some((l) => Math.abs(l.unitPrice - l.guidedPrice) < 0.01) ? 6 : 0;

  return [
    { label: 'Day 1', probability: start, event: 'Draft opened' },
    { label: 'Day 2', probability: start + 3 },
    { label: 'Day 3', probability: start + 5, event: 'AI lines added' },
    { label: 'Day 4', probability: mid - 2 },
    { label: 'Day 5', probability: mid + 2 },
    { label: 'Day 6', probability: currentWin - guidedBoost - 4, event: guidedBoost ? 'Pricing tuned' : undefined },
    { label: 'Now', probability: currentWin, event: 'Current score' },
  ];
}

export function getWinProbabilityFactors(
  state: QuoteWorkbenchState,
  currentWin: number,
): WinProbabilityFactor[] {
  const guidedLines = state.lines.filter((l) => Math.abs(l.unitPrice - l.guidedPrice) < 0.01).length;
  const guidedScore = state.lines.length
    ? Math.round((guidedLines / state.lines.length) * 92)
    : 50;
  const segmentScore =
    state.customer.segment === 'OEM Direct'
      ? 88
      : state.customer.segment === 'Distributor'
        ? 76
        : state.customer.segment === 'Fleet'
          ? 68
          : 72;
  const churnHeadroom = Math.max(12, 100 - state.customer.churnRisk);
  const historyScore = Math.min(95, Math.round(currentWin * 0.35 + state.customer.winProbability * 0.25));

  return [
    { key: 'pricing', label: 'Guided pricing', score: guidedScore },
    { key: 'segment', label: 'Segment fit', score: segmentScore },
    { key: 'churn', label: 'Churn headroom', score: churnHeadroom },
    { key: 'history', label: 'Account history', score: historyScore },
  ];
}

export function getWinProbabilityExplanation(state: QuoteWorkbenchState): {
  text: string;
  attributions: string[];
} {
  const drivers = state.customer.churnDrivers.length
    ? state.customer.churnDrivers.join('; ')
    : 'stable account history and on-time payment';
  return {
    text: `${state.winProbability}% reflects guided pricing vs SAP list, ${state.customer.segment.toLowerCase()} segment fit, and churn risk ${state.customer.churnRisk}%. Drivers: ${drivers}.`,
    attributions: ['model__win_probability', 'model__guided_pricing', 'model__churn_risk', 'sap__condition_price'],
  };
}

export function createQuoteReleaseDecisionTrace(
  mode: WriteBackMode,
  state: QuoteWorkbenchState,
): DecisionTrace {
  const total = state.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const action =
    mode === 'closed-loop'
      ? 'Released quote to SAP (closed-loop)'
      : mode === 'draft-sap'
        ? 'Created SAP quote draft'
        : 'Exported quote recommendation';
  const ruleApplied =
    mode === 'closed-loop'
      ? 'sap__quote_release'
      : mode === 'draft-sap'
        ? 'sap__quote_create'
        : 'model__quote_recommend';
  const outcome =
    mode === 'closed-loop'
      ? `Quote ${state.quoteId} released — ${formatEurAccount(total)} · win ${state.winProbability}%`
      : mode === 'draft-sap'
        ? `Draft ${state.quoteId} staged in SAP SD — ${state.lines.length} lines`
        : `Recommendation exported for ${state.customer.name}`;

  return {
    id: `dt-quote-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: 'user:workbench',
    action,
    inputs: `quote=${state.quoteId}, customer=${state.customer.id}, mode=${mode}, lines=${state.lines.length}`,
    ruleApplied,
    outcome,
  };
}

// ─── Account Intelligence Wiki selectors ─────────────────────────────────────

export function formatEurAccount(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${Math.round(value / 1_000).toLocaleString()}K`;
  return `€${value.toLocaleString()}`;
}

export function getReplacementDueCountForCustomer(customerId: string): number {
  const horizon = DASHBOARD_AS_OF.getTime() + 90 * 24 * 60 * 60 * 1000;
  return getInstallBaseForCustomer(customerId).filter((unit) => {
    if (!unit.predictedReplacementWindow) return false;
    const due = new Date(unit.predictedReplacementWindow).getTime();
    return due >= DASHBOARD_AS_OF.getTime() && due <= horizon;
  }).length;
}

export interface AccountInstallBaseRow {
  id: string;
  partSku: string;
  partName: string;
  installedAt: string;
  lastScanAt: string | null;
  replacementWindow: string | null;
  insufficientHistory: boolean;
}

export function getAccountInstallBaseRows(customerId: string): AccountInstallBaseRow[] {
  const customer = getCustomer(customerId);
  const sparse = customer?.dataSparse === true;
  return getInstallBaseForCustomer(customerId).map((unit) => {
    const part = getPart(unit.partId);
    return {
      id: unit.id,
      partSku: part?.sku ?? unit.partId,
      partName: part?.name ?? '',
      installedAt: unit.installedAt,
      lastScanAt: unit.lastScanAt,
      replacementWindow: unit.predictedReplacementWindow,
      insufficientHistory: sparse || !unit.predictedReplacementWindow,
    };
  });
}

export interface AccountTimelineEvent {
  id: string;
  timestamp: string;
  type: 'order' | 'scan' | 'service' | 'dispute';
  title: string;
  detail: string;
}

export function getAccountTimeline(customerId: string, runtimeScans: Scan[] = []): AccountTimelineEvent[] {
  const events: AccountTimelineEvent[] = [];
  const customer = getCustomer(customerId);

  getQuotesForCustomer(customerId).forEach((quote, i) => {
    const d = new Date(DASHBOARD_AS_OF);
    d.setDate(d.getDate() - i * 12);
    const parts = quote.lineItems.map((li) => getPart(li.partId)?.sku ?? li.partId).join(', ');
    events.push({
      id: `quote-${quote.id}`,
      timestamp: d.toISOString(),
      type: 'order',
      title: `Quote ${quote.id} · ${quote.status}`,
      detail: `${quote.lineItems.length} lines (${parts}) · ${quote.winProbability}% win prob`,
    });
  });

  for (const scan of getScansForCustomer(customerId, runtimeScans)) {
    const part = getPart(scan.partId);
    events.push({
      id: scan.id,
      timestamp: scan.timestamp,
      type: 'scan',
      title: `Field scan · ${part?.sku ?? scan.partId}`,
      detail: `${scan.result === 'genuine' ? 'Verified genuine' : 'Suspect — channel integrity'} · ${scan.geo.region}`,
    });
  }

  for (const trace of decisionTraces.filter((t) => t.inputs.includes(`customer=${customerId}`))) {
    events.push({
      id: trace.id,
      timestamp: trace.timestamp,
      type: 'service',
      title: trace.action,
      detail: `${trace.ruleApplied} → ${trace.outcome}`,
    });
  }

  for (let i = 0; i < (customer?.openDisputes ?? 0); i++) {
    const d = new Date(DASHBOARD_AS_OF);
    d.setDate(d.getDate() - (i + 1) * 18);
    events.push({
      id: `dispute-${customerId}-${i}`,
      timestamp: d.toISOString(),
      type: 'dispute',
      title: 'Open channel dispute',
      detail: `Dispute ${i + 1} of ${customer?.openDisputes} — pending resolution`,
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function buildAccountNarrative(
  customer: Customer,
  customerId: string,
  runtimeScans: Scan[] = [],
): { paragraph1: string; paragraph2: string; attributions: string[] } {
  const scans = getScansForCustomer(customerId, runtimeScans);
  const suspectCount = scans.filter((s) => s.result === 'suspect').length;
  const replacementDue = getReplacementDueCountForCustomer(customerId);
  const topRec = getRecommendationsForCustomer(customerId).sort((a, b) => b.priority - a.priority)[0];
  const topPart = topRec ? getPart(topRec.partId) : undefined;

  if (customer.dataSparse) {
    return {
      paragraph1: `${customer.name} is a recently onboarded ${customer.segment.toLowerCase()} account in ${customer.region}, first seen ${customer.firstSeen}. With only ${customer.unitsActive} active units and limited scan history, the install-base census remains data-sparse — replacement windows cannot yet be forecast with confidence.`,
      paragraph2: `Lifetime value stands at ${formatEurAccount(customer.lifetimeValue)} with ${customer.winProbability}% modeled win probability. Prioritize baseline scanning and install-base enrichment before aggressive cross-sell; onboarding signals suggest monitoring for the first genuine verification events.`,
      attributions: ['model__onboarding', 'ib__unit_count', 'prov__scan_events'],
    };
  }

  const driverText =
    customer.churnDrivers.length > 0
      ? `Churn drivers include ${customer.churnDrivers.join(', ').toLowerCase()}.`
      : 'No active churn drivers flagged in the current model window.';

  const scanText =
    suspectCount > 0
      ? `${suspectCount} suspect scan${suspectCount > 1 ? 's' : ''} near this account's channel warrant integrity review.`
      : `Field scan activity is healthy with ${scans.filter((s) => s.result === 'genuine').length} genuine verifications on record.`;

  const recText = topPart
    ? `Top next-best-part signal: ${topPart.sku} (${topRec?.reason ?? 'replacement opportunity'}).`
    : 'No ranked next-best-part recommendations at this time.';

  return {
    paragraph1: `${customer.name} operates as a ${customer.segment.toLowerCase()} in ${customer.region} with ${customer.unitsActive.toLocaleString()} active units and ${formatEurAccount(customer.lifetimeValue)} lifetime value since ${customer.firstSeen}. ${driverText}`,
    paragraph2: `${scanText} ${replacementDue} unit${replacementDue !== 1 ? 's' : ''} due for replacement within 90 days. ${recText}`,
    attributions: ['model__account_wiki', 'model__churn_risk', 'ib__install_base', 'prov__scan_events'],
  };
}

/** Demo switcher set: rich accounts + data-sparse pair */
export const ACCOUNT_WIKI_SWITCHER_IDS = ['c3', 'c8', 'c1', 'c11', 'c12'] as const;

export function buildChannelAlerts(allScans: Scan[]): ChannelAlert[] {
  const suspectByRegion = new Map<string, { count: number; customerIds: Set<string> }>();
  for (const scan of allScans.filter((s) => s.result === 'suspect')) {
    const region = scan.geo.region;
    const entry = suspectByRegion.get(region) ?? { count: 0, customerIds: new Set() };
    entry.count++;
    entry.customerIds.add(scan.customerId);
    suspectByRegion.set(region, entry);
  }
  return Array.from(suspectByRegion.entries())
    .filter(([, v]) => v.count >= 2)
    .map(([region, v]) => ({
      region,
      suspectCount: v.count,
      customerIds: Array.from(v.customerIds),
      severity: v.count >= 5 ? 'critical' as const : 'warning' as const,
      message: `${v.count} suspect scans clustered in ${region}`,
    }))
    .sort((a, b) => b.suspectCount - a.suspectCount);
}

export function getChannelAlerts(runtimeScans: Scan[] = []): ChannelAlert[] {
  return buildChannelAlerts(getAllScans(runtimeScans));
}

export function getChannelAlertCount(runtimeScans: Scan[] = []): number {
  const regionalAlerts = getChannelAlerts(runtimeScans).length;
  const fieldRaised = runtimeScans.filter((s) => s.result === 'suspect').length;
  return regionalAlerts + fieldRaised;
}

export interface ChannelMapAlertRow {
  id: string;
  type: 'fail-cluster' | 'out-of-region' | 'field-raised';
  location: string;
  customerId: string;
  distributor: string;
  count: number;
  severity: 'high' | 'medium' | 'low';
  firstSeen: string;
  lastSeen: string;
  scanIds: string[];
  focusRegion: string;
}

export const CHANNEL_MAP_REGION_LAYOUT: Record<
  string,
  { x: number; y: number; hub: string; label: string }
> = {
  DACH: { x: 210, y: 132, hub: 'Stuttgart', label: 'DACH' },
  'Western EU': { x: 158, y: 168, hub: 'Lyon', label: 'Western EU' },
  'Southern EU': { x: 212, y: 228, hub: 'Milan', label: 'Southern EU' },
  'Eastern EU': { x: 288, y: 118, hub: 'Warsaw', label: 'Eastern EU' },
  'Northern EU': { x: 178, y: 88, hub: 'Copenhagen', label: 'Northern EU' },
};

export function getOutOfRegionScans(runtimeScans: Scan[] = []): Scan[] {
  return getAllScans(runtimeScans).filter((scan) => {
    const customer = getCustomer(scan.customerId);
    return Boolean(customer && customer.region !== scan.geo.region);
  });
}

function primaryCustomerFromScans(regionScans: Scan[]): string {
  const counts = new Map<string, number>();
  for (const scan of regionScans) {
    counts.set(scan.customerId, (counts.get(scan.customerId) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? regionScans[0]?.customerId ?? '';
}

/** Alert feed for Channel Integrity Map — from getChannelAlerts + out-of-region + field raises */
export function getChannelMapAlerts(runtimeScans: Scan[] = []): ChannelMapAlertRow[] {
  const allScans = getAllScans(runtimeScans);
  const items: ChannelMapAlertRow[] = [];

  for (const scan of runtimeScans.filter((s) => s.result === 'suspect')) {
    const customer = getCustomer(scan.customerId);
    items.push({
      id: scan.id,
      type: 'field-raised',
      location: scan.geo.region,
      customerId: scan.customerId,
      distributor: customer?.name ?? 'Unknown distributor',
      count: 1,
      severity: 'high',
      firstSeen: scan.timestamp,
      lastSeen: scan.timestamp,
      scanIds: [scan.id],
      focusRegion: scan.geo.region,
    });
  }

  for (const alert of getChannelAlerts(runtimeScans)) {
    const regionScans = allScans.filter((s) => s.result === 'suspect' && s.geo.region === alert.region);
    const timestamps = regionScans.map((s) => s.timestamp).sort();
    const customerId = primaryCustomerFromScans(regionScans);
    const customer = getCustomer(customerId);
    items.push({
      id: `region-${alert.region}`,
      type: 'fail-cluster',
      location: alert.region,
      customerId,
      distributor:
        customer?.name ??
        alert.customerIds.map((id) => getCustomer(id)?.name).filter(Boolean).join(' · ') ??
        'Multiple distributors',
      count: alert.suspectCount,
      severity: alert.severity === 'critical' ? 'high' : 'medium',
      firstSeen: timestamps[0] ?? '',
      lastSeen: timestamps[timestamps.length - 1] ?? '',
      scanIds: regionScans.map((s) => s.id),
      focusRegion: alert.region,
    });
  }

  const oorByCustomer = new Map<string, Scan[]>();
  for (const scan of getOutOfRegionScans(runtimeScans)) {
    const list = oorByCustomer.get(scan.customerId) ?? [];
    list.push(scan);
    oorByCustomer.set(scan.customerId, list);
  }
  for (const [customerId, group] of oorByCustomer) {
    const timestamps = group.map((s) => s.timestamp).sort();
    const customer = getCustomer(customerId);
    items.push({
      id: `oor-${customerId}`,
      type: 'out-of-region',
      location: group[0].geo.region,
      customerId,
      distributor: customer?.name ?? customerId,
      count: group.length,
      severity: group.length >= 3 ? 'medium' : 'low',
      firstSeen: timestamps[0],
      lastSeen: timestamps[timestamps.length - 1],
      scanIds: group.map((s) => s.id),
      focusRegion: group[0].geo.region,
    });
  }

  const severityRank = { high: 0, medium: 1, low: 2 };
  return items.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || b.count - a.count);
}

export interface ChannelMapRegionHeat {
  region: string;
  x: number;
  y: number;
  hub: string;
  totalScans: number;
  genuineCount: number;
  suspectCount: number;
  oorCount: number;
  status: 'ok' | 'warning' | 'fail';
}

export interface ChannelMapPin {
  id: string;
  x: number;
  y: number;
  type: 'genuine' | 'fail-cluster' | 'out-of-region';
  region: string;
  label: string;
  alertId?: string;
}

export function getChannelMapRegionHeats(runtimeScans: Scan[] = []): ChannelMapRegionHeat[] {
  const allScans = getAllScans(runtimeScans);
  const oorIds = new Set(getOutOfRegionScans(runtimeScans).map((s) => s.id));

  return Object.entries(CHANNEL_MAP_REGION_LAYOUT).map(([region, layout]) => {
    const regionScans = allScans.filter((s) => s.geo.region === region);
    const suspectCount = regionScans.filter((s) => s.result === 'suspect').length;
    const oorCount = regionScans.filter((s) => oorIds.has(s.id)).length;
    const status: ChannelMapRegionHeat['status'] =
      suspectCount >= 2 ? 'fail' : oorCount > 0 ? 'warning' : 'ok';
    return {
      region,
      x: layout.x,
      y: layout.y,
      hub: layout.hub,
      totalScans: regionScans.length,
      genuineCount: regionScans.filter((s) => s.result === 'genuine').length,
      suspectCount,
      oorCount,
      status,
    };
  });
}

export function getChannelMapPins(
  runtimeScans: Scan[] = [],
  focusAlertId?: string | null,
): ChannelMapPin[] {
  const pins: ChannelMapPin[] = [];
  const alerts = getChannelMapAlerts(runtimeScans);

  for (const alert of alerts) {
    const layout = CHANNEL_MAP_REGION_LAYOUT[alert.focusRegion];
    if (!layout) continue;
    const offset = alert.type === 'out-of-region' ? { x: 12, y: -8 } : { x: 0, y: 0 };
    pins.push({
      id: `pin-${alert.id}`,
      x: layout.x + offset.x,
      y: layout.y + offset.y,
      type: alert.type === 'out-of-region' ? 'out-of-region' : 'fail-cluster',
      region: alert.focusRegion,
      label: alert.distributor,
      alertId: alert.id,
    });
  }

  if (!focusAlertId) {
    for (const [region, layout] of Object.entries(CHANNEL_MAP_REGION_LAYOUT)) {
      const hasAlert = alerts.some((a) => a.focusRegion === region);
      if (!hasAlert) {
        pins.push({
          id: `pin-genuine-${region}`,
          x: layout.x,
          y: layout.y,
          type: 'genuine',
          region,
          label: layout.label,
        });
      }
    }
  }

  return pins;
}

export function getChannelMapKpis(runtimeScans: Scan[] = []) {
  const allScans = getAllScans(runtimeScans);
  const alerts = getChannelMapAlerts(runtimeScans);
  const distributorIds = new Set(alerts.map((a) => a.customerId));
  const health = getChannelHealth(runtimeScans);
  return {
    totalScans: allScans.length,
    failRate: health.failRate,
    outOfRegionCount: getOutOfRegionScans(runtimeScans).length,
    distributorsWithAlerts: distributorIds.size,
    openAlerts: getChannelAlertCount(runtimeScans),
  };
}

export function getScansByIds(scanIds: string[], runtimeScans: Scan[] = []): Scan[] {
  const idSet = new Set(scanIds);
  return getAllScans(runtimeScans).filter((s) => idSet.has(s.id));
}

export function getDecisionTraces(limit = 20): DecisionTrace[] {
  return decisionTraces.slice(0, limit);
}

export function getKpiSummary() {
  const suspectScans = scans.filter((s) => s.result === 'suspect').length;
  const anchoredBatches = batches.filter((b) => b.qaStatus === 'pass').length;
  const openOpportunities = recommendations.length;
  const avgWinProb = Math.round(
    recommendations.reduce((s, r) => s + r.winProbability, 0) / recommendations.length,
  );
  return {
    totalCustomers: customers.length,
    totalScans: scans.length,
    suspectScans,
    anchoredBatches,
    openOpportunities,
    avgWinProb,
    channelAlerts: getChannelAlertCount(),
  };
}

const HIGH_CHURN_THRESHOLD = 50;

export function getRevenueAtRisk(): number {
  return customers
    .filter((c) => c.churnRisk >= HIGH_CHURN_THRESHOLD)
    .reduce((sum, c) => sum + c.lifetimeValue, 0);
}

export function getOpenOpportunitiesSummary(): { count: number; totalEstValue: number } {
  return {
    count: recommendations.length,
    totalEstValue: recommendations.reduce((sum, r) => sum + r.estValue, 0),
  };
}

export function getUnitsDueForReplacement90Days(): number {
  return getInstallBaseKpis({}).unitsDue90Days;
}

export interface RevenueFunnelStage {
  stage: string;
  value: number;
  key: string;
}

export function getRevenueFunnel(): RevenueFunnelStage[] {
  return [
    { stage: 'Field scans', value: scans.length, key: 'scans' },
    { stage: 'Install base observed', value: installBaseUnits.length, key: 'install' },
    { stage: 'Opportunities surfaced', value: recommendations.length, key: 'opportunities' },
    {
      stage: 'Quotes drafted',
      value: quotes.filter((q) => q.status === 'draft' || q.status === 'sent').length,
      key: 'quotes',
    },
    { stage: 'Won', value: quotes.filter((q) => q.status === 'won').length, key: 'won' },
  ];
}

export function getChannelHealth(runtimeScans: Scan[] = []): {
  failRate: number;
  alertCount: number;
  sparkline: { week: string; suspect: number }[];
} {
  const all = getAllScans(runtimeScans);
  const suspect = all.filter((s) => s.result === 'suspect').length;
  const failRate = all.length > 0 ? Math.round((suspect / all.length) * 1000) / 10 : 0;

  const weekBuckets = new Map<string, number>();
  for (const scan of all.filter((s) => s.result === 'suspect')) {
    const d = new Date(scan.timestamp);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    weekBuckets.set(key, (weekBuckets.get(key) ?? 0) + 1);
  }
  const sparkline = Array.from(weekBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([week, suspectCount]) => ({
      week: new Date(week).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      suspect: suspectCount,
    }));

  return { failRate, alertCount: getChannelAlertCount(runtimeScans), sparkline };
}

export function getRecentScans(limit = 5, runtimeScans: Scan[] = []): Scan[] {
  return [...getAllScans(runtimeScans)]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

export function getPredictiveDemand12Month(
  sourceUnits: InstallBaseUnit[] = installBaseUnits,
): { month: string; units: number }[] {
  const buckets = new Map<string, number>();
  for (let i = 0; i < 12; i++) {
    const d = new Date(DASHBOARD_AS_OF);
    d.setMonth(d.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, 0);
  }

  for (const unit of sourceUnits) {
    if (!unit.predictedReplacementWindow) continue;
    const key = unit.predictedReplacementWindow.slice(0, 7);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  return Array.from(buckets.entries()).map(([key, units]) => {
    const [y, m] = key.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return {
      month: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
      units,
    };
  });
}

export interface DashboardTrend {
  value: string;
  direction: 'up' | 'down' | 'flat';
}

export function getDashboardHomeMetrics() {
  const opps = getOpenOpportunitiesSummary();
  return {
    revenueAtRisk: getRevenueAtRisk(),
    openOpportunities: opps.count,
    openOpportunitiesValue: opps.totalEstValue,
    unitsDue90Days: getUnitsDueForReplacement90Days(),
    channelAlerts: getChannelAlertCount(),
    trends: {
      revenueAtRisk: { value: '+€420K vs last quarter', direction: 'up' as const },
      openOpportunities: { value: `+3 opps · €${(opps.totalEstValue * 0.08).toLocaleString(undefined, { maximumFractionDigits: 0 })} pipeline`, direction: 'up' as const },
      unitsDue: { value: '+12% vs prior 90-day window', direction: 'up' as const },
      channelAlerts: { value: '-1 alert vs last week', direction: 'down' as const },
    } satisfies Record<string, DashboardTrend>,
  };
}
