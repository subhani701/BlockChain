import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  FileText,
  Key,
  Layers,
  LayoutDashboard,
  Map as MapIcon,
  QrCode,
  Shield,
  ShieldAlert,
  Target,
  Users,
  Wrench,
  FileWarning,
} from 'lucide-react';

export type ScreenId =
  | 'home'
  | 'field-verify'
  | 'batch-minting'
  | 'provenance-registry'
  | 'install-base'
  | 'channel-map'
  | 'account'
  | 'seller-worklist'
  | 'quote'
  | 'governance'
  | 'service-requests'
  | 'authenticity-reports'
  | 'dealer-blacklist'
  | 'dao-proposals';

export interface NavItem {
  id: ScreenId;
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  phase: number | null;
  tier?: 'mobile' | 'desktop' | 'admin';
}

export const ROUTES = {
  home: '/',
  fieldVerify: '/field-verify',
  batchMinting: '/batch-minting',
  provenanceRegistry: '/provenance-registry',
  installBase: '/install-base',
  channelMap: '/channel-map',
  account: (customerId?: string) => (customerId ? `/account/${customerId}` : '/account'),
  sellerWorklist: '/seller-worklist',
  quote: (quoteId?: string, params?: { customerId?: string; partId?: string; from?: string }) => {
    const base = quoteId ? `/quote/${quoteId}` : '/quote';
    if (!params) return base;
    const q = new URLSearchParams();
    if (params.customerId) q.set('customerId', params.customerId);
    if (params.partId) q.set('partId', params.partId);
    if (params.from) q.set('from', params.from);
    const qs = q.toString();
    return qs ? `${base}?${qs}` : base;
  },
  governance: '/governance',
  serviceRequests: '/service-requests',
  serviceRequestAuthenticity: (srId: string) => `/service-requests/${srId}/authenticity`,
  authenticityReports: (params?: { dealerDid?: string; highlight?: string }) => {
    const base = '/authenticity-reports';
    if (!params) return base;
    const q = new URLSearchParams();
    if (params.dealerDid) q.set('dealer_did', params.dealerDid);
    if (params.highlight) q.set('highlight', params.highlight);
    const qs = q.toString();
    return qs ? `${base}?${qs}` : base;
  },
  dealerBlacklist: '/channel-governance/dealers',
  daoProposal: (proposalId: string) => `/dao/proposals/${proposalId}`,
} as const;

