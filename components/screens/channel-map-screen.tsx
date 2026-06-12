'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/motion';
import {
  AlertTriangle,
  CheckCircle2,
  Globe,
  Map as MapIcon,
  MapPin,
  X,
  XCircle,
} from 'lucide-react';
import type { ScreenCallbacks } from '@/components/providers/app-provider';
import { useChannelIntegrity } from '@/components/providers/app-provider';
import {
  getChannelMapAlerts,
  getChannelMapKpis,
  getChannelMapPins,
  getChannelMapRegionHeats,
  getPart,
  getScansByIds,
  type ChannelMapAlertRow,
  type ChannelMapPin,
  type ChannelMapRegionHeat,
} from '@/lib/data/ami-data';
import { PageHeader } from '@/components/ui/page-header';
import { DataCard, EmptyState, KpiCard, ProvenanceHint } from '@/components/ui-ami';

const PIN_COLORS = {
  genuine: { fill: '#9CA3AF', stroke: '#6B7280', glow: 'rgba(156, 163, 175, 0.25)' },
  'fail-cluster': { fill: '#D40924', stroke: '#B0081F', glow: 'rgba(212, 9, 36, 0.45)' },
  'out-of-region': { fill: '#F59E0B', stroke: '#D97706', glow: 'rgba(245, 158, 11, 0.4)' },
} as const;

const HEAT_STATUS_COLORS = {
  ok: { glow: 'rgba(156, 163, 175, 0.2)' },
  warning: { glow: 'rgba(245, 158, 11, 0.35)' },
  fail: { glow: 'rgba(212, 9, 36, 0.4)' },
} as const;

