'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ScreenCallbacks } from '@/components/providers/app-provider';
import {
  getRecommendationsRanked,
  getCustomer,
  getPart,
  getDecisionTracesMerged,
  PROVENANCE_REGISTRY_ADDRESS,
  PROVENANCE_REGISTRY_CONTRACT,
} from '@/lib/data/ami-data';
import { useBatchAnchoring } from '@/components/providers/app-provider';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fadeInUp,
  listItem,
  pageTransition,
  scaleIn,
  slideInRight as slideIn,
  staggerContainer,
} from '@/lib/motion';
import {
  Camera,
  Check,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Package,
  Moon,
  Sun,
  Zap,
  Shield,
  QrCode,
  Fingerprint,
  Hash,
  FileCheck,
  AlertCircle,
  Sparkles,
  Menu,
  X,
  LayoutDashboard,
  Users,
  FileText,
  Map as MapIcon,
  Database,
  Settings,
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Target,
  ArrowRight,
  Eye,
  Edit3,
  Send,
  DollarSign,
  Percent,
  Building2,
  Globe,
  Lock,
  Unlock,
  Vote,
  Key,
  Server,
  GitBranch,
  History,
  Search,
  Filter,
  MoreVertical,
  ExternalLink,
  RefreshCw,
  Download,
  ChevronLeft,
  Play,
  Pause,
  RotateCcw,
  Award,
  BadgeCheck,
  ShieldCheck,
  FileWarning,
  Layers,
  Network,
  Trees,
  UserCheck,
  Boxes,
  ScanLine,
  MapPin,
  Info,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

type ScreenType = 
  | 'field-verify' 
  | 'batch-minting' 
  | 'install-base' 
  | 'channel-map' 
  | 'account-wiki' 
  | 'seller-worklist' 
  | 'quote-workbench' 
  | 'governance' 
  | 'provenance-admin';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface NavItem {
  id: ScreenType;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  tier: 'mobile' | 'desktop' | 'admin';
  phase: number;
}

// ============================================
// SCREEN-SPECIFIC ANIMATIONS
// ============================================

const pulseAnimation = {
  animate: {
    scale: [1, 1.02, 1],
    opacity: [1, 0.8, 1],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
};

const scanLineAnimation = {
  animate: {
    y: [0, 260, 0],
    transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
  },
};

const screenTransition = pageTransition;

const progressEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

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

function MotionProgressFill({
  value,
  barClassName,
  delay = 0,
  duration = 0.65,
  trackClassName = 'flex-1 bg-muted rounded-full overflow-hidden min-w-0',
  heightClass = 'h-full',
}: {
  value: number;
  barClassName: string;
  delay?: number;
  duration?: number;
  trackClassName?: string;
  heightClass?: string;
}) {
  const percent = Math.min(100, Math.max(0, value));
  return (
    <div className={trackClassName}>
      <motion.div
        className={`${heightClass} rounded-full ${barClassName}`}
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration, delay, ease: progressEase }}
      />
    </div>
  );
}

function MotionRingProgress({
  value,
  size,
  strokeWidth,
  radius,
  circumference,
  colorClass,
  delay = 0,
  duration = 1,
}: {
  value: number;
  size: number;
  strokeWidth: number;
  radius: number;
  circumference: number;
  colorClass: string;
  delay?: number;
  duration?: number;
}) {
  const center = size / 2;
  return (
    <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
      <circle cx={center} cy={center} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted" />
      <motion.circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className={colorClass}
        strokeLinecap="round"
        initial={{ strokeDasharray: `0 ${circumference}` }}
        animate={{ strokeDasharray: `${(value / 100) * circumference} ${circumference}` }}
        transition={{ duration, delay, ease: progressEase }}
      />
    </svg>
  );
}

function MotionCard({
  children,
  className = 'p-4',
  delay = 0,
  layout = false,
  hover = true,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  layout?: boolean;
  hover?: boolean;
}) {
  return (
    <motion.div
      layout={layout}
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      transition={{ delay }}
      whileHover={hover ? { y: -2, boxShadow: '0 8px 24px oklch(0.15 0.02 240 / 8%)' } : undefined}
      className={`ds-card ${className}`}
    >
      {children}
    </motion.div>
  );
}

