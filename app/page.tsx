'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

type ScreenCallbacks = {
  showToast: (message: string, type?: ToastType) => void;
  navigateTo: (screen: ScreenType, options?: { silent?: boolean }) => void;
};

interface NavItem {
  id: ScreenType;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  tier: 'mobile' | 'desktop' | 'admin';
  phase: number;
}

// ============================================
// ANIMATION VARIANTS
// ============================================

const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.06 },
  },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

const slideIn = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

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

const listItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: 0.22 },
};

const screenTransition = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
};

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

export default function VoltusWaveAMI() {
  const [isDark, setIsDark] = useState(getInitialTheme);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('field-verify');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
  );
  const [toasts, setToasts] = useState<ToastItem[]>([]);
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

  const navigateTo = useCallback((screen: ScreenType, options?: { silent?: boolean }) => {
    setCurrentScreen(screen);
    if (isMobile) setSidebarOpen(false);
    if (!options?.silent) {
      const label = navItems.find((item) => item.id === screen)?.label;
      if (label) showToast(`Opened ${label}`, 'info');
    }
  }, [isMobile, showToast]);

  useEffect(() => {
    const timeouts = toastTimeoutsRef.current;
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      timeouts.clear();
    };
  }, []);

  const callbacks: ScreenCallbacks = { showToast, navigateTo };

  // Dark mode toggle + persistence
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem('voltus-theme', isDark ? 'dark' : 'light');
    } catch {
      /* ignore storage errors */
    }
  }, [isDark]);

  // Responsive check
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const checkMobile = () => setIsMobile(media.matches);
    checkMobile();
    media.addEventListener('change', checkMobile);
    return () => media.removeEventListener('change', checkMobile);
  }, []);

  // Close mobile drawer on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-primary/3 to-transparent rounded-full blur-3xl" />
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="relative flex min-h-screen">
        {/* Sidebar — CSS slide on mobile, always visible on desktop */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            />
          )}
        </AnimatePresence>

        <aside
          className={`fixed lg:sticky top-0 left-0 h-[100dvh] w-72 bg-card/95 backdrop-blur-xl border-r border-border z-50 flex flex-col overflow-hidden transition-transform duration-300 ease-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0`}
        >
                {/* Sidebar Header */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
                        <Fingerprint className="h-5 w-5 text-primary-foreground" />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
                      </div>
                      <div>
                        <h1 className="text-base font-bold tracking-tight text-foreground">VoltusWave</h1>
                        <p className="text-[10px] font-medium text-muted-foreground">Aftermarket Intelligence</p>
                      </div>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="ds-btn-icon ds-btn-ghost lg:hidden">
                      <X size={20} className="text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 overflow-y-auto scrollbar-thin">
                  <div className="space-y-0.5">
                    {['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'].map((phase, phaseIdx) => {
                      const phaseItems = navItems.filter(item => item.phase === phaseIdx + 1);
                      if (phaseItems.length === 0) return null;
                      
                      return (
                        <div key={phase} className="mb-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2.5 mb-1">
                            {phase}
                          </p>
                          {phaseItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = currentScreen === item.id;
                            
                            return (
                              <motion.button
                                key={item.id}
                                whileHover={{ x: 4 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                  if (currentScreen !== item.id) {
                                    setCurrentScreen(item.id);
                                    showToast(`Opened ${item.label}`, 'info');
                                  }
                                  if (isMobile) setSidebarOpen(false);
                                }}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all ${
                                  isActive
                                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                }`}
                              >
                                <Icon size={18} className={isActive ? 'text-primary-foreground' : ''} />
                                <span className="truncate">{item.label}</span>
                                {item.tier === 'admin' && (
                                  <Lock size={12} className="ml-auto opacity-50" />
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </nav>

                {/* Sidebar Footer */}
                <div className="p-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-muted-foreground truncate">Voltus Private Ethereum</span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05, rotate: 15 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setIsDark(!isDark);
                        showToast(isDark ? 'Light mode enabled' : 'Dark mode enabled', 'info');
                      }}
                      className="ds-btn-icon ds-btn-outline"
                    >
                      {isDark ? <Sun size={16} /> : <Moon size={16} />}
                    </motion.button>
                  </div>
                </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-x-hidden">
          {/* Mobile Header — hidden on Field Verify (full-screen mobile app) */}
          {isMobile && currentScreen !== 'field-verify' && (
            <motion.header
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="ds-mobile-header"
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="ds-btn-icon ds-btn-ghost flex-shrink-0"
                  aria-label="Open navigation"
                >
                  <Menu size={20} className="text-foreground" />
                </button>
                <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
                  <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80">
                    <Fingerprint className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="font-bold text-foreground truncate">
                    {navItems.find((item) => item.id === currentScreen)?.shortLabel ?? 'VoltusWave'}
                  </span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setIsDark(!isDark);
                    showToast(isDark ? 'Light mode enabled' : 'Dark mode enabled', 'info');
                  }}
                  className="ds-btn-icon ds-btn-outline flex-shrink-0"
                >
                  {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </motion.button>
              </div>
            </motion.header>
          )}

          {/* Screen Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen}
              initial={screenTransition.initial}
              animate={screenTransition.animate}
              exit={screenTransition.exit}
              transition={screenTransition.transition}
              className={
                isMobile && currentScreen !== 'field-verify'
                  ? 'min-h-[calc(100dvh-3.25rem-env(safe-area-inset-top))]'
                  : 'min-h-screen'
              }
            >
              {currentScreen === 'field-verify' && (
                <FieldVerifyScreen
                  isDark={isDark}
                  setIsDark={setIsDark}
                  onMenuClick={isMobile ? () => {
                    setSidebarOpen(true);
                    showToast('Navigation opened', 'info');
                  } : undefined}
                  callbacks={callbacks}
                />
              )}
              {currentScreen === 'batch-minting' && <BatchMintingScreen callbacks={callbacks} />}
              {currentScreen === 'install-base' && <InstallBaseScreen callbacks={callbacks} />}
              {currentScreen === 'channel-map' && <ChannelMapScreen callbacks={callbacks} />}
              {currentScreen === 'account-wiki' && <AccountWikiScreen callbacks={callbacks} />}
              {currentScreen === 'seller-worklist' && <SellerWorklistScreen callbacks={callbacks} />}
              {currentScreen === 'quote-workbench' && <QuoteWorkbenchScreen callbacks={callbacks} />}
              {currentScreen === 'governance' && <GovernanceScreen callbacks={callbacks} />}
              {currentScreen === 'provenance-admin' && <ProvenanceAdminScreen callbacks={callbacks} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// ============================================
// SCREEN 1: FIELD VERIFY & SCAN
// ============================================

interface FieldVerifyProps {
  isDark: boolean;
  setIsDark: (value: boolean) => void;
  onMenuClick?: () => void;
  callbacks: ScreenCallbacks;
}

function FieldVerifyScreen({ isDark, setIsDark, onMenuClick, callbacks }: FieldVerifyProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<'idle' | 'genuine' | 'suspect'>('idle');
  const [alertRaised, setAlertRaised] = useState(false);
  const [verificationSteps, setVerificationSteps] = useState([
    { label: 'Reading QR code', completed: false },
    { label: 'Hashing leaf + Merkle proof', completed: false },
    { label: 'Fetching on-chain root', completed: false },
    { label: 'Matching provenance', completed: false },
  ]);
  const [offlineMode, setOfflineMode] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [partsFilter, setPartsFilter] = useState('all');

  // Mock part data - binds to prov__part_identity, prov__merkle_root, prov__block_number
  const partData = {
    serial: 'SKF-6205-2RS-A41',
    plant: 'Schweinfurt L7',
    batch: 'B-2026-04-K9',
    mfgDate: '2026-04-15',
    spec: 'Deep groove ball bearing, stainless steel, sealed',
    merkleRoot: '0xA7F3...9B21',
    blockNumber: '19847291',
    verifierId: 'did:voltus:am-scanner-07',
    chainName: 'Voltus Private Ethereum',
  };

  // Recommended parts - binds to model__next_best_part
  const recommendedParts = [
    { id: '1', name: 'SKF-6205-2RS-A42 (Upgrade)', confidence: 0.92, price: '$45.99', tier: 'high' as const },
    { id: '2', name: 'NSK-6206-2Z (Alternative)', confidence: 0.78, price: '$38.50', tier: 'mid' as const },
    { id: '3', name: 'FAG-6205-2RSH (Premium)', confidence: 0.85, price: '$52.00', tier: 'high' as const },
    { id: '4', name: 'SKF-6308-2RS (Heavy Duty)', confidence: 0.71, price: '$67.25', tier: 'mid' as const },
    { id: '5', name: 'FAG-6206-C3 (Cross-sell)', confidence: 0.64, price: '$41.80', tier: 'cross' as const },
  ];

  const filteredParts = recommendedParts.filter((part) => {
    if (partsFilter === 'high') return part.confidence >= 0.85;
    if (partsFilter === 'cross') return part.tier === 'cross';
    return true;
  });

  const handleScan = useCallback((isGenuine: boolean) => {
    setIsVerifying(true);
    setCurrentStepIndex(0);
    setVerificationSteps(steps => steps.map(s => ({ ...s, completed: false })));
    callbacks.showToast('Scanning QR code — verifying on-chain provenance', 'info');

    let stepIndex = 0;
    const totalSteps = 4;

    const stepInterval = setInterval(() => {
      if (stepIndex < totalSteps) {
        setVerificationSteps(steps => {
          const updated = [...steps];
          if (updated[stepIndex]) {
            updated[stepIndex] = { ...updated[stepIndex], completed: true };
          }
          return updated;
        });
        setCurrentStepIndex(stepIndex + 1);
        stepIndex++;
      } else {
        clearInterval(stepInterval);
        setIsVerifying(false);
        setVerificationResult(isGenuine ? 'genuine' : 'suspect');
        setCurrentStepIndex(-1);
        callbacks.showToast(
          isGenuine
            ? `Part ${partData.serial} verified — authentic`
            : `Part ${partData.serial} could not be verified`,
          isGenuine ? 'success' : 'error',
        );
      }
    }, 700);
  }, [callbacks, partData.serial]);

  const handleReset = () => {
    setVerificationResult('idle');
    setAlertRaised(false);
    setVerificationSteps(steps => steps.map(s => ({ ...s, completed: false })));
    setCurrentStepIndex(-1);
    callbacks.showToast('Ready for next scan', 'info');
  };

  return (
    <div className="flex items-center justify-center min-h-screen lg:p-5 lg:overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-none lg:w-[430px] lg:max-w-[430px]"
      >
        {/* Phone Frame — fixed height; content scrolls inside */}
        <div className="relative h-[100dvh] lg:h-[780px] overflow-hidden lg:rounded-[3rem] lg:shadow-2xl lg:shadow-black/20 dark:lg:shadow-black/50 lg:border-[12px] lg:border-foreground/90 dark:lg:border-foreground/80 bg-background lg:bg-card">
          {/* Notch — desktop mockup only */}
          <div className="hidden lg:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-foreground/90 dark:bg-foreground/80 rounded-b-2xl z-10" />
          
          <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <motion.header
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative flex-shrink-0 px-4 pt-[max(1rem,env(safe-area-inset-top))] lg:pt-10 pb-3 bg-card/80 backdrop-blur-xl border-b border-border"
            >
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  {onMenuClick && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={onMenuClick}
                      className="lg:hidden ds-btn-icon ds-btn-ghost -ml-1 flex-shrink-0"
                    >
                      <Menu size={20} className="text-foreground" />
                    </motion.button>
                  )}
                  <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
                    <Fingerprint className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg font-bold tracking-tight text-foreground truncate">VoltusWave</h1>
                    <p className="text-[10px] font-medium text-muted-foreground">Aftermarket Intelligence</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setIsDark(!isDark);
                      callbacks.showToast(isDark ? 'Light mode enabled' : 'Dark mode enabled', 'info');
                    }}
                    className="ds-btn-icon ds-btn-outline"
                    aria-label="Toggle theme"
                  >
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const next = !offlineMode;
                      setOfflineMode(next);
                      callbacks.showToast(
                        next ? 'Offline mode enabled — scans queued locally' : 'Back online — syncing with Voltus chain',
                        next ? 'warning' : 'success',
                      );
                    }}
                    className={`ds-btn-icon transition-all ${
                      offlineMode 
                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' 
                        : 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'
                    }`}
                  >
                    {offlineMode ? <WifiOff size={16} /> : <Wifi size={16} />}
                  </motion.button>
                </div>
              </div>
              
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                Field Verify
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">Authenticate parts in 3 seconds</p>

              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`mt-2 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full w-fit ${
                  offlineMode 
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' 
                    : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${offlineMode ? 'bg-amber-500' : 'bg-green-500 animate-pulse'}`} />
                {offlineMode ? 'Offline mode' : 'Voltus Private Ethereum'}
              </motion.div>
            </motion.header>

            {/* Content — scrollable area inside fixed phone frame */}
            <div className="flex-1 min-h-0 px-3 py-2.5 overflow-y-auto overflow-x-hidden scrollbar-thin overscroll-contain">
              <AnimatePresence mode="wait">
                {/* Idle State */}
                {verificationResult === 'idle' && !isVerifying && (
                  <motion.div
                    key="idle"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="ds-stack"
                  >
                    {/* Camera Viewfinder */}
                    <motion.div 
                      variants={fadeInUp}
                      className="relative bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl aspect-square flex items-center justify-center overflow-hidden shadow-xl"
                    >
                      <div className="absolute inset-0 opacity-20">
                        <div className="w-full h-full" style={{
                          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                          backgroundSize: '40px 40px'
                        }} />
                      </div>

                      <motion.div 
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <Camera size={64} className="text-gray-600" strokeWidth={1} />
                      </motion.div>
                      
                      <motion.div
                        variants={scanLineAnimation}
                        animate="animate"
                        className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full shadow-lg shadow-primary/50"
                      />
                      
                      <motion.div 
                        variants={pulseAnimation}
                        animate="animate"
                        className="absolute inset-8 border-2 border-primary/60 rounded-xl"
                      />
                      
                      {['top-5 left-5', 'top-5 right-5', 'bottom-5 left-5', 'bottom-5 right-5'].map((pos, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 + i * 0.1 }}
                          className={`absolute w-8 h-8 ${pos}`}
                        >
                          <div className={`absolute ${pos.includes('top') ? 'top-0' : 'bottom-0'} ${pos.includes('left') ? 'left-0' : 'right-0'} w-full h-1 bg-primary rounded-full`} />
                          <div className={`absolute ${pos.includes('top') ? 'top-0' : 'bottom-0'} ${pos.includes('left') ? 'left-0' : 'right-0'} w-1 h-full bg-primary rounded-full`} />
                        </motion.div>
                      ))}

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="absolute bottom-4 left-0 right-0 flex justify-center"
                      >
                        <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full text-white text-xs font-medium flex items-center gap-2">
                          <QrCode size={14} />
                          Align QR code within frame
                        </div>
                      </motion.div>
                    </motion.div>

                    {/* Demo Buttons */}
                    <motion.div variants={fadeInUp} className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleScan(true)}
                        className="ds-btn-md ds-btn-success flex-1"
                      >
                        <CheckCircle2 size={16} />
                        Genuine
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleScan(false)}
                        className="ds-btn-md ds-btn-danger flex-1"
                      >
                        <XCircle size={16} />
                        Suspect
                      </motion.button>
                    </motion.div>

                    <motion.button 
                      variants={fadeInUp}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleScan(true)}
                      className="ds-btn-lg ds-btn-primary ds-btn-block"
                    >
                      <Camera size={18} />
                      Scan Part QR
                    </motion.button>
                  </motion.div>
                )}

                {/* Verifying State */}
                {isVerifying && (
                  <motion.div
                    key="verifying"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="ds-stack"
                  >
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-5 flex flex-col items-center gap-3 border border-primary/20"
                    >
                      <div className="relative w-20 h-20 flex items-center justify-center">
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 border-4 border-transparent border-t-primary border-r-primary/50 rounded-full"
                        />
                        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                          <Zap size={36} className="text-primary" />
                        </motion.div>
                      </div>
                      <div className="text-center">
                        <p className="text-base font-bold text-foreground">Verifying authenticity...</p>
                        <p className="text-sm text-muted-foreground mt-1">Checking blockchain provenance</p>
                      </div>
                    </motion.div>

                    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
                      {verificationSteps.map((step, idx) => (
                        <motion.div 
                          key={idx}
                          variants={fadeInUp}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                            step.completed 
                              ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                              : currentStepIndex === idx
                              ? 'bg-primary/5 border-primary/30'
                              : 'bg-card border-border'
                          }`}
                        >
                          <motion.div 
                            animate={currentStepIndex === idx ? { scale: [1, 1.1, 1] } : {}}
                            transition={{ duration: 0.5, repeat: currentStepIndex === idx ? Infinity : 0 }}
                            className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm ${
                              step.completed 
                                ? 'bg-green-500 text-white' 
                                : currentStepIndex === idx
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {step.completed ? <Check size={14} /> : idx + 1}
                          </motion.div>
                          <span className={`text-sm ${step.completed ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                            {step.label}
                          </span>
                        </motion.div>
                      ))}
                    </motion.div>
                  </motion.div>
                )}

                {/* Genuine Result */}
                {verificationResult === 'genuine' && (
                  <motion.div
                    key="genuine"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="ds-stack"
                  >
                    <motion.div 
                      variants={scaleIn}
                      className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800 flex flex-col items-center gap-2"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 10, stiffness: 200 }}
                      >
                        <CheckCircle2 size={48} className="text-green-600 dark:text-green-400" />
                      </motion.div>
                      <h3 className="text-xl font-bold text-green-900 dark:text-green-100">Authentic</h3>
                      <p className="text-sm text-green-800 dark:text-green-200 text-center">Verified against on-chain root</p>
                    </motion.div>

                    {/* Part Identity */}
                    <motion.div variants={fadeInUp} className="ds-card overflow-hidden">
                      <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3">
                        <h4 className="text-white font-semibold text-sm">Part Identity</h4>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: 'Serial', value: partData.serial, mono: true },
                            { label: 'Plant', value: partData.plant },
                            { label: 'Batch', value: partData.batch, mono: true },
                            { label: 'Mfg Date', value: partData.mfgDate },
                          ].map((item, i) => (
                            <div key={i}>
                              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{item.label}</p>
                              <p className={`text-sm font-semibold text-foreground mt-0.5 ${item.mono ? 'font-mono' : ''}`}>{item.value}</p>
                            </div>
                          ))}
                        </div>
                        <div className="pt-2 border-t border-border">
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Specification</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{partData.spec}</p>
                        </div>
                      </div>
                    </motion.div>

                    {/* On-Chain Proof */}
                    <motion.div variants={fadeInUp} className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2.5 border border-blue-200 dark:border-blue-800">
                      <p className="text-[10px] font-semibold text-blue-900 dark:text-blue-200 uppercase tracking-wide flex items-center gap-1">
                        <Shield size={12} /> On-Chain Proof
                      </p>
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-blue-800 dark:text-blue-300"><span className="font-medium">Root:</span> <code className="font-mono">{partData.merkleRoot}</code></p>
                        <p className="text-xs text-blue-800 dark:text-blue-300"><span className="font-medium">Block:</span> <code className="font-mono">{partData.blockNumber}</code></p>
                      </div>
                    </motion.div>

                    {/* Recommended Parts */}
                    <motion.div variants={fadeInUp} className="ds-card overflow-hidden">
                      <div className="bg-gradient-to-r from-primary to-primary/80 px-4 py-3">
                        <h4 className="text-primary-foreground font-semibold text-sm flex items-center gap-2">
                          <Sparkles size={14} /> Recommended Next
                        </h4>
                      </div>
                      <div className="px-3 pt-3 flex flex-wrap gap-2">
                        {[
                          { id: 'all', label: 'All' },
                          { id: 'high', label: 'High Match' },
                          { id: 'cross', label: 'Cross-sell' },
                        ].map((f) => (
                          <motion.button
                            key={f.id}
                            type="button"
                            whileTap={{ scale: 0.97 }}
                            onClick={() => {
                              setPartsFilter(f.id);
                              callbacks.showToast(`Showing ${f.label} recommendations`, 'info');
                            }}
                            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                              partsFilter === f.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {f.label}
                          </motion.button>
                        ))}
                      </div>
                      <div className="p-3 space-y-2">
                        <AnimatePresence mode="popLayout">
                        {filteredParts.map((part) => (
                          <motion.button
                            key={part.id}
                            layout
                            variants={listItem}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            type="button"
                            whileHover={{ x: 2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => callbacks.showToast(`Added ${part.name} to quote draft`, 'success')}
                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                          >
                            <Package size={16} className="text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{part.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <MotionProgressFill
                                  value={part.confidence * 100}
                                  barClassName="bg-gradient-to-r from-primary to-primary/70"
                                  trackClassName="flex-1 bg-muted rounded-full h-1.5 overflow-hidden min-w-0"
                                  delay={0.15}
                                />
                                <span className="text-[10px] font-semibold text-muted-foreground">{Math.round(part.confidence * 100)}%</span>
                              </div>
                            </div>
                            <span className="text-sm font-bold text-primary flex-shrink-0">{part.price}</span>
                          </motion.button>
                        ))}
                        </AnimatePresence>
                        {filteredParts.length === 0 && (
                          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-muted-foreground text-center py-4">
                            No parts match this filter
                          </motion.p>
                        )}
                      </div>
                    </motion.div>

                    {/* Actions */}
                    <motion.button
                      variants={fadeInUp}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        callbacks.showToast('Opening Quote Workbench with verified part', 'info');
                        callbacks.navigateTo('quote-workbench', { silent: true });
                      }}
                      className="ds-btn-lg ds-btn-primary ds-btn-block"
                    >
                      Draft Quote <ChevronRight size={16} />
                    </motion.button>
                    <motion.button
                      variants={fadeInUp}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleReset}
                      className="ds-btn-md ds-btn-secondary ds-btn-block"
                    >
                      Scan Another Part
                    </motion.button>
                  </motion.div>
                )}

                {/* Suspect Result */}
                {verificationResult === 'suspect' && (
                  <motion.div
                    key="suspect"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="ds-stack"
                  >
                    <motion.div 
                      variants={scaleIn}
                      className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800 flex flex-col items-center gap-2"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 10, stiffness: 200 }}
                      >
                        <XCircle size={48} className="text-red-600 dark:text-red-400" />
                      </motion.div>
                      <h3 className="text-xl font-bold text-red-900 dark:text-red-100">Could Not Verify</h3>
                      <p className="text-sm text-red-800 dark:text-red-200 text-center">This part may be counterfeit or grey-market</p>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="bg-orange-50 dark:bg-orange-900/20 rounded-lg px-3 py-2.5 border border-orange-200 dark:border-orange-800">
                      <div className="flex gap-3">
                        <AlertTriangle size={18} className="text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-orange-900 dark:text-orange-200 uppercase tracking-wide">Possible Issues</p>
                          <ul className="text-xs text-orange-800 dark:text-orange-300 mt-2 space-y-1 list-disc list-inside">
                            <li>QR data does not match blockchain record</li>
                            <li>No provenance scan history available</li>
                            <li>Batch metadata inconsistencies detected</li>
                          </ul>
                        </div>
                      </div>
                    </motion.div>

                    <motion.button
                      variants={fadeInUp}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setAlertRaised(true);
                        callbacks.showToast('Counterfeit alert raised — channel team notified', 'warning');
                      }}
                      disabled={alertRaised}
                      className="ds-btn-lg ds-btn-danger ds-btn-block"
                    >
                      <AlertTriangle size={16} /> {alertRaised ? 'Alert Raised' : 'Raise Alert'}
                    </motion.button>
                    <motion.button
                      variants={fadeInUp}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleReset}
                      className="ds-btn-md ds-btn-secondary ds-btn-block"
                    >
                      Scan Another Part
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            {verificationResult !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-shrink-0 px-4 sm:px-6 py-3 bg-card border-t border-border"
              >
                <p className="text-[10px] text-muted-foreground text-center">
                  Verified against {offlineMode ? 'cached' : 'on-chain'} root · {partData.batch} · just now
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================
// SCREEN 2: BATCH MINTING CONSOLE
// ============================================

function BatchMintingScreen({ callbacks }: { callbacks: ScreenCallbacks }) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [transactionState, setTransactionState] = useState<'idle' | 'pending' | 'confirmed'>('idle');
  const [batchFilter, setBatchFilter] = useState('all');

  const sorBatches = [
    { id: 'B-2026-04-K9', material: 'SKF-6205-2RS', plant: 'Schweinfurt L7', unitCount: 150, mfgWindow: '2026-04-12 to 2026-04-15', qaStatus: 'pass' },
    { id: 'B-2026-04-J8', material: 'FAG-6202-2RS', plant: 'Schweinfurt L5', unitCount: 220, mfgWindow: '2026-04-10 to 2026-04-14', qaStatus: 'pass' },
    { id: 'B-2026-04-M2', material: 'NSK-6206-2Z', plant: 'Stuttgart W1', unitCount: 85, mfgWindow: '2026-04-13 to 2026-04-15', qaStatus: 'review' },
    { id: 'B-2026-04-L3', material: 'SKF-6308-2RS', plant: 'Schweinfurt L7', unitCount: 310, mfgWindow: '2026-04-08 to 2026-04-11', qaStatus: 'pass' },
    { id: 'B-2026-04-H1', material: 'FAG-6203-2RS', plant: 'Schweinfurt L5', unitCount: 175, mfgWindow: '2026-04-09 to 2026-04-12', qaStatus: 'pass' },
    { id: 'B-2026-04-G7', material: 'NSK-6205-2Z', plant: 'Stuttgart W1', unitCount: 142, mfgWindow: '2026-04-11 to 2026-04-14', qaStatus: 'pass' },
    { id: 'B-2026-04-F4', material: 'SKF-6206-2RS', plant: 'Schweinfurt L7', unitCount: 198, mfgWindow: '2026-04-07 to 2026-04-10', qaStatus: 'pass' },
    { id: 'B-2026-04-E2', material: 'FAG-6205-C3', plant: 'Schweinfurt L5', unitCount: 96, mfgWindow: '2026-04-06 to 2026-04-09', qaStatus: 'review' },
    { id: 'B-2026-04-D8', material: 'NSK-6208-2Z', plant: 'Stuttgart W1', unitCount: 264, mfgWindow: '2026-04-05 to 2026-04-08', qaStatus: 'pass' },
    { id: 'B-2026-04-C5', material: 'SKF-6204-2RS', plant: 'Schweinfurt L7', unitCount: 128, mfgWindow: '2026-04-04 to 2026-04-07', qaStatus: 'pass' },
    { id: 'B-2026-04-B1', material: 'FAG-6208-2RS', plant: 'Schweinfurt L5', unitCount: 187, mfgWindow: '2026-04-03 to 2026-04-06', qaStatus: 'pass' },
    { id: 'B-2026-04-A9', material: 'NSK-6204-2Z', plant: 'Stuttgart W1', unitCount: 73, mfgWindow: '2026-04-02 to 2026-04-05', qaStatus: 'review' },
    { id: 'B-2026-03-Z6', material: 'SKF-6210-2RS', plant: 'Schweinfurt L7', unitCount: 245, mfgWindow: '2026-03-28 to 2026-03-31', qaStatus: 'pass' },
    { id: 'B-2026-03-Y3', material: 'FAG-6210-2RS', plant: 'Schweinfurt L5', unitCount: 156, mfgWindow: '2026-03-25 to 2026-03-28', qaStatus: 'pass' },
    { id: 'B-2026-03-X1', material: 'NSK-6211-2Z', plant: 'Stuttgart W1', unitCount: 112, mfgWindow: '2026-03-22 to 2026-03-25', qaStatus: 'pass' },
  ];

  const sorUnitPreview = Array.from({ length: 8 }, (_, i) => ({
    unit: String(i + 1).padStart(3, '0'),
    serial: `SKF-6205-2RS-${String(i + 1).padStart(3, '0')}`,
    spec: 'Deep groove ball bearing, sealed',
    qa: i === 4 ? 'Review' : 'Pass',
    operator: `OP-${2847 + i}`,
  }));

  const recentAnchors = [
    { id: 'B-2026-04-K8', block: 19847291, time: '08:32 today' },
    { id: 'B-2026-04-J7', block: 19847280, time: '08:15 today' },
    { id: 'B-2026-04-M1', block: 19847268, time: '07:58 today' },
    { id: 'B-2026-04-L2', block: 19847255, time: '07:41 today' },
    { id: 'B-2026-04-H9', block: 19847241, time: 'Yesterday 16:22' },
    { id: 'B-2026-04-G4', block: 19847230, time: 'Yesterday 14:08' },
    { id: 'B-2026-04-F1', block: 19847218, time: 'Yesterday 11:45' },
    { id: 'B-2026-04-E7', block: 19847205, time: 'Yesterday 09:30' },
  ];

  const handleAnchor = () => {
    setTransactionState('pending');
    callbacks.showToast('Submitting anchor transaction to Voltus Private Ethereum…', 'info');
    setTimeout(() => {
      setTransactionState('confirmed');
      callbacks.showToast(`Batch ${selectedBatch} anchored on-chain`, 'success');
      setTimeout(() => setCurrentStep(3), 500);
    }, 2000);
  };

  const filteredBatches = sorBatches.filter((batch) => {
    if (batchFilter === 'ready') return batch.qaStatus === 'pass';
    if (batchFilter === 'review') return batch.qaStatus === 'review';
    return true;
  });

  return (
    <div className="ds-page">
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="ds-page-inner-narrow">
        {/* Header */}
        <motion.div variants={fadeInUp} className="ds-page-header">
          <div>
            <h1 className="ds-title">
              <span className="ds-title-icon">
                <Layers className="h-5 w-5 text-primary" />
              </span>
              Batch Minting Console
            </h1>
            <p className="ds-subtitle">Anchor SAP batches to Voltus Private Ethereum</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs bg-card px-4 py-2 rounded-lg border border-border max-w-full">
            <Server size={14} className="text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">ProvenanceRegistry.sol</span>
            <span className="text-foreground font-mono break-all">0xDef2...3B7f</span>
          </div>
        </motion.div>

        {/* Step Indicator */}
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
                <div className={`ds-step-num ${
                  currentStep > step.num ? 'bg-green-500 text-white' : ''
                }`}>
                  {currentStep > step.num ? <Check size={12} /> : step.num}
                </div>
                <span className="hidden sm:block">{step.label}</span>
              </motion.div>
              {i < 2 && <ChevronRight size={16} className="text-muted-foreground hidden sm:block shrink-0" />}
            </React.Fragment>
          ))}
        </motion.div>

        {/* Step 1: Select Batch */}
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-4"
            >
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Database size={16} className="text-blue-600 dark:text-blue-400" />
                  <p className="text-sm text-blue-700 dark:text-blue-300"><span className="font-semibold">Data from SAP</span> · synced 8 min ago</p>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  {filteredBatches.length} shown · {sorBatches.filter(b => b.qaStatus === 'pass').length} ready to anchor
                </p>
              </div>

              <FilterBar
                filters={[
                  { id: 'all', label: 'All Batches' },
                  { id: 'ready', label: 'QA Pass' },
                  { id: 'review', label: 'Needs Review' },
                ]}
                active={batchFilter}
                onChange={(id) => {
                  setBatchFilter(id);
                  const count = sorBatches.filter((b) => {
                    if (id === 'ready') return b.qaStatus === 'pass';
                    if (id === 'review') return b.qaStatus === 'review';
                    return true;
                  }).length;
                  callbacks.showToast(
                    `${id === 'all' ? 'All batches' : id === 'ready' ? 'QA pass' : 'Needs review'} · ${count} shown`,
                    'info',
                  );
                }}
              />

              <div className="ds-card overflow-hidden">
                <div className="ds-table-wrap">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-3 py-2.5 text-left font-semibold text-foreground">Batch ID</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-foreground">Material</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-foreground hidden md:table-cell">Plant</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-foreground">Units</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-foreground hidden lg:table-cell">Mfg Window</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-foreground">QA</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence mode="popLayout">
                      {filteredBatches.map((batch) => (
                        <motion.tr
                          key={batch.id}
                          layout
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 8 }}
                          transition={{ duration: 0.25, ease: progressEase }}
                          whileHover={{ backgroundColor: 'var(--accent)', x: 2 }}
                          onClick={() => {
                            setSelectedBatch(batch.id);
                            setCurrentStep(2);
                            callbacks.showToast(`Selected ${batch.id} — building Merkle tree`, 'info');
                          }}
                          className="border-b border-border cursor-pointer transition-colors"
                        >
                          <td className="px-3 py-2.5 font-mono font-semibold text-primary">
                            {batch.id}
                            <span className="ds-table-cell-sub">{batch.plant} · {batch.mfgWindow}</span>
                          </td>
                          <td className="px-3 py-2.5 text-foreground">{batch.material}</td>
                          <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell">{batch.plant}</td>
                          <td className="px-3 py-2.5 text-foreground font-medium">{batch.unitCount}</td>
                          <td className="px-3 py-2.5 text-muted-foreground text-xs hidden lg:table-cell">{batch.mfgWindow}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              batch.qaStatus === 'pass' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                              'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            }`}>
                              {batch.qaStatus === 'pass' ? 'Pass' : 'Review'}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Build Tree */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              exit="exit"
              className="ds-grid-2"
            >
              {/* Merkle Tree Visualization */}
              <MotionCard>
                <div className="flex items-center gap-2 mb-2">
                  <Trees size={18} className="text-primary" />
                  <h3 className="font-semibold text-foreground">Merkle Tree</h3>
                </div>
                <div className="bg-gradient-to-b from-muted/50 to-transparent rounded-lg border border-border p-4 flex flex-col items-center gap-3">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ds-chip ds-chip-primary"
                  >
                    0xA7F3...9B21
                  </motion.div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Root (32 bytes only)</p>
                  
                  <div className="text-center text-muted-foreground text-xs space-y-1">
                    <p>├─ h(L1·L2)</p>
                    <p>│  ├─ L1: SKF-6205-2RS-001</p>
                    <p>│  └─ L2: SKF-6205-2RS-002</p>
                    <p>└─ h(L3·L4)</p>
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-xs text-green-700 dark:text-green-300 font-medium">Zero PII on chain</p>
                  </div>
                </div>
              </MotionCard>

              {/* Per-Unit Preview */}
              <MotionCard delay={0.08}>
                <div className="flex items-center gap-2 mb-2">
                  <Database size={18} className="text-primary" />
                  <h3 className="font-semibold text-foreground">Per-Unit SOR Preview</h3>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                  {sorUnitPreview.map((unit, i) => (
                    <motion.div
                      key={unit.unit}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06, ease: progressEase }}
                      whileHover={{ x: 2 }}
                      className="bg-muted/50 rounded-lg p-3 border border-border"
                    >
                      <p className="text-xs font-mono font-semibold text-foreground">{unit.serial}</p>
                      <p className="text-xs text-muted-foreground mt-1">{unit.spec}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className={`text-xs font-medium ${unit.qa === 'Pass' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>QA: {unit.qa}</span>
                        <span className="text-xs text-muted-foreground">{unit.operator}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </MotionCard>

              {/* Action */}
              <motion.div variants={fadeInUp} className="lg:col-span-2 ds-actions">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setCurrentStep(3);
                    callbacks.showToast('Merkle tree built — ready to anchor', 'success');
                  }}
                  className="ds-btn-lg ds-btn-primary"
                >
                  Review & Anchor <ChevronRight size={16} />
                </motion.button>
              </motion.div>
            </motion.div>
          )}

          {/* Step 3: Anchor */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              exit="exit"
              className="ds-grid-3"
            >
              <div className="lg:col-span-2 space-y-4">
                <MotionCard className="p-4 space-y-4">
                  <h3 className="font-semibold text-foreground">Anchor Details</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Contract</p>
                      <p className="font-mono text-sm font-bold text-foreground mt-1">ProvenanceRegistry.sol</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Network</p>
                      <p className="text-sm font-bold text-foreground mt-1">Voltus Private Ethereum</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Signing DID</p>
                      <p className="font-mono text-sm font-semibold text-foreground mt-1">did:voltus:plant:sw7</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Batch</p>
                      <p className="font-mono text-sm font-bold text-primary mt-1">{selectedBatch}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                    <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
                    <div>
                      <p className="text-sm font-semibold text-green-900 dark:text-green-100">DAO Authorized</p>
                      <p className="text-xs text-green-700 dark:text-green-300">Multi-sig quorum met · 4/5 signatures</p>
                    </div>
                  </div>
                </MotionCard>

                {transactionState === 'idle' && (
                  <motion.div variants={fadeInUp} className="ds-actions">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleAnchor}
                      className="ds-btn-lg ds-btn-primary"
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
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="w-12 h-12 border-4 border-transparent border-t-primary border-r-primary/50 rounded-full"
                    />
                    <p className="font-semibold text-blue-900 dark:text-blue-100">Submitting transaction...</p>
                  </motion.div>
                )}

                {transactionState === 'confirmed' && (
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
                        <p className="font-mono font-bold text-foreground">19847291</p>
                      </div>
                      <div className="bg-white dark:bg-card rounded-lg p-3 border border-green-200 dark:border-green-800">
                        <p className="text-xs text-muted-foreground">Merkle Root</p>
                        <p className="font-mono font-bold text-foreground text-sm">0xA7F3...9B21</p>
                      </div>
                    </div>
                    <div className="ds-actions mt-3">
                      <button
                        onClick={() => {
                          setCurrentStep(1);
                          setTransactionState('idle');
                          setSelectedBatch(null);
                          callbacks.showToast('Ready to anchor another batch', 'info');
                        }}
                        className="ds-btn-md ds-btn-secondary"
                      >
                        Anchor Another Batch
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Activity Log */}
              <MotionCard>
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={18} className="text-primary" />
                  <h3 className="font-semibold text-foreground">Recent Anchors</h3>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
                  {recentAnchors.map((anchor) => (
                    <button
                      key={anchor.id}
                      type="button"
                      onClick={() => callbacks.showToast(`Anchor ${anchor.id} confirmed at block ${anchor.block}`, 'success')}
                      className="w-full text-left pb-2 border-b border-border last:border-0 hover:bg-muted/30 rounded-md px-1 -mx-1 transition-colors"
                    >
                      <p className="font-mono text-xs font-semibold text-primary">{anchor.id}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Block {anchor.block} · {anchor.time}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <CheckCircle2 size={12} className="text-green-600 dark:text-green-400" />
                        <p className="text-[10px] text-muted-foreground">Confirmed</p>
                      </div>
                    </button>
                  ))}
                </div>
              </MotionCard>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ============================================
// REMAINING SCREENS (Simplified for brevity)
// ============================================

function InstallBaseScreen({ callbacks }: { callbacks: ScreenCallbacks }) {
  const [activeFilter, setActiveFilter] = useState('all');

  const censusRows = [
    { id: '1', customer: 'Autohaus Müller GmbH', material: 'SKF-6205-2RS', brand: 'SKF', units: 1247, verified: 96, lastScan: '2 hours ago', region: 'EU' as const, ageMonths: 38 },
    { id: '2', customer: 'BMW AG', material: 'FAG-6202-2RS', brand: 'FAG', units: 8432, verified: 99, lastScan: '15 min ago', region: 'EU' as const, ageMonths: 52 },
    { id: '3', customer: 'Continental AG', material: 'NSK-6206-2Z', brand: 'NSK', units: 3891, verified: 94, lastScan: '1 day ago', region: 'EU' as const, ageMonths: 41 },
    { id: '4', customer: 'Mercedes-Benz Group', material: 'SKF-6308-2RS', brand: 'SKF', units: 5621, verified: 97, lastScan: '45 min ago', region: 'EU' as const, ageMonths: 47 },
    { id: '5', customer: 'Volkswagen AG', material: 'FAG-6205-C3', brand: 'FAG', units: 7104, verified: 98, lastScan: '3 hours ago', region: 'EU' as const, ageMonths: 44 },
    { id: '6', customer: 'ZF Friedrichshafen', material: 'NSK-6205-2Z', brand: 'NSK', units: 2847, verified: 91, lastScan: '6 hours ago', region: 'EU' as const, ageMonths: 36 },
    { id: '7', customer: 'Bosch Automotive', material: 'SKF-6206-2RS', brand: 'SKF', units: 4523, verified: 95, lastScan: 'Yesterday', region: 'EU' as const, ageMonths: 29 },
    { id: '8', customer: 'Schaeffler AG', material: 'FAG-6208-2RS', brand: 'FAG', units: 3290, verified: 93, lastScan: 'Yesterday', region: 'EU' as const, ageMonths: 33 },
    { id: '9', customer: 'AutoParts Bayern', material: 'SKF-6204-2RS', brand: 'SKF', units: 1876, verified: 88, lastScan: '2 days ago', region: 'EU' as const, ageMonths: 18 },
    { id: '10', customer: 'Italia Parts S.r.l.', material: 'NSK-6208-2Z', brand: 'NSK', units: 1543, verified: 86, lastScan: '2 days ago', region: 'EU' as const, ageMonths: 11 },
    { id: '11', customer: 'Eastern Motors Sp. z o.o.', material: 'FAG-6203-2RS', brand: 'FAG', units: 982, verified: 82, lastScan: '3 days ago', region: 'EU' as const, ageMonths: 9 },
    { id: '12', customer: 'Pacific Parts Ltd', material: 'SKF-6210-2RS', brand: 'SKF', units: 89, verified: 74, lastScan: '4 days ago', region: 'US' as const, ageMonths: 6 },
  ];

  const filteredCensus = censusRows.filter((row) => {
    if (activeFilter === 'eu') return row.region === 'EU';
    if (activeFilter === 'recent') return row.ageMonths <= 12;
    return true;
  });

  const totalUnits = filteredCensus.reduce((sum, row) => sum + row.units, 0);
  const weightedVerified = totalUnits
    ? filteredCensus.reduce((sum, row) => sum + row.verified * row.units, 0) / totalUnits
    : 0;
  const dueReplacement = filteredCensus
    .filter((row) => row.verified < 90)
    .reduce((sum, row) => sum + Math.round(row.units * 0.12), 0);
  const avgAge = filteredCensus.length
    ? filteredCensus.reduce((sum, row) => sum + row.ageMonths, 0) / filteredCensus.length
    : 0;

  const kpis = [
    { label: 'Units Active', value: totalUnits.toLocaleString(), delta: activeFilter === 'all' ? '+2.3%' : `${filteredCensus.length} accounts`, trend: 'up' as const, hint: 'prov__unit_count' },
    { label: 'Verified', value: `${weightedVerified.toFixed(1)}%`, delta: activeFilter === 'all' ? '+0.8%' : 'weighted', trend: weightedVerified >= 90 ? 'up' as const : 'down' as const, hint: 'prov__verify_rate' },
    { label: 'Due for Replacement', value: dueReplacement.toLocaleString(), delta: activeFilter === 'all' ? '+15%' : '< 90% verified', trend: 'up' as const, hint: 'model__replacement_due' },
    { label: 'Avg Age (months)', value: avgAge.toFixed(1), delta: activeFilter === 'recent' ? '≤ 12 mo cohort' : '-2.1', trend: avgAge > 30 ? 'down' as const : 'up' as const, hint: 'ib__avg_age' },
  ];

  const ageBuckets = [
    { label: '0–12 mo', count: filteredCensus.filter((r) => r.ageMonths <= 12).length },
    { label: '13–24 mo', count: filteredCensus.filter((r) => r.ageMonths > 12 && r.ageMonths <= 24).length },
    { label: '25–36 mo', count: filteredCensus.filter((r) => r.ageMonths > 24 && r.ageMonths <= 36).length },
    { label: '37+ mo', count: filteredCensus.filter((r) => r.ageMonths > 36).length },
  ];
  const maxAgeBucket = Math.max(...ageBuckets.map((b) => b.count), 1);

  const regionBuckets = [
    { label: 'EU', units: filteredCensus.filter((r) => r.region === 'EU').reduce((s, r) => s + r.units, 0) },
    { label: 'US', units: filteredCensus.filter((r) => r.region === 'US').reduce((s, r) => s + r.units, 0) },
  ];
  const maxRegionUnits = Math.max(...regionBuckets.map((b) => b.units), 1);

  const replacementForecast = filteredCensus
    .filter((r) => r.verified < 92)
    .slice(0, 4)
    .map((r) => ({ label: r.brand, units: Math.round(r.units * (1 - r.verified / 100)) }));
  const maxReplacement = Math.max(...replacementForecast.map((r) => r.units), 1);

  const filterLabels: Record<string, string> = {
    all: 'All Materials',
    eu: 'EU Region',
    recent: 'Last 12 months',
  };

  return (
    <div className="ds-page">
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="ds-page-inner-wide">
        <motion.div variants={fadeInUp}>
          <h1 className="ds-title">
            <span className="ds-title-icon"><BarChart3 className="h-5 w-5 text-primary" /></span>
            Install-Base Census
          </h1>
          <p className="ds-subtitle">Predictive installed-base intelligence</p>
        </motion.div>

        <FilterBar
          filters={[
            { id: 'all', label: 'All Materials' },
            { id: 'eu', label: 'EU Region' },
            { id: 'recent', label: 'Last 12 months' },
          ]}
          active={activeFilter}
          onChange={(id) => {
            setActiveFilter(id);
            const count = censusRows.filter((row) => {
              if (id === 'eu') return row.region === 'EU';
              if (id === 'recent') return row.ageMonths <= 12;
              return true;
            }).length;
            callbacks.showToast(`${filterLabels[id]} · ${count} of ${censusRows.length} accounts`, 'info');
          }}
        />

        <motion.p
          key={activeFilter}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-muted-foreground -mt-2"
        >
          Showing <span className="font-semibold text-foreground">{filteredCensus.length}</span> of {censusRows.length} accounts · {filterLabels[activeFilter]}
        </motion.p>

        {/* KPIs — recalculated from filtered census */}
        <motion.div key={`kpi-${activeFilter}`} variants={fadeInUp} initial="initial" animate="animate" className="ds-kpi-grid">
          {kpis.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="ds-card p-4 hover:shadow-lg hover:shadow-primary/5 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{kpi.label}</p>
                {kpi.trend === 'up' ? (
                  <TrendingUp size={16} className="text-green-500" />
                ) : (
                  <TrendingDown size={16} className="text-red-500" />
                )}
              </div>
              <motion.p
                key={kpi.value}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg sm:text-xl font-bold text-foreground"
              >
                {kpi.value}
              </motion.p>
              <p className={`text-xs font-medium mt-1 ${kpi.trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {kpi.delta}{activeFilter === 'all' && kpi.label !== 'Units Active' ? ' vs last period' : ''}
              </p>
              <p className="text-[10px] text-muted-foreground mt-2 font-mono">{kpi.hint}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Charts — driven by filtered data */}
        <motion.div key={`charts-${activeFilter}`} variants={fadeInUp} initial="initial" animate="animate" className="ds-grid-3">
          <MotionCard delay={0.05}>
            <h3 className="font-semibold text-foreground mb-3">Age Distribution</h3>
            <div className="h-48 flex items-end justify-between gap-2 px-1">
              {ageBuckets.map((bucket, i) => (
                <div key={bucket.label} className="flex-1 flex flex-col items-center gap-1.5">
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: `${(bucket.count / maxAgeBucket) * 140}px`, opacity: 1 }}
                    transition={{ duration: 0.55, delay: i * 0.08, ease: progressEase }}
                    className="w-full bg-primary/80 rounded-t-md min-h-[4px]"
                  />
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.08 }} className="text-[10px] text-muted-foreground text-center leading-tight">{bucket.label}</motion.span>
                  <motion.span key={bucket.count} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.08 }} className="text-xs font-semibold text-foreground">{bucket.count}</motion.span>
                </div>
              ))}
            </div>
          </MotionCard>

          <MotionCard delay={0.1}>
            <h3 className="font-semibold text-foreground mb-3">Regional Deployment</h3>
            <div className="h-48 flex flex-col justify-center gap-4 px-2">
              {regionBuckets.map((region, i) => (
                <div key={region.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-foreground">{region.label}</span>
                    <span className="text-muted-foreground">{region.units.toLocaleString()} units</span>
                  </div>
                  <MotionProgressFill
                    value={(region.units / maxRegionUnits) * 100}
                    barClassName={region.label === 'EU' ? 'bg-primary' : 'bg-amber-500'}
                    trackClassName="h-3 bg-muted rounded-full overflow-hidden w-full"
                    delay={i * 0.12}
                  />
                </div>
              ))}
            </div>
          </MotionCard>

          <MotionCard delay={0.15}>
            <h3 className="font-semibold text-foreground mb-3">Replacement Forecast</h3>
            <div className="h-48 flex flex-col justify-center gap-3 px-2">
              {replacementForecast.length > 0 ? replacementForecast.map((item, i) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-mono font-medium text-foreground">{item.label}</span>
                    <span className="text-muted-foreground">{item.units} at risk</span>
                  </div>
                  <MotionProgressFill
                    value={(item.units / maxReplacement) * 100}
                    barClassName="bg-amber-500"
                    trackClassName="h-2.5 bg-muted rounded-full overflow-hidden w-full"
                    delay={i * 0.1}
                  />
                </div>
              )) : (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted-foreground text-center">No replacement risk in this cohort</motion.p>
              )}
            </div>
          </MotionCard>
        </motion.div>

        {/* Census Table */}
        <motion.div variants={fadeInUp} className="ds-card overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border flex items-center justify-between gap-2">
            <h3 className="font-semibold text-foreground">Census by Material & Customer</h3>
            <span className="text-xs text-muted-foreground">{filteredCensus.length} rows</span>
          </div>
          <div className="ds-table-wrap">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-3 py-2.5 text-left font-semibold text-foreground">Customer</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-foreground">Material</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-foreground">Units</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-foreground hidden md:table-cell">Verified %</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-foreground hidden lg:table-cell">Age</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-foreground hidden lg:table-cell">Last Scan</th>
                </tr>
              </thead>
              <tbody key={activeFilter}>
                {filteredCensus.map((row, i) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-3 py-2.5 font-medium text-foreground">
                      {row.customer}
                      <span className="ds-table-cell-sub">{row.verified}% verified · {row.ageMonths} mo · {row.lastScan}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-primary">{row.material}</td>
                    <td className="px-3 py-2.5 text-foreground">{row.units.toLocaleString()}</td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <MotionProgressFill
                          value={row.verified}
                          barClassName={row.verified >= 90 ? 'bg-green-500' : 'bg-amber-500'}
                          trackClassName="flex-1 bg-muted rounded-full h-2 overflow-hidden max-w-20"
                          delay={i * 0.04}
                          duration={0.5}
                        />
                        <span className="text-muted-foreground">{row.verified}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground hidden lg:table-cell">{row.ageMonths} mo</td>
                    <td className="px-3 py-2.5 text-muted-foreground hidden lg:table-cell">{row.lastScan}</td>
                  </motion.tr>
                ))}
                {filteredCensus.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                      No accounts match this filter
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

type MapRegionStatus = 'ok' | 'warning' | 'fail';

interface MapRegion {
  id: string;
  name: string;
  hub: string;
  x: number;
  y: number;
  scans: number;
  fails: number;
  status: MapRegionStatus;
}

const STATUS_COLORS: Record<MapRegionStatus, { fill: string; stroke: string; glow: string }> = {
  ok: { fill: '#10b981', stroke: '#059669', glow: 'rgba(16, 185, 129, 0.35)' },
  warning: { fill: '#f59e0b', stroke: '#d97706', glow: 'rgba(245, 158, 11, 0.4)' },
  fail: { fill: '#ef4444', stroke: '#dc2626', glow: 'rgba(239, 68, 68, 0.45)' },
};

function RegionalScanMap({
  regions,
  highlightIds,
  onRegionClick,
}: {
  regions: MapRegion[];
  highlightIds?: Set<string>;
  onRegionClick?: (region: MapRegion) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hovered = regions.find((r) => r.id === hoveredId);

  const maxScans = Math.max(...regions.map((r) => r.scans), 1);

  return (
    <div className="ds-geo-map h-72 sm:h-80">
      <div className="ds-geo-map-grid" aria-hidden />
      <div className="ds-geo-map-vignette" aria-hidden />

      <svg viewBox="0 0 520 360" className="ds-geo-map-svg" role="img" aria-label="European regional scan activity map">
        <defs>
          <linearGradient id="geo-ocean" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.96 0.02 250)" />
            <stop offset="100%" stopColor="oklch(0.93 0.025 245)" />
          </linearGradient>
          <filter id="geo-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {regions.map((region) => (
            <radialGradient key={`grad-${region.id}`} id={`heat-${region.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={STATUS_COLORS[region.status].glow} stopOpacity="0.9" />
              <stop offset="70%" stopColor={STATUS_COLORS[region.status].glow} stopOpacity="0.2" />
              <stop offset="100%" stopColor={STATUS_COLORS[region.status].glow} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>

        <rect width="520" height="360" fill="url(#geo-ocean)" />

        {/* Simplified Western & Central Europe landmass */}
        <g
          className="[&_path]:fill-[oklch(0.94_0.008_240)] [&_path]:stroke-[oklch(0.82_0.01_240)] dark:[&_path]:fill-[oklch(0.28_0.02_240)] dark:[&_path]:stroke-[oklch(0.38_0.02_240)]"
          strokeWidth="0.75"
          strokeLinejoin="round"
        >
          <path d="M168,28 L218,22 L268,32 L298,52 L288,78 L248,82 L208,72 L178,52 Z" />
          <path d="M108,88 L132,80 L148,92 L142,112 L124,122 L102,114 L96,98 Z" />
          <path d="M82,108 L94,100 L100,112 L92,124 L80,118 Z" />
          <path d="M132,128 L178,122 L192,148 L186,188 L158,208 L128,192 L122,158 Z" />
          <path d="M98,198 L128,192 L142,222 L132,258 L102,268 L86,238 Z" />
          <path d="M188,188 L212,182 L224,218 L228,268 L214,288 L198,252 L190,212 Z" />
          <path d="M168,108 L238,100 L262,118 L256,152 L228,162 L192,152 L162,132 Z" />
          <path d="M262,98 L322,92 L342,118 L332,152 L292,148 L268,128 Z" />
          <path d="M238,152 L278,148 L292,172 L278,198 L248,192 L234,168 Z" />
          <path d="M248,198 L288,192 L302,218 L286,242 L258,236 Z" />
        </g>

        {/* Scan flow arcs — hub routing */}
        <g fill="none" stroke="oklch(0.55 0.22 25 / 22%)" strokeWidth="1" strokeDasharray="4 5">
          {regions.filter((r) => r.id !== 'de').map((region) => {
            const hub = regions.find((r) => r.id === 'de')!;
            return (
              <path
                key={`flow-${region.id}`}
                d={`M${hub.x},${hub.y} Q${(hub.x + region.x) / 2},${(hub.y + region.y) / 2 - 18} ${region.x},${region.y}`}
                opacity={highlightIds && !highlightIds.has(region.id) ? 0.15 : 0.55}
              />
            );
          })}
        </g>

        {/* Heat halos */}
        {regions.map((region, i) => {
          const dimmed = highlightIds && !highlightIds.has(region.id);
          const radius = 14 + (region.scans / maxScans) * 28;
          return (
            <motion.circle
              key={`halo-${region.id}`}
              cx={region.x}
              cy={region.y}
              r={radius}
              fill={`url(#heat-${region.id})`}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: dimmed ? 0.12 : 0.75, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.06, duration: 0.5 }}
            />
          );
        })}

        {/* Precision pins */}
        {regions.map((region, i) => {
          const colors = STATUS_COLORS[region.status];
          const dimmed = highlightIds && !highlightIds.has(region.id);
          const isHovered = hoveredId === region.id;
          return (
            <motion.g
              key={region.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: dimmed ? 0.35 : 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.05 }}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredId(region.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onRegionClick?.(region)}
              filter={isHovered ? 'url(#geo-glow)' : undefined}
            >
              {region.status === 'fail' && !dimmed && (
                <motion.circle
                  cx={region.x}
                  cy={region.y}
                  r={10}
                  fill="none"
                  stroke={colors.stroke}
                  strokeWidth="1"
                  initial={{ opacity: 0.7, r: 10 }}
                  animate={{ opacity: 0, r: 26 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
              <line
                x1={region.x}
                y1={region.y - 2}
                x2={region.x}
                y2={region.y - 16}
                stroke={colors.stroke}
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity={0.85}
              />
              <circle cx={region.x} cy={region.y - 18} r={isHovered ? 5.5 : 4.5} fill={colors.fill} stroke="white" strokeWidth="1.75" />
              <circle cx={region.x} cy={region.y - 18} r={1.5} fill="white" opacity={0.9} />
              <text
                x={region.x}
                y={region.y + 14}
                textAnchor="middle"
                fontSize="8"
                fontWeight="600"
                className="fill-muted-foreground"
                opacity={dimmed ? 0.4 : 0.9}
              >
                {region.name}
              </text>
            </motion.g>
          );
        })}
      </svg>

      <AnimatePresence>
        {hovered && (
          <motion.div
            key={hovered.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="ds-geo-tooltip"
            style={{
              left: `${(hovered.x / 520) * 100}%`,
              top: `${(hovered.y / 360) * 100 - 18}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <MapPin size={12} className="text-primary shrink-0" />
              <span className="text-xs font-semibold text-foreground">{hovered.hub}</span>
              <span
                className={`ml-auto text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                  hovered.status === 'fail'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                    : hovered.status === 'warning'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                }`}
              >
                {hovered.status}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">{hovered.name}</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
              <span className="text-muted-foreground">Scans</span>
              <span className="font-semibold text-foreground text-right">{hovered.scans.toLocaleString()}</span>
              <span className="text-muted-foreground">Failures</span>
              <span className={`font-semibold text-right ${hovered.fails > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                {hovered.fails}
              </span>
              <span className="text-muted-foreground">Fail rate</span>
              <span className="font-semibold text-foreground text-right">
                {((hovered.fails / hovered.scans) * 100).toFixed(2)}%
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="ds-geo-map-footer">
        <span className="flex items-center gap-1.5">
          <Globe size={11} className="text-primary" />
          European distribution network
        </span>
        <span className="font-mono tabular-nums">
          {regions.reduce((s, r) => s + r.scans, 0).toLocaleString()} scans · {regions.filter((r) => r.status !== 'ok').length} active signals
        </span>
      </div>
    </div>
  );
}

function ChannelMapScreen({ callbacks }: { callbacks: ScreenCallbacks }) {
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [alertFilter, setAlertFilter] = useState('all');

  const alerts = [
    { id: '1', type: 'fail-cluster', location: 'Munich', distributor: 'AutoParts Bayern', count: 23, severity: 'high' },
    { id: '2', type: 'out-of-region', location: 'Warsaw', distributor: 'Eastern Motors', count: 8, severity: 'medium' },
    { id: '3', type: 'fail-cluster', location: 'Milan', distributor: 'Italia Parts', count: 15, severity: 'high' },
    { id: '4', type: 'fail-cluster', location: 'Hamburg', distributor: 'Nordsee Parts', count: 11, severity: 'medium' },
    { id: '5', type: 'out-of-region', location: 'Prague', distributor: 'Czech Motors', count: 6, severity: 'medium' },
    { id: '6', type: 'fail-cluster', location: 'Lyon', distributor: 'Rhône Distribution', count: 9, severity: 'high' },
    { id: '7', type: 'out-of-region', location: 'Bucharest', distributor: 'Balkan Auto', count: 4, severity: 'low' },
    { id: '8', type: 'fail-cluster', location: 'Stuttgart', distributor: 'Swabia Bearings', count: 18, severity: 'high' },
  ];

  const filteredAlerts = alerts.filter((alert) => {
    if (alertFilter === 'fail') return alert.type === 'fail-cluster';
    if (alertFilter === 'oor') return alert.type === 'out-of-region';
    if (alertFilter === 'high') return alert.severity === 'high';
    return true;
  });

  const regions: MapRegion[] = [
    { id: 'de', name: 'Germany', hub: 'Stuttgart', x: 210, y: 132, scans: 12847, fails: 23, status: 'fail' },
    { id: 'fr', name: 'France', hub: 'Lyon', x: 158, y: 168, scans: 8432, fails: 0, status: 'ok' },
    { id: 'it', name: 'Italy', hub: 'Milan', x: 212, y: 228, scans: 6891, fails: 15, status: 'fail' },
    { id: 'pl', name: 'Poland', hub: 'Warsaw', x: 288, y: 118, scans: 4521, fails: 8, status: 'warning' },
    { id: 'es', name: 'Spain', hub: 'Barcelona', x: 118, y: 232, scans: 5234, fails: 0, status: 'ok' },
    { id: 'uk', name: 'United Kingdom', hub: 'London', x: 122, y: 102, scans: 6120, fails: 3, status: 'ok' },
    { id: 'nl', name: 'Netherlands', hub: 'Rotterdam', x: 178, y: 108, scans: 3890, fails: 1, status: 'ok' },
    { id: 'cz', name: 'Czechia', hub: 'Prague', x: 258, y: 148, scans: 2145, fails: 6, status: 'warning' },
  ];

  const highlightedRegionIds = alertFilter === 'all'
    ? undefined
    : new Set(
        regions
          .filter((region) => {
            if (alertFilter === 'fail') return region.status === 'fail';
            if (alertFilter === 'oor') return region.status === 'warning';
            if (alertFilter === 'high') return region.status === 'fail';
            return true;
          })
          .map((region) => region.id),
      );

  return (
    <div className="ds-page">
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="ds-page-inner-wide">
        <motion.div variants={fadeInUp} className="ds-page-header">
          <div>
            <h1 className="ds-title">
              <span className="ds-title-icon"><MapIcon className="h-5 w-5 text-primary" /></span>
              Channel Integrity Map
            </h1>
            <p className="ds-subtitle">Scan-derived flow signal — not warehouse stock</p>
          </div>
        </motion.div>

        <FilterBar
          filters={[
            { id: 'all', label: 'All Alerts' },
            { id: 'fail', label: 'Fail Clusters' },
            { id: 'oor', label: 'Out-of-Region' },
            { id: 'high', label: 'High Severity' },
          ]}
          active={alertFilter}
          onChange={(id) => {
            setAlertFilter(id);
            setSelectedAlert(null);
            callbacks.showToast(
              `${id === 'all' ? 'All alerts' : id === 'fail' ? 'Fail clusters' : id === 'oor' ? 'Out-of-region' : 'High severity'} · ${alerts.filter((a) => {
                if (id === 'fail') return a.type === 'fail-cluster';
                if (id === 'oor') return a.type === 'out-of-region';
                if (id === 'high') return a.severity === 'high';
                return true;
              }).length} shown`,
              'info',
            );
          }}
        />

        {/* KPIs */}
        <motion.div key={alertFilter} variants={fadeInUp} className="ds-kpi-grid">
          {[
            { label: 'Total Scans', value: '38,925', hint: 'prov__scan_count' },
            { label: 'Fail Rate', value: '1.2%', hint: 'prov__verify_fail_rate' },
            { label: 'Out-of-Region', value: '8', hint: 'prov__out_of_region_flag' },
            { label: 'Open Alerts', value: String(filteredAlerts.length), hint: 'chan__integrity_alert_count' },
          ].map((kpi, i) => (
            <MotionKpiCard key={kpi.label} label={kpi.label} value={kpi.value} hint={kpi.hint} delay={i * 0.06} />
          ))}
        </motion.div>

        <div className="ds-grid-3">
          {/* Map */}
          <motion.div variants={fadeInUp} className="lg:col-span-2 ds-card p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Regional Scan Activity</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Live scan density across European distribution hubs</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="ds-geo-legend-dot bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                  <span>OK</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="ds-geo-legend-dot bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
                  <span>Warning</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="ds-geo-legend-dot bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
                  <span>Fail</span>
                </div>
              </div>
            </div>

            <RegionalScanMap
              regions={regions}
              highlightIds={highlightedRegionIds}
              onRegionClick={(region) => {
                callbacks.showToast(
                  `${region.hub}: ${region.scans.toLocaleString()} scans · ${region.fails} failures`,
                  region.status === 'fail' ? 'error' : region.status === 'warning' ? 'warning' : 'success',
                );
              }}
            />
          </motion.div>

          {/* Alert Feed */}
          <motion.div variants={fadeInUp} className="ds-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className="text-primary" />
              <h3 className="font-semibold text-foreground">Channel Alerts</h3>
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto scrollbar-thin">
              <AnimatePresence mode="popLayout">
              {filteredAlerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  layout
                  variants={listItem}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  whileHover={{ x: 4 }}
                  onClick={() => {
                    const next = selectedAlert === alert.id ? null : alert.id;
                    setSelectedAlert(next);
                    if (next) callbacks.showToast(`Alert selected: ${alert.location} · ${alert.distributor}`, 'warning');
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedAlert === alert.id 
                      ? 'bg-primary/10 border-primary' 
                      : 'bg-muted/30 border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      alert.type === 'fail-cluster' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                      'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                    }`}>
                      {alert.type === 'fail-cluster' ? 'Fail Cluster' : 'Out-of-Region'}
                    </span>
                    <span className={`text-xs font-bold ${
                      alert.severity === 'high' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      {alert.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground mt-2">{alert.location}</p>
                  <p className="text-xs text-muted-foreground">{alert.distributor}</p>
                  <p className="text-xs text-muted-foreground mt-1">{alert.count} scans flagged</p>
                  
                  <AnimatePresence>
                    {selectedAlert === alert.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-3 pt-3 border-t border-border"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            callbacks.showToast(`Flagged ${alert.distributor} for channel review`, 'warning');
                          }}
                          className="ds-btn-md ds-btn-danger ds-btn-block"
                        >
                          Flag Distributor for Review
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
              </AnimatePresence>
              {filteredAlerts.length === 0 && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted-foreground text-center py-6">No alerts match this filter</motion.p>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

function AccountWikiScreen({ callbacks }: { callbacks: ScreenCallbacks }) {
  const [selectedAccount, setSelectedAccount] = useState('autohaus');

  const accounts = {
    autohaus: {
      name: 'Autohaus Müller GmbH',
      role: 'Regional Distributor',
      region: 'Bavaria, DE',
      ltv: '€2.4M',
      unitsActive: 1247,
      firstSeen: '2019-03-15',
      churnRisk: 23,
      nextBestParts: [
        { name: 'SKF-6205-2RS-A42', confidence: 0.92 },
        { name: 'FAG-6206-C3', confidence: 0.78 },
        { name: 'NSK-6208-2Z', confidence: 0.65 },
      ],
    },
    bmw: {
      name: 'BMW Werkstatt München',
      role: 'OEM Service Partner',
      region: 'Bavaria, DE',
      ltv: '€8.7M',
      unitsActive: 4320,
      firstSeen: '2017-06-22',
      churnRisk: 12,
      nextBestParts: [
        { name: 'FAG-6206-2RS', confidence: 0.88 },
        { name: 'SKF-6308-2RS', confidence: 0.81 },
      ],
    },
    continental: {
      name: 'Continental AG',
      role: 'Tier-1 Supplier',
      region: 'Lower Saxony, DE',
      ltv: '€12.1M',
      unitsActive: 6891,
      firstSeen: '2016-11-03',
      churnRisk: 18,
      nextBestParts: [
        { name: 'NSK-6206-2Z', confidence: 0.90 },
        { name: 'SKF-6205-2RS', confidence: 0.76 },
        { name: 'FAG-6208-2RS', confidence: 0.69 },
      ],
    },
    pacific: {
      name: 'Pacific Parts Ltd',
      role: 'New Account',
      region: 'California, US',
      ltv: '€45K',
      unitsActive: 89,
      firstSeen: '2026-01-08',
      churnRisk: 67,
      nextBestParts: [{ name: 'SKF-6205-2RS', confidence: 0.45 }],
    },
  };

  const account = accounts[selectedAccount as keyof typeof accounts];

  const summaryText: Record<string, string> = {
    autohaus: 'Long-standing regional distributor with consistent ordering patterns. Recent service tickets suggest bearing replacements due in Q3. Cross-sell opportunity for FAG-6206 series based on fleet composition.',
    bmw: 'High-volume OEM service partner with stable scan activity. Fleet aging signals replacement wave for 6206 and 6308 series in Q2–Q3. Strong upsell potential on sealed bearing upgrades.',
    continental: 'Strategic tier-1 account with broad material coverage. Install-base census shows 6,891 active units with 94% verification rate. Proactive quoting on NSK-6206 recommended before contract renewal.',
    pacific: 'New account with limited history. Initial orders suggest focus on standard SKF bearings. Monitor closely for expansion signals.',
  };

  const churnColorClass =
    account.churnRisk > 50 ? 'text-red-500' :
    account.churnRisk > 30 ? 'text-amber-500' : 'text-green-500';

  const churnTextClass =
    account.churnRisk > 50 ? 'text-red-600 dark:text-red-400' :
    account.churnRisk > 30 ? 'text-amber-600 dark:text-amber-400' :
    'text-green-600 dark:text-green-400';

  return (
    <div className="ds-page">
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="ds-page-inner-wide">
        <motion.div variants={fadeInUp} className="ds-page-header">
          <div>
            <h1 className="ds-title">
              <span className="ds-title-icon"><Users className="h-5 w-5 text-primary" /></span>
              Account Intelligence Wiki
            </h1>
            <p className="ds-subtitle">Living account profiles with predictive insights</p>
          </div>
          <motion.div layout className="ds-filter-scroll sm:overflow-visible">
            <div className="ds-filter-bar">
            {Object.entries(accounts).map(([key, acc], i) => (
              <motion.button
                key={key}
                type="button"
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05, ease: progressEase }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setSelectedAccount(key);
                  callbacks.showToast(`Viewing ${acc.name}`, 'info');
                }}
                className={`relative ds-filter-btn ${
                  selectedAccount === key ? 'ds-filter-btn-active' : 'ds-filter-btn-inactive'
                }`}
              >
                {selectedAccount === key && (
                  <motion.span
                    layoutId="wiki-account-tab"
                    className="absolute inset-0 rounded-lg bg-primary -z-10"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                {acc.name.split(' ')[0]}
              </motion.button>
            ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Identity Band */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedAccount}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: progressEase }}
            className="ds-card p-4"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <motion.div
                  key={`avatar-${selectedAccount}`}
                  initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                  className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-xl font-bold shadow-lg shadow-primary/25"
                >
                  {account.name.charAt(0)}
                </motion.div>
                <div>
                  <motion.h2
                    key={`name-${selectedAccount}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05, ease: progressEase }}
                    className="text-xl font-bold text-foreground"
                  >
                    {account.name}
                  </motion.h2>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-wrap items-center gap-2 mt-1"
                  >
                    <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">{account.role}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Globe size={12} /> {account.region}</span>
                  </motion.div>
                </div>
              </div>
              <motion.div
                key={`metrics-${selectedAccount}`}
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="grid grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {[
                  { label: 'LTV', value: account.ltv },
                  { label: 'Units Active', value: account.unitsActive.toLocaleString() },
                  { label: 'First Seen', value: account.firstSeen },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    variants={listItem}
                    transition={{ delay: i * 0.06 }}
                    className="text-center lg:text-left"
                  >
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">{item.label}</p>
                    <motion.p
                      key={item.value}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: progressEase }}
                      className="text-lg font-bold text-foreground tabular-nums"
                    >
                      {item.value}
                    </motion.p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Predictive Row */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`predictive-${selectedAccount}`}
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            exit="exit"
            className="ds-grid-3"
          >
            {/* Churn Risk */}
            <MotionCard delay={0.05}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground">Churn Risk</h3>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => callbacks.showToast(`Churn risk ${account.churnRisk}% — driven by scan frequency decline`, 'warning')}
                  className="text-xs text-primary hover:underline"
                >
                  Why?
                </motion.button>
              </div>
              <div className="flex items-center justify-center py-1">
                <div className="relative w-32 h-32">
                  <MotionRingProgress
                    key={`churn-ring-${selectedAccount}`}
                    value={account.churnRisk}
                    size={128}
                    strokeWidth={8}
                    radius={56}
                    circumference={352}
                    colorClass={churnColorClass}
                    delay={0.15}
                    duration={0.9}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.span
                      key={`churn-val-${selectedAccount}-${account.churnRisk}`}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.35 }}
                      className={`text-3xl font-bold tabular-nums ${churnTextClass}`}
                    >
                      {account.churnRisk}
                    </motion.span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2 font-mono">model__churn_risk_score</p>
            </MotionCard>

            {/* Next Best Part */}
            <MotionCard delay={0.1}>
              <h3 className="font-semibold text-foreground mb-2">Next-Best-Part</h3>
              <div className="space-y-2.5">
                <AnimatePresence mode="popLayout">
                  {account.nextBestParts.map((part, i) => (
                    <motion.div
                      key={`${selectedAccount}-${part.name}`}
                      layout
                      initial={{ opacity: 0, x: -12, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: 'auto' }}
                      exit={{ opacity: 0, x: 8, height: 0 }}
                      transition={{ delay: i * 0.08, duration: 0.3, ease: progressEase }}
                      whileHover={{ x: 2 }}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-transparent hover:border-border/80 transition-colors"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="text-sm font-mono font-semibold text-foreground truncate">{part.name}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <MotionProgressFill
                            value={part.confidence * 100}
                            barClassName="bg-primary/80"
                            trackClassName="flex-1 max-w-[5rem] bg-muted rounded-full h-1.5 overflow-hidden"
                            delay={0.2 + i * 0.1}
                            duration={0.65}
                          />
                          <motion.span
                            key={part.confidence}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.35 + i * 0.1 }}
                            className="text-xs text-muted-foreground tabular-nums shrink-0"
                          >
                            {Math.round(part.confidence * 100)}%
                          </motion.span>
                        </div>
                      </div>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => {
                          callbacks.showToast(`Quote draft started for ${part.name}`, 'success');
                          callbacks.navigateTo('quote-workbench', { silent: true });
                        }}
                        className="ds-btn-sm ds-btn-primary shrink-0"
                      >
                        Quote
                      </motion.button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3 font-mono">model__next_best_part</p>
            </MotionCard>

            {/* AI Summary */}
            <MotionCard delay={0.15}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: [0, 8, -8, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }}
                  >
                    <Sparkles size={16} className="text-primary" />
                  </motion.span>
                  AI Summary
                </h3>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => callbacks.showToast('AI summary generated from install-base and scan signals', 'info')}
                  className="text-xs text-primary hover:underline"
                >
                  Explain
                </motion.button>
              </div>
              <motion.p
                key={`summary-${selectedAccount}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: progressEase, delay: 0.1 }}
                className="text-sm text-muted-foreground leading-relaxed"
              >
                {summaryText[selectedAccount]}
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="text-xs text-muted-foreground mt-3 font-mono"
              >
                model__narrative_summary
              </motion.p>
            </MotionCard>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function SellerWorklistScreen({ callbacks }: { callbacks: ScreenCallbacks }) {
  const [worklistFilter, setWorklistFilter] = useState('all');

  const opportunities = [
    { id: '1', customer: 'Autohaus Müller', signal: 'replacement', material: 'SKF-6205-2RS', value: '€4,200', urgency: 'high', churnRisk: 23 },
    { id: '2', customer: 'BMW Werkstatt', signal: 'service', material: 'FAG-6206-2RS', value: '€8,900', urgency: 'medium', churnRisk: 12 },
    { id: '3', customer: 'Continental AG', signal: 'churn', material: 'NSK-6206-2Z', value: '€15,400', urgency: 'high', churnRisk: 67 },
    { id: '4', customer: 'Mercedes-Benz Group', signal: 'replacement', material: 'SKF-6308-2RS', value: '€22,800', urgency: 'high', churnRisk: 15 },
    { id: '5', customer: 'ZF Friedrichshafen', signal: 'service', material: 'FAG-6205-C3', value: '€6,150', urgency: 'medium', churnRisk: 28 },
    { id: '6', customer: 'Volkswagen AG', signal: 'replacement', material: 'NSK-6205-2Z', value: '€18,200', urgency: 'high', churnRisk: 19 },
    { id: '7', customer: 'AutoParts Bayern', signal: 'churn', material: 'SKF-6204-2RS', value: '€3,800', urgency: 'high', churnRisk: 54 },
    { id: '8', customer: 'Bosch Automotive', signal: 'service', material: 'FAG-6208-2RS', value: '€11,600', urgency: 'medium', churnRisk: 21 },
    { id: '9', customer: 'Italia Parts S.r.l.', signal: 'replacement', material: 'NSK-6208-2Z', value: '€5,400', urgency: 'medium', churnRisk: 31 },
    { id: '10', customer: 'Pacific Parts Ltd', signal: 'churn', material: 'SKF-6210-2RS', value: '€2,100', urgency: 'high', churnRisk: 72 },
  ];

  const filteredOpportunities = opportunities.filter((opp) => {
    if (worklistFilter === 'churn') return opp.signal === 'churn';
    if (worklistFilter === 'replacement') return opp.signal === 'replacement';
    if (worklistFilter === 'service') return opp.signal === 'service';
    if (worklistFilter === 'high') return opp.urgency === 'high';
    return true;
  });

  return (
    <div className="ds-page">
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="ds-page-inner-wide">
        <motion.div variants={fadeInUp}>
          <h1 className="ds-title">
            <span className="ds-title-icon"><Target className="h-5 w-5 text-primary" /></span>
            Seller Worklist
          </h1>
          <p className="ds-subtitle">AI-prioritized opportunities for this week</p>
        </motion.div>

        <FilterBar
          filters={[
            { id: 'all', label: 'All' },
            { id: 'churn', label: 'Churn Risk' },
            { id: 'replacement', label: 'Replacement' },
            { id: 'service', label: 'Service' },
            { id: 'high', label: 'High Urgency' },
          ]}
          active={worklistFilter}
          onChange={(id) => {
            setWorklistFilter(id);
            const count = opportunities.filter((opp) => {
              if (id === 'churn') return opp.signal === 'churn';
              if (id === 'replacement') return opp.signal === 'replacement';
              if (id === 'service') return opp.signal === 'service';
              if (id === 'high') return opp.urgency === 'high';
              return true;
            }).length;
            callbacks.showToast(`Worklist filter: ${id} · ${count} opportunities`, 'info');
          }}
        />

        {/* KPIs */}
        <motion.div variants={fadeInUp} className="ds-kpi-grid">
          {[
            { label: 'Open Opportunities', value: '47', hint: 'worklist__open_count' },
            { label: 'Pipeline Value', value: '€412K', hint: 'worklist__pipeline_value' },
            { label: 'Avg Win Probability', value: '72%', hint: 'model__avg_win_prob' },
            { label: 'Churn Alerts', value: '8', hint: 'model__churn_alert_count' },
          ].map((kpi, i) => (
            <MotionKpiCard key={kpi.label} label={kpi.label} value={kpi.value} hint={kpi.hint} delay={i * 0.06} />
          ))}
        </motion.div>

        {/* Worklist */}
        <motion.div variants={fadeInUp} className="ds-card overflow-hidden">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              Priority Queue
              <span className="text-muted-foreground font-normal ml-1.5">({filteredOpportunities.length})</span>
            </h3>
            <motion.button
              whileTap={{ rotate: 180 }}
              transition={{ duration: 0.35 }}
              onClick={() => callbacks.showToast('Worklist refreshed from latest signals', 'success')}
              className="ds-btn-icon ds-btn-ghost"
              aria-label="Refresh worklist"
            >
              <RefreshCw size={14} className="text-muted-foreground" />
            </motion.button>
          </div>
          <div className="divide-y divide-border">
            <AnimatePresence mode="popLayout">
            {filteredOpportunities.map((opp, i) => (
              <motion.div
                key={opp.id}
                layout
                variants={listItem}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ delay: i * 0.02 }}
                className="px-3 py-2.5 hover:bg-muted/30 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{opp.customer}</p>
                      {opp.urgency === 'high' && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-1.5 py-0.5 rounded border border-border bg-muted/40">
                          High urgency
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-1.5 py-0.5 rounded border border-border bg-muted/30">
                        {opp.signal === 'churn' ? 'Churn risk' : opp.signal === 'replacement' ? 'Replacement' : 'Service'}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">{opp.material}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-bold text-foreground tabular-nums">{opp.value}</p>
                      <div className="flex items-center sm:justify-end gap-1.5 mt-1">
                        <MotionProgressFill
                          value={opp.churnRisk}
                          barClassName="bg-foreground/20"
                          trackClassName="w-12 bg-muted rounded-full h-0.5 overflow-hidden"
                          delay={i * 0.03}
                          duration={0.5}
                        />
                        <p className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">Churn {opp.churnRisk}%</p>
                      </div>
                    </div>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        callbacks.showToast(`Quote draft created for ${opp.customer}`, 'success');
                        callbacks.navigateTo('quote-workbench', { silent: true });
                      }}
                      className="ds-btn-sm ds-btn-primary shrink-0"
                    >
                      Draft Quote
                      <ArrowRight size={12} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function QuoteWorkbenchScreen({ callbacks }: { callbacks: ScreenCallbacks }) {
  const [winProbability] = useState(78);
  const [lineFilter, setLineFilter] = useState('all');

  const lineItems = [
    { id: '1', part: 'SKF-6205-2RS-A42', qty: 24, unitPrice: 42.50, sapPrice: 45.00, aiDrafted: true },
    { id: '2', part: 'FAG-6206-C3', qty: 12, unitPrice: 38.00, sapPrice: 38.00, aiDrafted: false },
    { id: '3', part: 'NSK-6205-2Z', qty: 48, unitPrice: 35.75, sapPrice: 37.50, aiDrafted: true },
    { id: '4', part: 'SKF-6308-2RS', qty: 36, unitPrice: 52.00, sapPrice: 54.50, aiDrafted: true },
    { id: '5', part: 'FAG-6205-C3', qty: 18, unitPrice: 41.80, sapPrice: 43.00, aiDrafted: false },
    { id: '6', part: 'NSK-6206-2Z', qty: 60, unitPrice: 34.25, sapPrice: 36.00, aiDrafted: true },
    { id: '7', part: 'SKF-6210-2RS', qty: 8, unitPrice: 67.25, sapPrice: 69.00, aiDrafted: false },
    { id: '8', part: 'FAG-6208-2RS', qty: 30, unitPrice: 39.50, sapPrice: 41.25, aiDrafted: true },
  ];

  const filteredLineItems = lineItems.filter((item) => {
    if (lineFilter === 'ai') return item.aiDrafted;
    if (lineFilter === 'manual') return !item.aiDrafted;
    return true;
  });

  const quoteTotal = filteredLineItems.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);

  return (
    <div className="ds-page">
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="ds-page-inner-wide">
        <motion.div variants={fadeInUp}>
          <h1 className="ds-title">
            <span className="ds-title-icon"><FileText className="h-5 w-5 text-primary" /></span>
            Quote Intelligence Workbench
          </h1>
          <p className="ds-subtitle">AI-assisted quoting with win probability</p>
        </motion.div>

        <FilterBar
          filters={[
            { id: 'all', label: 'All Lines' },
            { id: 'ai', label: 'AI Drafted' },
            { id: 'manual', label: 'Manual' },
          ]}
          active={lineFilter}
          onChange={(id) => {
            setLineFilter(id);
            const count = lineItems.filter((item) => {
              if (id === 'ai') return item.aiDrafted;
              if (id === 'manual') return !item.aiDrafted;
              return true;
            }).length;
            callbacks.showToast(`Line items: ${id} · ${count} rows`, 'info');
          }}
        />

        <div className="ds-grid-3">
          {/* Quote Editor */}
          <motion.div variants={fadeInUp} className="lg:col-span-2 space-y-4">
            {/* Customer Info */}
            <MotionCard>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground">Quote #Q-2026-0847</h3>
                <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-full">Draft</span>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Customer</p>
                  <p className="text-sm font-semibold text-foreground mt-1">Autohaus Müller GmbH</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Valid Until</p>
                  <p className="text-sm font-semibold text-foreground mt-1">2026-06-30</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Total Value</p>
                  <p className="text-lg font-bold text-primary mt-1">€{quoteTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
            </MotionCard>

            {/* Line Items */}
            <motion.div variants={fadeInUp} initial="initial" animate="animate" className="ds-card overflow-hidden">
              <div className="px-3 py-2.5 border-b border-border">
                <h3 className="font-semibold text-foreground">Line Items</h3>
              </div>
              <div className="ds-table-wrap">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-3 py-2.5 text-left font-semibold text-foreground">Part</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-foreground">Qty</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-foreground">Unit Price</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-foreground hidden md:table-cell">SAP Price</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence mode="popLayout">
                    {filteredLineItems.map((item) => (
                      <motion.tr
                        key={item.id}
                        layout
                        variants={listItem}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        onClick={() => callbacks.showToast(`${item.part} · ${item.qty} × €${item.unitPrice.toFixed(2)}`, 'info')}
                        className="border-b border-border cursor-pointer hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-foreground">{item.part}</span>
                            {item.aiDrafted && (
                              <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded">AI</span>
                            )}
                          </div>
                          <span className="ds-table-cell-sub">SAP €{item.sapPrice.toFixed(2)}</span>
                        </td>
                        <td className="px-3 py-2.5 text-foreground">{item.qty}</td>
                        <td className="px-4 py-3">
                          <span className={item.unitPrice < item.sapPrice ? 'text-green-600 dark:text-green-400' : 'text-foreground'}>
                            €{item.unitPrice.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell">€{item.sapPrice.toFixed(2)}</td>
                        <td className="px-3 py-2.5 font-semibold text-foreground">€{(item.qty * item.unitPrice).toFixed(2)}</td>
                      </motion.tr>
                    ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div variants={fadeInUp} className="ds-actions-split ds-quote-cta">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => callbacks.showToast('Quote Q-2026-0847 submitted to SAP', 'success')}
                className="ds-btn-lg ds-btn-primary sm:h-9 sm:px-4"
              >
                <Send size={17} />
                Submit to SAP
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => callbacks.showToast('Quote draft saved', 'success')}
                className="ds-btn-md ds-btn-outline"
              >
                Save Draft
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Intelligence Panel */}
          <motion.div variants={fadeInUp} className="space-y-4">
            {/* Win Probability */}
            <MotionCard delay={0.05}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground">Win Probability</h3>
                <button
                  onClick={() => callbacks.showToast(`Win probability ${winProbability}% — competitive pricing and account history`, 'info')}
                  className="text-xs text-primary hover:underline"
                >
                  Why?
                </button>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative w-28 h-28">
                  <MotionRingProgress
                    value={winProbability}
                    size={112}
                    strokeWidth={8}
                    radius={48}
                    circumference={302}
                    colorClass="text-green-500"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.span
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.45, ease: progressEase }}
                      className="text-2xl font-bold text-green-600 dark:text-green-400"
                    >
                      {winProbability}%
                    </motion.span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2 font-mono">model__win_probability</p>
            </MotionCard>

            {/* Guided Pricing */}
            <MotionCard delay={0.1}>
              <h3 className="font-semibold text-foreground mb-2">Guided Pricing</h3>
              <div className="space-y-3">
                {lineItems.map((item, i) => {
                  const optimal = item.unitPrice <= item.sapPrice;
                  const priceScore = optimal ? 100 : Math.max(20, 100 - ((item.unitPrice - item.sapPrice) / item.sapPrice) * 200);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{item.part.split('-')[0]}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          optimal
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        }`}>
                          {optimal ? 'Optimal' : 'Above target'}
                        </span>
                      </div>
                      <MotionProgressFill
                        value={priceScore}
                        barClassName={optimal ? 'bg-green-500' : 'bg-amber-500'}
                        trackClassName="h-1 bg-muted rounded-full overflow-hidden w-full"
                        delay={i * 0.06}
                        duration={0.5}
                      />
                    </motion.div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3 font-mono">model__guided_price</p>
            </MotionCard>

            {/* Turnaround */}
            <MotionCard delay={0.15}>
              <h3 className="font-semibold text-foreground mb-2">Est. Turnaround</h3>
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: progressEase }}
                className="text-2xl font-bold text-foreground"
              >
                2.3 days
              </motion.p>
              <p className="text-xs text-muted-foreground mt-1">Based on similar quotes</p>
              <p className="text-xs text-muted-foreground mt-2 font-mono">quote__turnaround_p50</p>
            </MotionCard>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

function GovernanceScreen({ callbacks }: { callbacks: ScreenCallbacks }) {
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);
  const [traceFilter, setTraceFilter] = useState('all');

  const decisionTraces = [
    { id: '1', timestamp: '2026-06-05 14:32:17', actor: 'agent', action: 'Drafted quote #Q-2026-0847', rule: 'price_guardrail', outcome: 'approved' },
    { id: '2', timestamp: '2026-06-05 14:28:45', actor: 'user:jsmith', action: 'Override price on SKF-6205', rule: 'manual_override', outcome: 'logged' },
    { id: '3', timestamp: '2026-06-05 14:15:03', actor: 'agent', action: 'Released quote #Q-2026-0846 to SAP', rule: 'sap_sync_boundary', outcome: 'approved' },
    { id: '4', timestamp: '2026-06-05 13:58:22', actor: 'agent', action: 'Flagged channel alert for AutoParts Bayern', rule: 'channel_integrity', outcome: 'approved' },
    { id: '5', timestamp: '2026-06-05 13:41:09', actor: 'user:mwagner', action: 'Approved batch anchor B-2026-04-K8', rule: 'dao_quorum', outcome: 'approved' },
    { id: '6', timestamp: '2026-06-05 13:22:55', actor: 'agent', action: 'Generated churn alert for Pacific Parts', rule: 'churn_threshold', outcome: 'approved' },
    { id: '7', timestamp: '2026-06-05 12:47:33', actor: 'user:aklein', action: 'Issued VC to Munich Service Center', rule: 'vc_issuance', outcome: 'logged' },
    { id: '8', timestamp: '2026-06-05 12:15:18', actor: 'agent', action: 'Recommended SKF-6308 for BMW Werkstatt', rule: 'next_best_part', outcome: 'approved' },
    { id: '9', timestamp: '2026-06-05 11:58:44', actor: 'agent', action: 'Blocked suspect scan SKF-6205-2RS-X99', rule: 'verify_fail', outcome: 'approved' },
    { id: '10', timestamp: '2026-06-05 11:30:02', actor: 'user:jsmith', action: 'Updated price guardrail to ±12%', rule: 'config_change', outcome: 'logged' },
  ];

  const configHistory = [
    { version: 'v2.4.1', changedBy: 'admin@voltus.io', changedAt: '2026-06-01', setting: 'action_boundary', value: 'recommend' },
    { version: 'v2.4.0', changedBy: 'admin@voltus.io', changedAt: '2026-05-28', setting: 'price_guardrail', value: '±15%' },
    { version: 'v2.3.9', changedBy: 'admin@voltus.io', changedAt: '2026-05-20', setting: 'churn_threshold', value: '50%' },
    { version: 'v2.3.8', changedBy: 'mwagner@voltus.io', changedAt: '2026-05-14', setting: 'dao_quorum', value: '4 of 5' },
    { version: 'v2.3.7', changedBy: 'admin@voltus.io', changedAt: '2026-05-08', setting: 'verify_fail_rate', value: '2.0%' },
    { version: 'v2.3.6', changedBy: 'aklein@voltus.io', changedAt: '2026-04-30', setting: 'sap_sync_interval', value: '15 min' },
  ];

  const filteredTraces = decisionTraces.filter((trace) => {
    if (traceFilter === 'agent') return trace.actor === 'agent';
    if (traceFilter === 'user') return trace.actor.startsWith('user:');
    if (traceFilter === 'approved') return trace.outcome === 'approved';
    if (traceFilter === 'logged') return trace.outcome === 'logged';
    return true;
  });

  const anchorLog = [
    { batchId: 'B-2026-04-K9', root: '0xA7F3...9B21', block: 19847291, did: 'did:voltus:plant:sw7', timestamp: '2026-06-05 08:32' },
    { batchId: 'B-2026-04-K8', root: '0xB8E2...4C12', block: 19847280, did: 'did:voltus:plant:sw7', timestamp: '2026-06-05 08:15' },
    { batchId: 'B-2026-04-J7', root: '0xC9D1...5E23', block: 19847268, did: 'did:voltus:plant:sw7', timestamp: '2026-06-05 07:58' },
    { batchId: 'B-2026-04-M1', root: '0xD0E4...6F34', block: 19847255, did: 'did:voltus:plant:st1', timestamp: '2026-06-05 07:41' },
    { batchId: 'B-2026-04-L2', root: '0xE1F5...7A45', block: 19847241, did: 'did:voltus:plant:sw7', timestamp: '2026-06-04 16:22' },
    { batchId: 'B-2026-04-H9', root: '0xF2A6...8B56', block: 19847230, did: 'did:voltus:plant:st1', timestamp: '2026-06-04 14:08' },
    { batchId: 'B-2026-04-G4', root: '0xA3B7...9C67', block: 19847218, did: 'did:voltus:plant:sw7', timestamp: '2026-06-04 11:45' },
    { batchId: 'B-2026-04-F1', root: '0xB4C8...0D78', block: 19847205, did: 'did:voltus:plant:sw7', timestamp: '2026-06-04 09:30' },
  ];

  return (
    <div className="ds-page">
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="ds-page-inner-wide">
        <motion.div variants={fadeInUp}>
          <h1 className="ds-title">
            <span className="ds-title-icon"><Shield className="h-5 w-5 text-primary" /></span>
            Governance & Audit Console
          </h1>
          <p className="ds-subtitle">Decision traces, configuration history, and on-chain anchors</p>
        </motion.div>

        <motion.div variants={fadeInUp} className="ds-filter-bar">
          {['SOC 2', 'ISO 27001', 'DPDPA', 'HIPAA'].map((badge, i) => (
            <motion.div
              key={badge}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, ease: progressEase }}
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
            >
              <BadgeCheck size={16} className="text-green-600 dark:text-green-400" />
              <span className="text-sm font-semibold text-green-700 dark:text-green-300">{badge}</span>
            </motion.div>
          ))}
        </motion.div>

        <FilterBar
          filters={[
            { id: 'all', label: 'All Traces' },
            { id: 'agent', label: 'Agent' },
            { id: 'user', label: 'User' },
            { id: 'approved', label: 'Approved' },
            { id: 'logged', label: 'Logged' },
          ]}
          active={traceFilter}
          onChange={(id) => {
            setTraceFilter(id);
            setExpandedTrace(null);
            const count = decisionTraces.filter((trace) => {
              if (id === 'agent') return trace.actor === 'agent';
              if (id === 'user') return trace.actor.startsWith('user:');
              if (id === 'approved') return trace.outcome === 'approved';
              if (id === 'logged') return trace.outcome === 'logged';
              return true;
            }).length;
            callbacks.showToast(`Traces filter: ${id} · ${count} records`, 'info');
          }}
        />

        {/* Decision Traces */}
        <motion.div variants={fadeInUp} className="ds-card overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <History size={18} className="text-primary" /> Decision Traces
            </h3>
          </div>
          <div className="divide-y divide-border">
            <AnimatePresence mode="popLayout">
            {filteredTraces.map((trace) => (
              <motion.div key={trace.id} layout variants={listItem} initial="initial" animate="animate" exit="exit" className="px-4 py-3">
                <div 
                  className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 cursor-pointer"
                  onClick={() => {
                    const next = expandedTrace === trace.id ? null : trace.id;
                    setExpandedTrace(next);
                    if (next) callbacks.showToast(`Trace expanded: ${trace.action}`, 'info');
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
                    <span className="text-xs font-mono text-muted-foreground">{trace.timestamp}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      trace.actor === 'agent' ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground'
                    }`}>
                      {trace.actor}
                    </span>
                    <span className="text-sm text-foreground break-words">{trace.action}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{trace.rule}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      trace.outcome === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    }`}>
                      {trace.outcome}
                    </span>
                    <ChevronDown size={16} className={`text-muted-foreground transition-transform ${expandedTrace === trace.id ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                <AnimatePresence>
                  {expandedTrace === trace.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-4 p-4 bg-muted/30 rounded-lg"
                    >
                      <p className="text-xs text-muted-foreground">Full trace details would appear here with inputs, features, and rule evaluations.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Config History & Anchor Log */}
        <div className="ds-grid-2">
          <motion.div variants={fadeInUp} className="ds-card overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Settings size={18} className="text-primary" /> Configuration History
              </h3>
            </div>
            <div className="divide-y divide-border">
              {configHistory.map((config, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, ease: progressEase }}
                  whileHover={{ x: 2 }}
                  className="px-4 sm:px-3 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground break-words">{config.setting}: {config.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{config.changedBy} · {config.changedAt}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{config.version}</span>
                    <button onClick={() => callbacks.showToast(`Rolled back ${config.setting} to ${config.version}`, 'warning')} className="text-xs text-primary hover:underline">Rollback</button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeInUp} className="ds-card overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Layers size={18} className="text-primary" /> On-Chain Anchor Log
              </h3>
              <span className="text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">Zero PII</span>
            </div>
            <div className="divide-y divide-border">
              {anchorLog.map((anchor, i) => (
                <motion.button
                  key={i}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, ease: progressEase }}
                  whileHover={{ x: 3 }}
                  onClick={() => callbacks.showToast(`Anchor ${anchor.batchId} · block ${anchor.block}`, 'info')}
                  className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-primary">{anchor.batchId}</span>
                    <span className="text-xs text-muted-foreground">Block {anchor.block}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Root: <code className="font-mono">{anchor.root}</code></p>
                  <p className="text-xs text-muted-foreground">DID: <code className="font-mono">{anchor.did}</code></p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

function ProvenanceAdminScreen({ callbacks }: { callbacks: ScreenCallbacks }) {
  const [selectedIdentity, setSelectedIdentity] = useState<string | null>(null);
  const [identityFilter, setIdentityFilter] = useState('all');
  const [proposalFilter, setProposalFilter] = useState('all');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerStep, setRegisterStep] = useState(1);
  const [registerData, setRegisterData] = useState({
    type: '' as 'plant' | 'distributor' | 'service' | '',
    name: '',
    location: '',
    contactEmail: '',
    contactPhone: '',
    description: '',
    generatedDID: '',
  });
  const [isGeneratingDID, setIsGeneratingDID] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const [identities, setIdentities] = useState([
    { id: '1', did: 'did:voltus:plant:sw7', name: 'Schweinfurt L7', role: 'Plant', status: 'active', vcs: 3 },
    { id: '2', did: 'did:voltus:plant:st1', name: 'Stuttgart W1', role: 'Plant', status: 'active', vcs: 2 },
    { id: '3', did: 'did:voltus:plant:sw5', name: 'Schweinfurt L5', role: 'Plant', status: 'active', vcs: 2 },
    { id: '4', did: 'did:voltus:dist:bayern', name: 'AutoParts Bayern', role: 'Distributor', status: 'active', vcs: 1 },
    { id: '5', did: 'did:voltus:dist:italia', name: 'Italia Parts S.r.l.', role: 'Distributor', status: 'active', vcs: 1 },
    { id: '6', did: 'did:voltus:dist:nordsee', name: 'Nordsee Parts GmbH', role: 'Distributor', status: 'active', vcs: 1 },
    { id: '7', did: 'did:voltus:service:muc01', name: 'Munich Service Center', role: 'Service', status: 'active', vcs: 1 },
    { id: '8', did: 'did:voltus:service:ham02', name: 'Hamburg Service Hub', role: 'Service', status: 'active', vcs: 1 },
    { id: '9', did: 'did:voltus:service:lyo03', name: 'Lyon Service Center', role: 'Service', status: 'active', vcs: 1 },
    { id: '10', did: 'did:voltus:dist:eastern', name: 'Eastern Motors', role: 'Distributor', status: 'suspended', vcs: 0 },
    { id: '11', did: 'did:voltus:dist:balkan', name: 'Balkan Auto Distribution', role: 'Distributor', status: 'suspended', vcs: 0 },
  ]);

  const daoMembers = [
    { address: '0xAbc1...2345', role: 'Plant Admin' },
    { address: '0xDef2...6789', role: 'Quality Lead' },
    { address: '0xGhi3...0123', role: 'Security' },
    { address: '0xJkl4...4567', role: 'Compliance' },
    { address: '0xMno5...8901', role: 'Operations' },
  ];

  const proposals = [
    { id: '1', title: 'Grant plant SW8 mint rights', votes: '3/5', status: 'pending' },
    { id: '2', title: 'Suspend Eastern Motors DID', votes: '4/5', status: 'approved' },
    { id: '3', title: 'Issue VC to Lyon Service Center', votes: '2/5', status: 'pending' },
    { id: '4', title: 'Revoke Balkan Auto mint privileges', votes: '5/5', status: 'approved' },
  ];

  const identityTypes = [
    { value: 'plant', label: 'Manufacturing Plant', icon: Building2, description: 'Production facilities authorized to mint provenance records', color: 'from-blue-500 to-cyan-500' },
    { value: 'distributor', label: 'Distributor', icon: Network, description: 'Authorized channel partners for parts distribution', color: 'from-purple-500 to-pink-500' },
    { value: 'service', label: 'Service Center', icon: Boxes, description: 'Certified service and maintenance facilities', color: 'from-amber-500 to-orange-500' },
  ];

  const generateDID = () => {
    setIsGeneratingDID(true);
    callbacks.showToast('Generating decentralized identifier…', 'info');
    setTimeout(() => {
      const prefix = registerData.type === 'plant' ? 'plant' : registerData.type === 'distributor' ? 'dist' : 'service';
      const slug = registerData.name.toLowerCase().replace(/\s+/g, '').slice(0, 8);
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      const did = `did:voltus:${prefix}:${slug}${randomSuffix}`;
      setRegisterData(prev => ({ ...prev, generatedDID: did }));
      setIsGeneratingDID(false);
      callbacks.showToast(`DID generated: ${did}`, 'success');
    }, 1500);
  };

  const handleRegisterSubmit = () => {
    setIsSubmitting(true);
    callbacks.showToast('Submitting identity registration to blockchain…', 'info');
    setTimeout(() => {
      const newIdentity = {
        id: String(identities.length + 1),
        did: registerData.generatedDID,
        name: registerData.name,
        role: registerData.type.charAt(0).toUpperCase() + registerData.type.slice(1),
        status: 'active',
        vcs: 0,
      };
      setIdentities(prev => [...prev, newIdentity]);
      setIsSubmitting(false);
      setRegistrationComplete(true);
      callbacks.showToast(`${registerData.name} registered on Voltus Private Ethereum`, 'success');
    }, 2000);
  };

  const goNextStep = () => {
    if (registerStep === 1 && !canProceedStep1) {
      callbacks.showToast('Select an identity type to continue', 'warning');
      return;
    }
    if (registerStep === 2 && !canProceedStep2) {
      callbacks.showToast('Complete required organization fields', 'warning');
      return;
    }
    if (registerStep === 3 && !canProceedStep3) {
      callbacks.showToast('Generate a DID before continuing', 'warning');
      return;
    }
    if (registerStep < 4) {
      setRegisterStep((prev) => (prev + 1) as 1 | 2 | 3 | 4);
      callbacks.showToast(`Step ${registerStep + 1} of 4`, 'info');
    }
  };

  const goPrevStep = () => {
    if (registerStep > 1) {
      setRegisterStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    } else {
      resetRegistration();
    }
  };

  const resetRegistration = () => {
    const wasComplete = registrationComplete;
    setShowRegisterModal(false);
    setRegisterStep(1);
    setRegisterData({
      type: '',
      name: '',
      location: '',
      contactEmail: '',
      contactPhone: '',
      description: '',
      generatedDID: '',
    });
    setRegistrationComplete(false);
    if (showRegisterModal) {
      callbacks.showToast(wasComplete ? 'Registration flow closed' : 'Registration cancelled', 'info');
    }
  };

  const canProceedStep1 = registerData.type !== '';
  const canProceedStep2 = registerData.name.trim() !== '' && registerData.location.trim() !== '' && registerData.contactEmail.trim() !== '';
  const canProceedStep3 = registerData.generatedDID !== '';

  useEffect(() => {
    if (!showRegisterModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showRegisterModal]);

  const filteredIdentities = identities.filter((identity) => {
    if (identityFilter === 'active') return identity.status === 'active';
    if (identityFilter === 'suspended') return identity.status === 'suspended';
    if (identityFilter === 'plant') return identity.role === 'Plant';
    if (identityFilter === 'distributor') return identity.role === 'Distributor';
    if (identityFilter === 'service') return identity.role === 'Service';
    return true;
  });

  const filteredProposals = proposals.filter((p) => {
    if (proposalFilter === 'pending') return p.status === 'pending';
    if (proposalFilter === 'approved') return p.status === 'approved';
    return true;
  });

  return (
    <div className="ds-page">
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="ds-page-inner-wide">
        <motion.div variants={fadeInUp}>
          <h1 className="ds-title">
            <span className="ds-title-icon"><Key className="h-5 w-5 text-primary" /></span>
            Provenance Registry Admin
          </h1>
          <p className="ds-subtitle">Manage DIDs, Verifiable Credentials, and DAO governance</p>
        </motion.div>

        <FilterBar
          filters={[
            { id: 'all', label: 'All Identities' },
            { id: 'plant', label: 'Plants' },
            { id: 'distributor', label: 'Distributors' },
            { id: 'service', label: 'Service' },
            { id: 'active', label: 'Active' },
            { id: 'suspended', label: 'Suspended' },
          ]}
          active={identityFilter}
          onChange={(id) => {
            setIdentityFilter(id);
            setSelectedIdentity(null);
            const count = identities.filter((identity) => {
              if (id === 'active') return identity.status === 'active';
              if (id === 'suspended') return identity.status === 'suspended';
              if (id === 'plant') return identity.role === 'Plant';
              if (id === 'distributor') return identity.role === 'Distributor';
              if (id === 'service') return identity.role === 'Service';
              return true;
            }).length;
            callbacks.showToast(`Identity filter: ${id} · ${count} identities`, 'info');
          }}
        />

        <div className="ds-grid-3">
          {/* Identities */}
          <motion.div variants={fadeInUp} className="lg:col-span-2 ds-card overflow-hidden">
            <div className="px-4 sm:px-3 py-2.5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <UserCheck size={18} className="text-primary" /> Registered Identities (DIDs)
              </h3>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowRegisterModal(true);
                  callbacks.showToast('New identity registration started', 'info');
                }}
                className="ds-btn-md ds-btn-primary w-full sm:w-auto"
              >
                <span className="text-lg leading-none">+</span> Register
              </motion.button>
            </div>
            <div className="divide-y divide-border">
              <AnimatePresence mode="popLayout">
              {filteredIdentities.map((identity) => (
                <motion.div
                  key={identity.id}
                  layout
                  variants={listItem}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className={`px-3 py-2.5 cursor-pointer transition-colors ${selectedIdentity === identity.id ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
                  onClick={() => {
                    const next = selectedIdentity === identity.id ? null : identity.id;
                    setSelectedIdentity(next);
                    if (next) callbacks.showToast(`Identity selected: ${identity.name}`, 'info');
                  }}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                    <div>
                      <p className="font-mono text-sm text-primary">{identity.did}</p>
                      <p className="text-sm font-semibold text-foreground mt-1">{identity.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{identity.role}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        identity.status === 'active' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' 
                          : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                      }`}>
                        {identity.status}
                      </span>
                      <span className="text-xs text-muted-foreground">{identity.vcs} VCs</span>
                    </div>
                  </div>
                  <AnimatePresence>
                    {selectedIdentity === identity.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 pt-4 border-t border-border flex gap-2"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            callbacks.showToast(`Verifiable credential issued to ${identity.name}`, 'success');
                          }}
                          className="ds-btn-sm ds-btn-primary"
                        >
                          Issue VC
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            callbacks.showToast(
                              `${identity.status === 'active' ? 'Suspended' : 'Reactivated'} ${identity.name}`,
                              identity.status === 'active' ? 'warning' : 'success',
                            );
                          }}
                          className="ds-btn-sm ds-btn-secondary"
                        >
                          {identity.status === 'active' ? 'Suspend' : 'Reactivate'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* DAO & Contract */}
          <div className="space-y-4">
            {/* Governance DAO */}
            <motion.div variants={fadeInUp} className="ds-card p-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                <Vote size={18} className="text-primary" /> Governance DAO
              </h3>
              <div className="space-y-3 mb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Voting Threshold</span>
                  <span className="text-sm font-bold text-foreground">4 of 5</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Members</span>
                  <span className="text-sm font-bold text-foreground">{daoMembers.length}</span>
                </div>
              </div>
              <div className="space-y-2 mb-2">
                {daoMembers.slice(0, 3).map((member, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <code className="font-mono text-muted-foreground">{member.address}</code>
                    <span className="text-foreground">{member.role}</span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">+{daoMembers.length - 3} more</p>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'pending', label: 'Pending' },
                  { id: 'approved', label: 'Approved' },
                ].map((f) => (
                  <motion.button
                    key={f.id}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setProposalFilter(f.id);
                      const count = proposals.filter((p) => {
                        if (f.id === 'pending') return p.status === 'pending';
                        if (f.id === 'approved') return p.status === 'approved';
                        return true;
                      }).length;
                      callbacks.showToast(`Proposals: ${f.label} · ${count} shown`, 'info');
                    }}
                    className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                      proposalFilter === f.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {f.label}
                  </motion.button>
                ))}
              </div>
              <h4 className="text-sm font-semibold text-foreground mb-2">DAO Proposals</h4>
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                {filteredProposals.map((proposal) => (
                  <motion.div key={proposal.id} layout variants={listItem} initial="initial" animate="animate" exit="exit" className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm text-foreground">{proposal.title}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">Votes: {proposal.votes}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => callbacks.showToast(`Approved: ${proposal.title}`, 'success')}
                          className="ds-btn-sm bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => callbacks.showToast(`Rejected: ${proposal.title}`, 'error')}
                          className="ds-btn-sm bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Contract Registry */}
            <motion.div variants={fadeInUp} className="ds-card p-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                <Server size={18} className="text-primary" /> Contract Registry
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Contract</p>
                  <p className="text-sm font-mono font-semibold text-foreground mt-1">ProvenanceRegistry.sol</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Address</p>
                  <p className="text-sm font-mono text-primary mt-1">0xDef2...3B7f</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Version</p>
                  <p className="text-sm font-semibold text-foreground mt-1">v2.1.0</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Batches Anchored</p>
                  <p className="text-lg font-bold text-foreground mt-1">1,847</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-muted-foreground">Chain reachable · Block #19847291</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Registration Modal */}
      <AnimatePresence>
        {showRegisterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="ds-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="register-modal-title"
            onClick={(e) => e.target === e.currentTarget && resetRegistration()}
          >
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="ds-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ds-modal-hero">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 id="register-modal-title" className="ds-title text-base sm:text-lg">
                      <span className="ds-title-icon">
                        <Fingerprint className="h-5 w-5 text-primary" />
                      </span>
                      Register New Identity
                    </h2>
                    <p className="ds-subtitle">Create a new DID for your organization</p>
                  </div>
                  <button
                    type="button"
                    onClick={resetRegistration}
                    className="ds-btn-icon hover:bg-muted shrink-0"
                    aria-label="Close"
                  >
                    <X size={18} className="text-muted-foreground" />
                  </button>
                </div>

                {!registrationComplete && (
                  <div className="ds-stepper mt-4">
                    {[
                      { num: 1, label: 'Type' },
                      { num: 2, label: 'Details' },
                      { num: 3, label: 'DID' },
                      { num: 4, label: 'Confirm' },
                    ].map((step, i) => (
                      <React.Fragment key={step.num}>
                        <div
                          className={`ds-step ${
                            registerStep === step.num
                              ? 'bg-primary text-primary-foreground'
                              : registerStep > step.num
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <div className={`ds-step-num ${registerStep > step.num ? 'bg-green-500 text-white' : ''}`}>
                            {registerStep > step.num ? <Check size={12} /> : step.num}
                          </div>
                          <span className="ds-step-label">{step.label}</span>
                        </div>
                        {i < 3 && <ChevronRight size={14} className="ds-step-chevron" />}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>

              <div className="ds-modal-body">
                <AnimatePresence mode="wait">
                  {/* Step 1: Identity Type */}
                  {registerStep === 1 && !registrationComplete && (
                    <motion.div key="step1" variants={fadeInUp} initial="initial" animate="animate" exit="exit" className="ds-stack">
                      <div className="mb-1">
                        <h3 className="text-base font-semibold text-foreground">Select Identity Type</h3>
                        <p className="text-sm text-muted-foreground mt-1">Choose the type of organization you want to register</p>
                      </div>
                      <div className="flex flex-col gap-3">
                        {identityTypes.map((type) => {
                          const Icon = type.icon;
                          const isSelected = registerData.type === type.value;
                          return (
                            <motion.button
                              key={type.value}
                              type="button"
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => {
                                setRegisterData(prev => ({ ...prev, type: type.value as typeof prev.type }));
                                callbacks.showToast(`Identity type: ${type.label}`, 'info');
                              }}
                              className={`ds-select-card ${isSelected ? 'ds-select-card-active' : ''}`}
                            >
                              <span className={`ds-icon-badge bg-gradient-to-br ${type.color}`}>
                                <Icon className="h-5 w-5" />
                              </span>
                              <span className="flex-1 min-w-0 text-left">
                                <span className="flex items-center justify-between gap-2">
                                  <span className="block font-semibold text-foreground">{type.label}</span>
                                  {isSelected && (
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary">
                                      <Check size={12} className="text-primary-foreground" />
                                    </span>
                                  )}
                                </span>
                                <span className="block text-sm text-muted-foreground mt-1 leading-snug">{type.description}</span>
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Organization Details */}
                  {registerStep === 2 && !registrationComplete && (
                    <motion.div key="step2" variants={fadeInUp} initial="initial" animate="animate" exit="exit" className="ds-stack">
                      <div>
                        <h3 className="ds-section-title">Organization Details</h3>
                        <p className="ds-subtitle">Provide information about the organization</p>
                      </div>
                      <div className="ds-card ds-card-pad">
                        <div className="ds-stack">
                          <div className="ds-form-field">
                            <label className="ds-form-label" htmlFor="reg-name">Organization Name *</label>
                            <input id="reg-name" type="text" value={registerData.name} onChange={(e) => setRegisterData(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Berlin Manufacturing Plant" className="ds-form-input" />
                          </div>
                          <div className="ds-form-field">
                            <label className="ds-form-label" htmlFor="reg-location">Location *</label>
                            <input id="reg-location" type="text" value={registerData.location} onChange={(e) => setRegisterData(prev => ({ ...prev, location: e.target.value }))} placeholder="e.g., Berlin, Germany" className="ds-form-input" />
                          </div>
                          <div className="ds-kv-grid">
                            <div className="ds-form-field">
                              <label className="ds-form-label" htmlFor="reg-email">Contact Email *</label>
                              <input id="reg-email" type="email" value={registerData.contactEmail} onChange={(e) => setRegisterData(prev => ({ ...prev, contactEmail: e.target.value }))} placeholder="admin@organization.com" className="ds-form-input" />
                            </div>
                            <div className="ds-form-field">
                              <label className="ds-form-label" htmlFor="reg-phone">Contact Phone</label>
                              <input id="reg-phone" type="tel" value={registerData.contactPhone} onChange={(e) => setRegisterData(prev => ({ ...prev, contactPhone: e.target.value }))} placeholder="+49 123 456 7890" className="ds-form-input" />
                            </div>
                          </div>
                          <div className="ds-form-field">
                            <label className="ds-form-label" htmlFor="reg-desc">Description</label>
                            <textarea id="reg-desc" value={registerData.description} onChange={(e) => setRegisterData(prev => ({ ...prev, description: e.target.value }))} placeholder="Brief description of the organization's role in the supply chain..." rows={3} className="ds-form-textarea" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Generate DID */}
                  {registerStep === 3 && !registrationComplete && (
                    <motion.div key="step3" variants={fadeInUp} initial="initial" animate="animate" exit="exit" className="ds-stack">
                      <div>
                        <h3 className="ds-section-title">Generate DID</h3>
                        <p className="ds-subtitle">Create a unique decentralized identifier for this organization</p>
                      </div>

                      <div className="ds-card ds-card-pad flex items-start gap-3">
                        {registerData.type === 'plant' && <Building2 className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />}
                        {registerData.type === 'distributor' && <Network className="h-5 w-5 text-purple-500 shrink-0 mt-0.5" />}
                        {registerData.type === 'service' && <Boxes className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground">{registerData.name}</p>
                          <p className="text-sm text-muted-foreground">{registerData.location}</p>
                          <p className="text-xs text-muted-foreground mt-1 capitalize">{registerData.type} · {registerData.contactEmail}</p>
                        </div>
                      </div>

                      <div className="ds-did-panel">
                        <AnimatePresence mode="wait">
                          {!registerData.generatedDID && !isGeneratingDID && (
                            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <span className="inline-flex w-10 h-10 rounded-lg bg-primary/10 items-center justify-center shrink-0">
                                  <Fingerprint className="h-5 w-5 text-primary" />
                                </span>
                                <p className="text-sm text-muted-foreground">Generate a unique DID for this identity</p>
                              </div>
                              <button type="button" onClick={generateDID} className="ds-btn-md ds-btn-primary shrink-0">Generate DID</button>
                            </motion.div>
                          )}
                          {isGeneratingDID && (
                            <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3">
                              <RefreshCw className="h-5 w-5 text-primary animate-spin shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-foreground">Generating DID...</p>
                                <p className="text-xs text-muted-foreground">Creating cryptographic identity</p>
                              </div>
                            </motion.div>
                          )}
                          {registerData.generatedDID && !isGeneratingDID && (
                            <motion.div key="done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="ds-stack-sm">
                              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                DID generated successfully
                              </div>
                              <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-card rounded-lg border border-border">
                                <code className="text-sm font-mono font-semibold text-primary truncate">{registerData.generatedDID}</code>
                                <button type="button" onClick={generateDID} className="text-xs text-muted-foreground hover:text-foreground shrink-0 inline-flex items-center gap-1">
                                  <RefreshCw size={12} /> Regenerate
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="ds-info-banner ds-info-banner-blue">
                        <Shield className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Decentralized Identity (DID)</p>
                          <p className="text-sm mt-0.5 opacity-90">Anchored to Voltus Private Ethereum and used to sign all provenance records.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 4: Review & Confirm */}
                  {registerStep === 4 && !registrationComplete && (
                    <motion.div key="step4" variants={fadeInUp} initial="initial" animate="animate" exit="exit" className="ds-stack">
                      <div>
                        <h3 className="ds-section-title">Review & Confirm</h3>
                        <p className="ds-subtitle">Verify the details before registering this identity</p>
                      </div>

                      <div className="ds-review-hero ds-stack-sm">
                        <div className="flex items-center gap-3">
                          <span className={`ds-icon-badge bg-gradient-to-br ${
                            registerData.type === 'plant' ? 'from-blue-500 to-cyan-500' :
                            registerData.type === 'distributor' ? 'from-purple-500 to-pink-500' :
                            'from-amber-500 to-orange-500'
                          }`}>
                            {registerData.type === 'plant' && <Building2 className="h-5 w-5" />}
                            {registerData.type === 'distributor' && <Network className="h-5 w-5" />}
                            {registerData.type === 'service' && <Boxes className="h-5 w-5" />}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">{registerData.name}</p>
                            <p className="text-sm text-muted-foreground capitalize">{registerData.type} · {registerData.location}</p>
                          </div>
                        </div>
                        <div className="ds-card ds-card-pad">
                          <p className="ds-kv-label">Decentralized Identifier</p>
                          <code className="ds-chip ds-chip-primary mt-2 block w-fit max-w-full break-all">{registerData.generatedDID}</code>
                        </div>
                      </div>

                      <div className="ds-kv-grid">
                        <div className="ds-kv-cell">
                          <p className="ds-kv-label">Contact Email</p>
                          <p className="ds-kv-value break-all">{registerData.contactEmail}</p>
                        </div>
                        <div className="ds-kv-cell">
                          <p className="ds-kv-label">Contact Phone</p>
                          <p className="ds-kv-value">{registerData.contactPhone || 'Not provided'}</p>
                        </div>
                      </div>

                      {registerData.description && (
                        <div className="ds-kv-cell">
                          <p className="ds-kv-label">Description</p>
                          <p className="ds-kv-value font-normal leading-relaxed">{registerData.description}</p>
                        </div>
                      )}

                      <div className="ds-info-banner ds-info-banner-amber">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Blockchain Transaction Required</p>
                          <p className="text-sm mt-0.5 opacity-90">Submits a transaction to Voltus Private Ethereum. DAO governance may need to approve certain permissions.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Success */}
                  {registrationComplete && (
                    <motion.div key="complete" variants={fadeInUp} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center text-center py-6 gap-4">
                      <div className="w-14 h-14 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="ds-section-title">Registration Complete!</h3>
                        <p className="ds-subtitle">The identity has been successfully registered on the blockchain.</p>
                      </div>
                      <div className="w-full ds-card ds-card-pad">
                        <code className="ds-chip ds-chip-primary block w-full text-center break-all">{registerData.generatedDID}</code>
                        <p className="text-xs text-muted-foreground mt-3">Transaction anchored to Voltus Private Ethereum</p>
                      </div>
                      <button type="button" onClick={resetRegistration} className="ds-btn-lg ds-btn-primary min-w-[128px]">Done</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {!registrationComplete && (
                <div className="ds-modal-footer">
                  <button type="button" onClick={goPrevStep} className="ds-btn-md ds-btn-outline">
                    <ChevronLeft size={16} />
                    {registerStep === 1 ? 'Cancel' : 'Back'}
                  </button>
                  {registerStep < 4 ? (
                    <button
                      type="button"
                      onClick={goNextStep}
                      disabled={
                        (registerStep === 1 && !canProceedStep1) ||
                        (registerStep === 2 && !canProceedStep2) ||
                        (registerStep === 3 && !canProceedStep3)
                      }
                      className="ds-btn-lg ds-btn-primary disabled:opacity-40"
                    >
                      Continue
                      <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button type="button" onClick={handleRegisterSubmit} disabled={isSubmitting} className="ds-btn-lg ds-btn-success">
                      {isSubmitting ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          Registering...
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          Register Identity
                        </>
                      )}
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