function formatAlertTime(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ChannelIntegrityMapView({
  heats,
  pins,
  focusAlertId,
  onPinClick,
}: {
  heats: ChannelMapRegionHeat[];
  pins: ChannelMapPin[];
  focusAlertId: string | null;
  onPinClick?: (pin: ChannelMapPin) => void;
}) {
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);
  const maxScans = Math.max(...heats.map((h) => h.totalScans), 1);
  const hovered = pins.find((p) => p.id === hoveredPin);

  return (
    <div className="ds-geo-map h-72 sm:h-80">
      <div className="ds-geo-map-grid" aria-hidden />
      <div className="ds-geo-map-vignette" aria-hidden />

      <svg viewBox="0 0 520 360" className="ds-geo-map-svg" role="img" aria-label="Channel integrity scan map">
        <defs>
          <linearGradient id="ch-ocean" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.96 0.02 250)" />
            <stop offset="100%" stopColor="oklch(0.93 0.025 245)" />
          </linearGradient>
          <filter id="ch-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {heats.map((heat) => (
            <radialGradient key={`grad-${heat.region}`} id={`heat-${heat.region}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={HEAT_STATUS_COLORS[heat.status].glow} stopOpacity="0.9" />
              <stop offset="70%" stopColor={HEAT_STATUS_COLORS[heat.status].glow} stopOpacity="0.2" />
              <stop offset="100%" stopColor={HEAT_STATUS_COLORS[heat.status].glow} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>

        <rect width="520" height="360" fill="url(#ch-ocean)" />

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

        {heats.map((heat, i) => {
          const dimmed = focusAlertId && !pins.some((p) => p.alertId === focusAlertId && p.region === heat.region);
          const radius = 16 + (heat.totalScans / maxScans) * 32;
          return (
            <motion.circle
              key={`halo-${heat.region}`}
              cx={heat.x}
              cy={heat.y}
              r={radius}
              fill={`url(#heat-${heat.region})`}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: dimmed ? 0.15 : 0.8, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.45 }}
            />
          );
        })}

        {pins.map((pin, i) => {
          const colors = PIN_COLORS[pin.type];
          const focused = focusAlertId && pin.alertId === focusAlertId;
          const dimmed = focusAlertId && pin.alertId && pin.alertId !== focusAlertId;
          const isHovered = hoveredPin === pin.id;
          if (pin.type === 'genuine' && focusAlertId) return null;

          return (
            <motion.g
              key={pin.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: dimmed ? 0.25 : 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.04 }}
              style={{ cursor: pin.alertId ? 'pointer' : 'default' }}
              onMouseEnter={() => setHoveredPin(pin.id)}
              onMouseLeave={() => setHoveredPin(null)}
              onClick={() => pin.alertId && onPinClick?.(pin)}
              filter={focused || isHovered ? 'url(#ch-glow)' : undefined}
            >
              {pin.type === 'fail-cluster' && !dimmed && (
                <motion.circle
                  cx={pin.x}
                  cy={pin.y}
                  r={8}
                  fill="none"
                  stroke={colors.stroke}
                  strokeWidth="1"
                  animate={{ opacity: 0, r: 24 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
              <line x1={pin.x} y1={pin.y - 2} x2={pin.x} y2={pin.y - 14} stroke={colors.stroke} strokeWidth="1.5" strokeLinecap="round" />
              <circle
                cx={pin.x}
                cy={pin.y - 16}
                r={focused ? 6 : pin.type === 'genuine' ? 3.5 : 5}
                fill={colors.fill}
                stroke="white"
                strokeWidth="1.75"
              />
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
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={12} className="text-primary shrink-0" />
              <span className="text-xs font-semibold text-foreground">{hovered.label}</span>
            </div>
            <p className="text-[10px] text-muted-foreground capitalize">{hovered.type.replace('-', ' ')} · {hovered.region}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="ds-geo-map-footer">
        <span className="flex items-center gap-1.5">
          <Globe size={11} className="text-primary" />
          Scan-derived flow signal
        </span>
        <span className="font-mono tabular-nums">
          {heats.reduce((s, h) => s + h.totalScans, 0)} scans · {pins.filter((p) => p.type !== 'genuine').length} alert pins
        </span>
      </div>
    </div>
  );
}

type AlertFilter = 'all' | 'fail' | 'oor' | 'high';

export interface ChannelMapProps {
  callbacks: ScreenCallbacks;
}

export function ChannelMapScreen({ callbacks }: ChannelMapProps) {
  const { runtimeScans, alertCount } = useChannelIntegrity();
  const [alertFilter, setAlertFilter] = useState<AlertFilter>('all');
  const [drawerAlert, setDrawerAlert] = useState<ChannelMapAlertRow | null>(null);

  const alerts = useMemo(() => getChannelMapAlerts(runtimeScans), [runtimeScans]);
  const kpis = useMemo(() => getChannelMapKpis(runtimeScans), [runtimeScans]);
  const heats = useMemo(() => getChannelMapRegionHeats(runtimeScans), [runtimeScans]);
  const pins = useMemo(
    () => getChannelMapPins(runtimeScans, drawerAlert?.id ?? null),
    [runtimeScans, drawerAlert?.id],
  );

  const filteredAlerts = useMemo(
    () =>
      alerts.filter((alert) => {
        if (alertFilter === 'fail') return alert.type === 'fail-cluster' || alert.type === 'field-raised';
        if (alertFilter === 'oor') return alert.type === 'out-of-region';
        if (alertFilter === 'high') return alert.severity === 'high';
        return true;
      }),
    [alerts, alertFilter],
  );

  const drawerScans = useMemo(
    () => (drawerAlert ? getScansByIds(drawerAlert.scanIds, runtimeScans) : []),
    [drawerAlert, runtimeScans],
  );

  const openDrawer = (alert: ChannelMapAlertRow) => {
    setDrawerAlert(alert);
    callbacks.showToast(`Focused ${alert.location} · ${alert.distributor}`, 'warning');
  };

  const alertTypeLabel = (type: ChannelMapAlertRow['type']) => {
    if (type === 'field-raised') return 'Field Alert';
    if (type === 'fail-cluster') return 'Fail Cluster';
    return 'Out-of-Region';
  };

  return (
    <div className="ds-page relative">
      <motion.div
        initial="initial"
        animate="animate"
        variants={staggerContainer}
        className="ds-page-inner-wide ds-stack"
      >
        <motion.div variants={fadeInUp}>
          <PageHeader
            icon={MapIcon}
            title="Channel Integrity Map"
            subtitle="Scan-derived flow signal — not warehouse stock"
          />
        </motion.div>

        <motion.div variants={fadeInUp} className="ds-filter-bar">
          {(
            [
              { id: 'all' as const, label: 'All Alerts' },
              { id: 'fail' as const, label: 'Fail Clusters' },
              { id: 'oor' as const, label: 'Out-of-Region' },
              { id: 'high' as const, label: 'High Severity' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setAlertFilter(f.id);
                setDrawerAlert(null);
              }}
              className={`ds-filter-chip ${alertFilter === f.id ? 'ds-filter-chip-active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </motion.div>

        <motion.div variants={fadeInUp} className="ds-kpi-grid">
          <KpiCard
            label="Total scans (window)"
            value={kpis.totalScans.toLocaleString()}
            source="prov__scan_count"
            freshness="all field verification events"
            delay={0}
          />
          <KpiCard
            label="Verification fail rate"
            value={`${kpis.failRate}%`}
            trend={kpis.failRate > 2 ? 'down' : 'up'}
            source="prov__verify_fail_rate"
            freshness="suspect ÷ total scans"
            delay={0.04}
          />
          <KpiCard
            label="Out-of-region"
            value={kpis.outOfRegionCount.toLocaleString()}
            source="prov__out_of_region_flag"
            freshness="scan geo ≠ distributor home region"
            delay={0.08}
          />
          <KpiCard
            label="Distributors with open alerts"
            value={`${kpis.distributorsWithAlerts} · ${alertCount} alerts`}
            statTrend={{ value: 'matches dashboard bell', direction: 'flat' }}
            source="chan__integrity_alert_count"
            freshness="regional clusters + field raises"
            delay={0.12}
          />
        </motion.div>

        <div className="ds-grid-3">
          <motion.div variants={fadeInUp} className="lg:col-span-2">
            <DataCard title="Regional scan activity">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-muted-foreground mb-3 -mt-1">
                <div className="flex items-center gap-1.5">
                  <span className="ds-geo-legend-dot bg-[#9CA3AF]" />
                  <span>Genuine (neutral)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="ds-geo-legend-dot bg-[#D40924] shadow-[0_0_6px_rgba(212,9,36,0.5)]" />
                  <span>Fail cluster</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="ds-geo-legend-dot bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
                  <span>Grey-market / out-of-region</span>
                </div>
              </div>
              <ChannelIntegrityMapView
                heats={heats}
                pins={pins}
                focusAlertId={drawerAlert?.id ?? null}
                onPinClick={(pin) => {
                  const alert = alerts.find((a) => a.id === pin.alertId);
                  if (alert) openDrawer(alert);
                }}
              />
              <ProvenanceHint source="prov__scan_geo · model__channel_integrity" freshness="heat layer + discrete alert pins" className="mt-2" />
            </DataCard>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <DataCard title="Channel alerts">
              <div className="flex items-center gap-2 mb-3 -mt-1">
                <AlertTriangle size={16} className="text-primary" />
                <span className="text-xs text-muted-foreground">{filteredAlerts.length} shown</span>
              </div>
              <div className="space-y-2 max-h-[22rem] overflow-y-auto scrollbar-thin">
                {filteredAlerts.length === 0 ? (
                  <EmptyState title="No alerts" description="No channel integrity alerts match this filter." className="py-6" />
                ) : (
                  filteredAlerts.map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => openDrawer(alert)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        drawerAlert?.id === alert.id
                          ? 'bg-primary/10 border-primary'
                          : 'bg-muted/30 border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            alert.type === 'out-of-region'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                          }`}
                        >
                          {alertTypeLabel(alert.type)}
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            alert.severity === 'high' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {alert.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground mt-2">{alert.location}</p>
                      <p className="text-xs text-muted-foreground">{alert.distributor}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.count} scans flagged</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatAlertTime(alert.firstSeen)} → {formatAlertTime(alert.lastSeen)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </DataCard>
          </motion.div>
        </div>
      </motion.div>

      {/* Alert detail drawer */}
      <AnimatePresence>
        {drawerAlert && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 lg:bg-transparent"
              onClick={() => setDrawerAlert(null)}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-card border-l border-border z-50 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div>
                  <h3 className="font-semibold text-foreground">{drawerAlert.distributor}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {alertTypeLabel(drawerAlert.type)} · {drawerAlert.location}
                  </p>
                </div>
                <button type="button" onClick={() => setDrawerAlert(null)} className="ds-btn-icon ds-btn-ghost" aria-label="Close drawer">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="ds-kv-grid">
                  <div className="ds-kv-cell">
                    <p className="ds-kv-label">Scans flagged</p>
                    <p className="ds-kv-value">{drawerAlert.count}</p>
                  </div>
                  <div className="ds-kv-cell">
                    <p className="ds-kv-label">Severity</p>
                    <p className="ds-kv-value capitalize">{drawerAlert.severity}</p>
                  </div>
                  <div className="ds-kv-cell">
                    <p className="ds-kv-label">First seen</p>
                    <p className="ds-kv-value text-sm">{formatAlertTime(drawerAlert.firstSeen)}</p>
                  </div>
                  <div className="ds-kv-cell">
                    <p className="ds-kv-label">Last seen</p>
                    <p className="ds-kv-value text-sm">{formatAlertTime(drawerAlert.lastSeen)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Underlying scan events</p>
                  <ul className="space-y-2">
                    {drawerScans.map((scan) => {
                      const part = getPart(scan.partId);
                      return (
                        <li key={scan.id} className="flex items-start gap-2 p-2.5 rounded-lg border border-border bg-muted/20 text-sm">
                          {scan.result === 'genuine' ? (
                            <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-xs font-semibold truncate">{part?.sku ?? scan.partId}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {scan.geo.region} · {formatAlertTime(scan.timestamp)}
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold uppercase ${scan.result === 'suspect' ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {scan.result}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <ProvenanceHint source="prov__scan_events" freshness={`${drawerScans.length} events in cluster`} />
              </div>

              <div className="p-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    callbacks.goToCustomer(drawerAlert.customerId);
                    callbacks.showToast(`Opening Account Wiki: ${drawerAlert.distributor}`, 'info');
                    setDrawerAlert(null);
                  }}
                  className="ds-btn-lg ds-btn-danger ds-btn-block"
                >
                  Flag distributor for review
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