export const navGroups: { phase: string; phaseNum: number | null; items: NavItem[] }[] = [
  {
    phase: 'Home',
    phaseNum: null,
    items: [
      { id: 'home', href: '/', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard, phase: null },
    ],
  },
  {
    phase: 'Phase 1',
    phaseNum: 1,
    items: [
      { id: 'field-verify', href: '/field-verify', label: 'Field Verify & Scan', shortLabel: 'Verify', icon: QrCode, phase: 1, tier: 'mobile' },
      { id: 'batch-minting', href: '/batch-minting', label: 'Batch Minting Console', shortLabel: 'Minting', icon: Layers, phase: 1, tier: 'desktop' },
      { id: 'provenance-registry', href: '/provenance-registry', label: 'Provenance Registry', shortLabel: 'Registry', icon: Key, phase: 1, tier: 'admin' },
    ],
  },
  {
    phase: 'Phase 2',
    phaseNum: 2,
    items: [
      { id: 'install-base', href: '/install-base', label: 'Install-Base Census', shortLabel: 'Census', icon: BarChart3, phase: 2, tier: 'desktop' },
      { id: 'channel-map', href: '/channel-map', label: 'Channel Integrity Map', shortLabel: 'Channel', icon: MapIcon, phase: 2, tier: 'desktop' },
    ],
  },
  {
    phase: 'Phase 3',
    phaseNum: 3,
    items: [
      { id: 'account', href: '/account', label: 'Account Intelligence', shortLabel: 'Accounts', icon: Users, phase: 3, tier: 'desktop' },
      { id: 'seller-worklist', href: '/seller-worklist', label: 'Seller Worklist', shortLabel: 'Worklist', icon: Target, phase: 3, tier: 'desktop' },
      { id: 'quote', href: '/quote', label: 'Quote Workbench', shortLabel: 'Quotes', icon: FileText, phase: 3, tier: 'desktop' },
    ],
  },
  {
    phase: 'Phase 4',
    phaseNum: 4,
    items: [
      { id: 'governance', href: '/governance', label: 'Governance & Audit', shortLabel: 'Audit', icon: Shield, phase: 4, tier: 'admin' },
    ],
  },
  {
    phase: 'Service Operations',
    phaseNum: null,
    items: [
      { id: 'service-requests', href: '/service-requests', label: 'Open Service Requests', shortLabel: 'Service SRs', icon: Wrench, phase: null },
      { id: 'authenticity-reports', href: '/authenticity-reports', label: 'Authenticity Reports', shortLabel: 'Reports', icon: FileWarning, phase: null },
    ],
  },
  {
    phase: 'Channel Governance',
    phaseNum: null,
    items: [
      { id: 'dealer-blacklist', href: '/channel-governance/dealers', label: 'Dealer Authorization & Blacklist', shortLabel: 'Dealers', icon: ShieldAlert, phase: null, tier: 'admin' },
      { id: 'dao-proposals', href: '/governance', label: 'DAO Proposals', shortLabel: 'DAO', icon: Shield, phase: null, tier: 'admin' },
    ],
  },
];

export const allNavItems = navGroups.flatMap((g) => g.items);

export function getNavItemForPath(pathname: string): NavItem | undefined {
  if (pathname === '/') return allNavItems.find((n) => n.id === 'home');
  if (pathname.startsWith('/service-requests/') && pathname.includes('/authenticity')) {
    return allNavItems.find((n) => n.id === 'service-requests');
  }
  if (pathname.startsWith('/dao/proposals/')) {
    return allNavItems.find((n) => n.id === 'dao-proposals');
  }
  const match = allNavItems
    .filter((n) => n.href !== '/')
    .sort((a, b) => b.href.length - a.href.length)
    .find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`));
  return match;
}

// Legacy screen id mapping for existing screen components
export type LegacyScreenId =
  | 'field-verify'
  | 'batch-minting'
  | 'install-base'
  | 'channel-map'
  | 'account-wiki'
  | 'seller-worklist'
  | 'quote-workbench'
  | 'governance'
  | 'provenance-admin';

/** Stable key for shell page transitions — avoids remounting on dynamic segment changes */
export function getPageTransitionKey(pathname: string): string {
  if (pathname === '/account' || pathname.startsWith('/account/')) return '/account';
  if (pathname.startsWith('/quote/')) return '/quote';
  if (pathname.startsWith('/service-requests/') && pathname.endsWith('/authenticity')) {
    return '/service-requests/authenticity';
  }
  if (pathname.startsWith('/dao/proposals/')) return '/dao/proposals';
  return pathname;
}

export function legacyPathForScreen(
  screen: LegacyScreenId,
  params?: { customerId?: string; quoteId?: string; partId?: string; from?: string },
): string {
  switch (screen) {
    case 'field-verify': return ROUTES.fieldVerify;
    case 'batch-minting': return ROUTES.batchMinting;
    case 'install-base': return ROUTES.installBase;
    case 'channel-map': return ROUTES.channelMap;
    case 'account-wiki': return ROUTES.account(params?.customerId);
    case 'seller-worklist': return ROUTES.sellerWorklist;
    case 'quote-workbench': return ROUTES.quote(params?.quoteId ?? 'Q-2026-0847', params);
    case 'governance': return ROUTES.governance;
    case 'provenance-admin': return ROUTES.provenanceRegistry;
    default: return ROUTES.home;
  }
}