function MotionKpiCard({
  label,
  value,
  hint,
  delay = 0,
  delta,
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  delay?: number;
  delta?: string;
  trend?: 'up' | 'down';
}) {
  return (
    <motion.div
      variants={listItem}
      initial="initial"
      animate="animate"
      transition={{ delay }}
      whileHover={{ y: -2 }}
      className="ds-card p-4 hover:shadow-lg hover:shadow-primary/5 transition-shadow"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        {trend === 'up' && <TrendingUp size={16} className="text-green-500" />}
        {trend === 'down' && <TrendingDown size={16} className="text-red-500" />}
      </div>
      <motion.p
        key={value}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: progressEase }}
        className="text-lg sm:text-xl font-bold text-foreground"
      >
        {value}
      </motion.p>
      {delta && (
        <p className={`text-xs font-medium mt-1 ${trend === 'up' ? 'text-green-600 dark:text-green-400' : trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
          {delta}
        </p>
      )}
      {hint && <p className="text-[10px] text-muted-foreground mt-2 font-mono">{hint}</p>}
    </motion.div>
  );
}

type FilterOption = { id: string; label: string };

function FilterBar({
  filters,
  active,
  onChange,
}: {
  filters: FilterOption[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <motion.div variants={fadeInUp} className="ds-filter-scroll">
      <div className="ds-filter-bar">
      {filters.map((filter, i) => (
        <motion.button
          key={filter.id}
          type="button"
          layout
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, ease: progressEase }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onChange(filter.id)}
          className={`relative ds-filter-btn ${active === filter.id ? 'ds-filter-btn-active' : 'ds-filter-btn-inactive'}`}
        >
          {active === filter.id && (
            <motion.span
              layoutId="ds-filter-active"
              className="absolute inset-0 rounded-lg bg-primary -z-10"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
          )}
          <Filter size={14} />
          {filter.label}
        </motion.button>
      ))}
      </div>
    </motion.div>
  );
}

// ============================================
// NAVIGATION CONFIG
// ============================================

const navItems: NavItem[] = [
  { id: 'field-verify', label: 'Field Verify & Scan', shortLabel: 'Verify', icon: QrCode, tier: 'mobile', phase: 1 },
  { id: 'batch-minting', label: 'Batch Minting Console', shortLabel: 'Minting', icon: Layers, tier: 'desktop', phase: 1 },
  { id: 'install-base', label: 'Install-Base Census', shortLabel: 'Census', icon: BarChart3, tier: 'desktop', phase: 2 },
  { id: 'channel-map', label: 'Channel Integrity Map', shortLabel: 'Channel', icon: MapIcon, tier: 'desktop', phase: 2 },
  { id: 'account-wiki', label: 'Account Intelligence', shortLabel: 'Accounts', icon: Users, tier: 'desktop', phase: 3 },
  { id: 'seller-worklist', label: 'Seller Worklist', shortLabel: 'Worklist', icon: Target, tier: 'desktop', phase: 3 },
  { id: 'quote-workbench', label: 'Quote Workbench', shortLabel: 'Quotes', icon: FileText, tier: 'desktop', phase: 3 },
  { id: 'governance', label: 'Governance & Audit', shortLabel: 'Audit', icon: Shield, tier: 'admin', phase: 4 },
  { id: 'provenance-admin', label: 'Provenance Registry', shortLabel: 'Registry', icon: Key, tier: 'admin', phase: 1 },
];

// ============================================
// MAIN APP COMPONENT
// ============================================

const TOAST_DURATION_MS = 4200;
const MAX_VISIBLE_TOASTS = 5;

const TOAST_META: Record<ToastType, { icon: React.ElementType; iconWrap: string }> = {
  success: {
    icon: CheckCircle2,
    iconWrap: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
  },
  error: {
    icon: XCircle,
    iconWrap: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    iconWrap: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
  },
  info: {
    icon: Info,
    iconWrap: 'bg-primary/10 text-primary',
  },
};

function ToastNotification({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
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
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="ds-toast-dismiss"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="ds-toast-stack" aria-label="Notifications">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastNotification key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// SCREEN 1: FIELD VERIFY & SCAN
// ============================================

export { FieldVerifyScreen } from './field-verify-screen';
export type { FieldVerifyProps } from './field-verify-screen';


// ============================================
// SCREEN 2: BATCH MINTING CONSOLE
// ============================================

export { BatchMintingScreen } from './batch-minting-screen';
export type { BatchMintingProps } from './batch-minting-screen';


// ============================================
// REMAINING SCREENS (Simplified for brevity)
// ============================================

export { InstallBaseScreen } from './install-base-screen';
export type { InstallBaseProps } from './install-base-screen';


export { ChannelMapScreen } from './channel-map-screen';
export type { ChannelMapProps } from './channel-map-screen';


export { AccountWikiScreen } from './account-wiki-screen';
export type { AccountWikiProps } from './account-wiki-screen';

export { SellerWorklistScreen } from './seller-worklist-screen';
export type { SellerWorklistProps } from './seller-worklist-screen';

export { QuoteWorkbenchScreen } from './quote-workbench-screen';
export type { QuoteWorkbenchProps } from './quote-workbench-screen';

export { GovernanceScreen } from './governance-screen';
export type { GovernanceProps } from './governance-screen';

export { ProvenanceAdminScreen } from './provenance-registry-screen';
export type { ProvenanceRegistryProps } from './provenance-registry-screen';
