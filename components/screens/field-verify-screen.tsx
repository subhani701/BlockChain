'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Fingerprint,
  Menu,
  Moon,
  Package,
  QrCode,
  Shield,
  Sparkles,
  Sun,
  Wifi,
  WifiOff,
  XCircle,
  Zap,
} from 'lucide-react';
import type { ScreenCallbacks } from '@/components/providers/app-provider';
import { useApp } from '@/components/providers/app-provider';
import {
  getFieldVerifyContext,
  getRecommendationsForCustomer,
  getPart,
  type FieldVerifyContext,
} from '@/lib/data/ami-data';
import { EmptyState, ProvenanceHint, ScoreBadge, SignalChip } from '@/components/ui-ami';
import { fadeInUp, listItem, scaleIn, staggerContainer } from '@/lib/motion';

const scanLineAnimation = {
  animate: { y: [0, 260, 0], transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } },
};

const pulseAnimation = {
  animate: { scale: [1, 1.02, 1], opacity: [1, 0.8, 1], transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } },
};

const VERIFY_STEPS = [
  'Reading QR code',
  'Hashing leaf + Merkle proof',
  'Fetching on-chain root',
  'Matching provenance',
];

export interface FieldVerifyProps {
  isDark: boolean;
  setIsDark: (value: boolean) => void;
  onMenuClick?: () => void;
  callbacks: ScreenCallbacks;
}

export function FieldVerifyScreen({ isDark, setIsDark, onMenuClick, callbacks }: FieldVerifyProps) {
  const { raiseChannelIntegrityAlert } = useApp();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<'idle' | 'genuine' | 'suspect'>('idle');
  const [scanContext, setScanContext] = useState<FieldVerifyContext | null>(null);
  const [alertRaised, setAlertRaised] = useState(false);
  const [verificationSteps, setVerificationSteps] = useState(
    VERIFY_STEPS.map((label) => ({ label, completed: false })),
  );
  const [offlineMode, setOfflineMode] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [partsFilter, setPartsFilter] = useState<'all' | 'high' | 'signals'>('all');

  const recommendations = useMemo(() => {
    if (!scanContext || scanContext.mode !== 'genuine') return [];
    return getRecommendationsForCustomer(scanContext.customer.id);
  }, [scanContext]);

  const filteredRecommendations = useMemo(() => {
    if (partsFilter === 'high') return recommendations.filter((r) => r.winProbability >= 75);
    if (partsFilter === 'signals') return recommendations.filter((r) => r.signals.length >= 2);
    return recommendations;
  }, [recommendations, partsFilter]);

  const handleScan = useCallback(
    (isGenuine: boolean) => {
      const ctx = getFieldVerifyContext(isGenuine ? 'genuine' : 'suspect');
      if (!ctx) {
        callbacks.showToast('Scan scenario unavailable in shared data', 'error');
        return;
      }

      // Real camera/QR lib: decode QR payload → part serial + batch leaf reference
      setIsVerifying(true);
      setScanContext(ctx);
      setCurrentStepIndex(0);
      setVerificationSteps(VERIFY_STEPS.map((label) => ({ label, completed: false })));
      callbacks.showToast('Scanning QR code — verifying on-chain provenance', 'info');

      let stepIndex = 0;
      const stepInterval = setInterval(() => {
        if (stepIndex < VERIFY_STEPS.length) {
          // On-device hashing + Merkle proof assembly at step 1; chain RPC read at step 2
          setVerificationSteps((steps) => {
            const updated = [...steps];
            if (updated[stepIndex]) updated[stepIndex] = { ...updated[stepIndex], completed: true };
            return updated;
          });
          setCurrentStepIndex(stepIndex + 1);
          stepIndex++;
        } else {
          clearInterval(stepInterval);
          setIsVerifying(false);
          setVerificationResult(isGenuine ? 'genuine' : 'suspect');
          setCurrentStepIndex(-1);
          // prov.scan.performed — emit verified/suspect event to audit + install-base signals
          callbacks.showToast(
            isGenuine
              ? `${ctx.part.sku} verified — authentic`
              : `${ctx.part.sku} could not be verified`,
            isGenuine ? 'success' : 'error',
          );
        }
      }, 700);
    },
    [callbacks],
  );

  const handleReset = () => {
    setVerificationResult('idle');
    setScanContext(null);
    setAlertRaised(false);
    setVerificationSteps(VERIFY_STEPS.map((label) => ({ label, completed: false })));
    setCurrentStepIndex(-1);
    callbacks.showToast('Ready for next scan', 'info');
  };

  const handleRaiseAlert = () => {
    if (!scanContext || alertRaised) return;
    raiseChannelIntegrityAlert(scanContext);
    setAlertRaised(true);
  };

  const ctx = scanContext;

  return (
    <div className="flex items-center justify-center min-h-screen lg:p-5 lg:overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-none lg:w-[430px] lg:max-w-[430px]"
      >
        <div className="relative h-[100dvh] lg:h-[780px] overflow-hidden lg:rounded-[3rem] lg:shadow-2xl lg:shadow-black/20 dark:lg:shadow-black/50 lg:border-[12px] lg:border-foreground/90 dark:lg:border-foreground/80 bg-background lg:bg-card">
          <div className="hidden lg:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-foreground/90 dark:bg-foreground/80 rounded-b-2xl z-10" />

          <div className="flex flex-col h-full bg-background">
            <motion.header
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative flex-shrink-0 px-4 pt-[max(1rem,env(safe-area-inset-top))] lg:pt-10 pb-3 bg-card/80 backdrop-blur-xl border-b border-border"
            >
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  {onMenuClick && (
                    <motion.button whileTap={{ scale: 0.95 }} onClick={onMenuClick} className="lg:hidden ds-btn-icon ds-btn-ghost -ml-1 flex-shrink-0">
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
                        next ? 'Offline mode — using cached Merkle root' : 'Back online — syncing with Voltus chain',
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
                {offlineMode ? 'Using cached root' : 'Voltus Private Ethereum'}
              </motion.div>
            </motion.header>

            <div className="flex-1 min-h-0 px-3 py-2.5 overflow-y-auto overflow-x-hidden scrollbar-thin overscroll-contain">
              <AnimatePresence mode="wait">
                {verificationResult === 'idle' && !isVerifying && (
                  <motion.div key="idle" variants={staggerContainer} initial="initial" animate="animate" exit="exit" className="ds-stack">
                    {/* Viewfinder — real: native camera / html5-qrcode stream */}
                    <motion.div variants={fadeInUp} className="relative bg-gradient-to-b from-[#2C2C2C] to-[#1a1a1a] rounded-2xl aspect-square flex items-center justify-center overflow-hidden shadow-xl">
                      <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 flex items-center justify-center">
                        <Camera size={64} className="text-[#5F5E5A]" strokeWidth={1} />
                      </motion.div>
                      <motion.div variants={scanLineAnimation} animate="animate" className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full shadow-lg shadow-primary/50" />
                      <motion.div variants={pulseAnimation} animate="animate" className="absolute inset-8 border-2 border-primary/60 rounded-xl" />
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="absolute bottom-4 left-0 right-0 flex justify-center">
                        <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full text-white text-xs font-medium flex items-center gap-2">
                          <QrCode size={14} />
                          Align QR code within frame
                        </div>
                      </motion.div>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="flex gap-2">
                      <motion.button whileTap={{ scale: 0.98 }} onClick={() => handleScan(true)} className="ds-btn-md ds-btn-success flex-1">
                        <CheckCircle2 size={16} /> Genuine
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.98 }} onClick={() => handleScan(false)} className="ds-btn-md ds-btn-danger flex-1">
                        <XCircle size={16} /> Suspect
                      </motion.button>
                    </motion.div>

                    <motion.button variants={fadeInUp} whileTap={{ scale: 0.98 }} onClick={() => handleScan(true)} className="ds-btn-lg ds-btn-primary ds-btn-block">
                      <Camera size={18} /> Scan part QR
                    </motion.button>
                  </motion.div>
                )}

                {isVerifying && (
                  <motion.div key="verifying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ds-stack">
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-5 flex flex-col items-center gap-3 border border-primary/20">
                      <div className="relative w-20 h-20 flex items-center justify-center">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} className="absolute inset-0 border-4 border-transparent border-t-primary border-r-primary/50 rounded-full" />
                        <Zap size={36} className="text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-base font-bold text-foreground">Verifying authenticity...</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {offlineMode ? 'Matching against cached root' : 'Checking blockchain provenance'}
                        </p>
                      </div>
                    </motion.div>
                    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
                      {verificationSteps.map((step, idx) => (
                        <motion.div
                          key={step.label}
                          variants={fadeInUp}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                            step.completed
                              ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                              : currentStepIndex === idx
                              ? 'bg-primary/5 border-primary/30'
                              : 'bg-card border-border'
                          }`}
                        >
                          <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                            step.completed ? 'bg-green-500 text-white' : currentStepIndex === idx ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}>
                            {step.completed ? <Check size={14} /> : idx + 1}
                          </div>
                          <span className={`text-sm ${step.completed ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{step.label}</span>
                        </motion.div>
                      ))}
                    </motion.div>
                  </motion.div>
                )}

                {verificationResult === 'genuine' && ctx && (
                  <motion.div key="genuine" variants={staggerContainer} initial="initial" animate="animate" exit="exit" className="ds-stack">
                    <motion.div variants={scaleIn} className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800 flex flex-col items-center gap-2">
                      <CheckCircle2 size={48} className="text-green-600 dark:text-green-400" />
                      <h3 className="text-xl font-bold text-green-900 dark:text-green-100">Authentic</h3>
                      <p className="text-sm text-green-800 dark:text-green-200 text-center">Verified against {offlineMode ? 'cached' : 'on-chain'} root</p>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="ds-card overflow-hidden">
                      <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3">
                        <h4 className="text-white font-semibold text-sm">Part identity</h4>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: 'SKU', value: ctx.part.sku, mono: true },
                            { label: 'Plant', value: ctx.plant },
                            { label: 'Batch', value: ctx.batch.id, mono: true },
                            { label: 'Mfg date', value: ctx.mfgDate },
                          ].map((item) => (
                            <div key={item.label}>
                              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{item.label}</p>
                              <p className={`text-sm font-semibold text-foreground mt-0.5 ${item.mono ? 'font-mono' : ''}`}>{item.value}</p>
                            </div>
                          ))}
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Name</p>
                          <p className="text-sm font-medium text-foreground mt-0.5">{ctx.part.name}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Spec</p>
                          <p className="text-sm text-foreground mt-0.5">{ctx.part.category} · {ctx.batch.line} line · {ctx.batch.unitCount.toLocaleString()} units</p>
                        </div>
                        <div className="pt-2 border-t border-border">
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Serial</p>
                          <p className="text-sm font-mono font-semibold text-foreground mt-0.5">{ctx.serial}</p>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="ds-card ds-card-pad">
                      <p className="text-[10px] font-semibold text-foreground uppercase tracking-wide flex items-center gap-1">
                        <Shield size={12} className="text-primary" /> Verified on-chain
                      </p>
                      <div className="mt-2 space-y-1 text-xs text-foreground">
                        <p><span className="text-muted-foreground">Merkle root:</span> <code className="font-mono">{ctx.merkleRoot}</code></p>
                        <p><span className="text-muted-foreground">Block:</span> <code className="font-mono">{ctx.blockNumber}</code></p>
                        <p><span className="text-muted-foreground">Verifier DID:</span> <code className="font-mono text-[11px]">{ctx.verifierDid}</code></p>
                      </div>
                      <ProvenanceHint
                        source="prov__merkle_root · prov__block_number"
                        freshness={offlineMode ? 'cached root · offline' : `${ctx.chainLabel} · live`}
                        className="mt-2"
                      />
                    </motion.div>

                    <motion.div variants={fadeInUp} className="ds-card overflow-hidden">
                      <div className="bg-gradient-to-r from-primary to-primary/80 px-4 py-3">
                        <h4 className="text-primary-foreground font-semibold text-sm flex items-center gap-2">
                          <Sparkles size={14} /> Recommended next
                        </h4>
                      </div>
                      <div className="px-3 pt-3 flex flex-wrap gap-2">
                        {(['all', 'high', 'signals'] as const).map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setPartsFilter(f)}
                            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                              partsFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {f === 'all' ? 'All' : f === 'high' ? 'High win' : 'Multi-signal'}
                          </button>
                        ))}
                      </div>
                      <div className="p-3 space-y-2">
                        {filteredRecommendations.length === 0 ? (
                          <EmptyState title="No recommendations" description="No next-best-part signals for this customer yet." />
                        ) : (
                          filteredRecommendations.map((rec) => {
                            const part = getPart(rec.partId);
                            return (
                              <div key={rec.id} className="p-2.5 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-mono font-semibold text-foreground truncate">{part?.sku}</p>
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {rec.signals.map((s) => (
                                        <SignalChip key={s} signal={s} />
                                      ))}
                                    </div>
                                    <ProvenanceHint source="model__next_best_part" freshness={`€${rec.estValue.toLocaleString()} est.`} className="mt-1" />
                                  </div>
                                  <ScoreBadge value={rec.winProbability} invert />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => callbacks.goToQuote({ customerId: rec.customerId, partId: rec.partId, from: 'field-verify' })}
                                  className="ds-btn-sm ds-btn-primary w-full mt-2"
                                >
                                  Draft quote <ChevronRight size={12} />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>

                    <motion.button variants={fadeInUp} whileTap={{ scale: 0.98 }} onClick={handleReset} className="ds-btn-md ds-btn-secondary ds-btn-block">
                      Scan another part
                    </motion.button>
                  </motion.div>
                )}

                {verificationResult === 'suspect' && ctx && (
                  <motion.div key="suspect" variants={staggerContainer} initial="initial" animate="animate" exit="exit" className="ds-stack">
                    <motion.div variants={scaleIn} className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800 flex flex-col items-center gap-2">
                      <XCircle size={48} className="text-red-600 dark:text-red-400" />
                      <h3 className="text-xl font-bold text-red-900 dark:text-red-100">Could not verify</h3>
                      <p className="text-sm text-red-800 dark:text-red-200 text-center">Part may be counterfeit or grey-market</p>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="ds-card ds-card-pad">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Scanned identity</p>
                      <p className="text-sm font-mono font-semibold text-foreground mt-1">{ctx.part.sku} · {ctx.serial}</p>
                      <p className="text-xs text-muted-foreground mt-1">{ctx.customer.name} · Batch {ctx.batch.id}</p>
                      <ProvenanceHint source="prov__verify_fail" freshness={`${ctx.customer.region} · merkle mismatch`} className="mt-2" />
                    </motion.div>

                    <motion.div variants={fadeInUp} className="bg-orange-50 dark:bg-orange-900/20 rounded-lg px-3 py-2.5 border border-orange-200 dark:border-orange-800">
                      <div className="flex gap-3">
                        <AlertTriangle size={18} className="text-orange-600 shrink-0 mt-0.5" />
                        <ul className="text-xs text-orange-800 dark:text-orange-300 space-y-1 list-disc list-inside">
                          <li>QR payload does not match on-chain record</li>
                          <li>No matching provenance for batch {ctx.batch.id}</li>
                          <li>Channel integrity risk near {ctx.customer.region}</li>
                        </ul>
                      </div>
                    </motion.div>

                    <motion.button
                      variants={fadeInUp}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleRaiseAlert}
                      disabled={alertRaised}
                      className="ds-btn-lg ds-btn-danger ds-btn-block"
                    >
                      <AlertTriangle size={16} />
                      {alertRaised ? 'Channel alert raised' : 'Raise channel-integrity alert'}
                    </motion.button>
                    <motion.button variants={fadeInUp} whileTap={{ scale: 0.98 }} onClick={handleReset} className="ds-btn-md ds-btn-secondary ds-btn-block">
                      Scan another part
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {verificationResult !== 'idle' && ctx && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-shrink-0 px-4 py-3 bg-card border-t border-border">
                <p className="text-[10px] text-muted-foreground text-center">
                  Verified against {offlineMode ? 'cached' : 'on-chain'} root · {ctx.batch.id} · {ctx.customer.name}
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
