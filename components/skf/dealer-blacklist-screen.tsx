'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useRouter } from 'next/navigation';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { StatusBadge } from '@/components/badges/StatusBadge';
import { AttributionCard, KpiGrid, KpiTile, TimelineList } from '@/components/panels';
import { ProvenanceFooter } from '@/components/panels/ProvenanceFooter';
import { DealerActionPanel } from '@/components/skf/DealerActionPanel';
import { DataTable, type DataTableColumn } from '@/components/ui-ami';
import { useApp } from '@/components/providers/app-provider';
import {
  formatDidShort,
  formatRelativeTime,
  getCohortKpis,
  getCounterfeitRate,
  getDealerLeaderboard,
  getDealerSignal,
  getDealerWeeklySeries,
  getEnforcementLog,
  getReportsInWindow,
  getUniqueReporters,
  type DealerLeaderboardRow,
} from '@/lib/store/provenance';
import type { DealerStatus, ReportSeverity, TimeWindow } from '@/lib/store/types';

const REGIONS = ['All', 'Nordics', 'DACH', 'Central Europe', 'UK & Ireland', 'EMEA'];
const STATUSES: DealerStatus[] = ['Authorized', 'Under review', 'Warned', 'Suspended', 'Blacklisted'];

export function DealerBlacklistScreen() {
  const router = useRouter();
  const { selectedDealerDid, setSelectedDealerDid } = useApp();
  const [region, setRegion] = useState('All');
  const [window, setWindow] = useState<TimeWindow>('90d');
  const [statuses, setStatuses] = useState<DealerStatus[]>(['Under review', 'Warned', 'Suspended']);
  const [minReports, setMinReports] = useState(1);
  const [severityFloor, setSeverityFloor] = useState<ReportSeverity>('SUSPECTED');
  const [search, setSearch] = useState('');
  const [tick, setTick] = useState(0);

  const cohort = useMemo(() => getCohortKpis(window), [window, tick]);
  const rows = useMemo(() => {
    let list = getDealerLeaderboard({ region, window, statuses, minReports, severityFloor });
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.dealer.display_name.toLowerCase().includes(q));
    }
    return list;
  }, [region, window, statuses, minReports, severityFloor, search, tick]);

  const selected = useMemo(() => {
    if (selectedDealerDid) {
      const match = rows.find((r) => r.dealer.did === selectedDealerDid);
      if (match) return match;
    }
    return rows[0] ?? null;
  }, [rows, selectedDealerDid]);

  const weekly = selected ? getDealerWeeklySeries(selected.dealer.did) : [];
  const signal = selected ? getDealerSignal(selected.dealer.did) : { score: 0, attributions: [] };
  const enforcement = selected ? getEnforcementLog(selected.dealer.did) : [];

  const toggleStatus = (s: DealerStatus) => {
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const columns: DataTableColumn<DealerLeaderboardRow>[] = [
    {
      key: 'name',
      header: 'Dealer',
      cell: (r) => (
        <button type="button" className="text-left font-medium hover:text-primary" onClick={(e) => { e.stopPropagation(); setSelectedDealerDid(r.dealer.did); }}>
          {r.dealer.display_name}
        </button>
      ),
    },
    {
      key: 'did',
      header: 'DID',
      hideOnMobile: true,
      cell: (r) => <span className="font-mono text-xs">{formatDidShort(r.dealer.did)}</span>,
    },
    { key: 'region', header: 'Region', hideOnMobile: true, cell: (r) => r.dealer.region },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.dealer.status} /> },
    { key: 'reports', header: 'Reports', cell: (r) => r.reportCount },
    {
      key: 'rate',
      header: 'Counterfeit rate',
      cell: (r) => (
        <span className={r.counterfeitRate >= 0.15 ? 'text-red-600 font-semibold' : r.counterfeitRate >= 0.05 ? 'text-amber-600' : ''}>
          {(r.counterfeitRate * 100).toFixed(1)}%
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Last action',
      hideOnMobile: true,
      cell: (r) => r.lastAction ? <StatusBadge status={r.lastAction} /> : '—',
    },
    {
      key: 'proposals',
      header: 'Open DAO',
      cell: (r) => r.openProposals > 0 ? <span className="text-red-600 font-semibold">{r.openProposals}</span> : '0',
    },
  ];

  return (
    <div className="ds-page">
      <div className="ds-page-inner-wide ds-stack">
        <PageHeader
          icon={ShieldAlert}
          title="Dealer Authorization & Blacklist Console"
          subtitle="SKF channel — brand protection snapshot and enforcement actions"
          showSearch={false}
        />

        {/* Filters */}
        <div className="ds-card ds-card-pad space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <select className="ds-role-select" value={region} onChange={(e) => setRegion(e.target.value)}>
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select className="ds-role-select" value={window} onChange={(e) => setWindow(e.target.value as TimeWindow)}>
              {(['30d', '90d', '365d', 'lifetime'] as TimeWindow[]).map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
            <input type="number" min={0} className="ds-form-input w-24 h-9" value={minReports} onChange={(e) => setMinReports(Number(e.target.value))} placeholder="Min reports" />
            <select className="ds-role-select" value={severityFloor} onChange={(e) => setSeverityFloor(e.target.value as ReportSeverity)}>
              {(['SUSPECTED', 'CONFIRMED_VISUAL', 'CONFIRMED_LAB'] as ReportSeverity[]).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="search" placeholder="Search dealers…" className="ds-shell-search max-w-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="ds-filter-bar">
            {STATUSES.map((s) => (
              <button key={s} type="button" onClick={() => toggleStatus(s)} className={`ds-filter-chip ${statuses.includes(s) ? 'ds-filter-chip-active' : ''}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Cohort strip */}
        <div>
          <p className="ds-overline mb-2">SKF channel — brand protection snapshot</p>
          <KpiGrid columns={6}>
            <KpiTile label="Authorized dealers" value={cohort.authorized} />
            <KpiTile label="Under review" value={cohort.underReview} subValue={cohort.underReview >= 5 ? 'Above threshold' : undefined} />
            <KpiTile label="Suspended" value={cohort.suspended} />
            <KpiTile label="Blacklisted (lifetime)" value={cohort.blacklisted} />
            <KpiTile label={`Counterfeit reports (${window})`} value={cohort.reportsWindow} />
            <KpiTile label="Median counterfeit rate" value={`${(cohort.medianRate * 100).toFixed(1)}%`} />
          </KpiGrid>
          <ProvenanceFooter feature="dealer_kpi__cohort" />
        </div>

        {/* Dealer list */}
        <div className="ds-card overflow-hidden">
          <div className="ds-card-header"><h3 className="ds-section-title">Dealers — ranked by counterfeit signal</h3></div>
          <DataTable
            embedded
            columns={columns}
            data={rows}
            keyFn={(r) => r.dealer.id}
            onRowClick={(r) => setSelectedDealerDid(r.dealer.did)}
            emptyTitle="No dealers match filters"
          />
        </div>

        {selected && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7">
                <div className="ds-card">
                  <div className="ds-card-header"><h3 className="ds-section-title">Selected dealer</h3></div>
                  <div className="ds-card-body">
                    <h4 className="text-lg font-bold">{selected.dealer.display_name}</h4>
                    <button type="button" className="font-mono text-xs text-primary hover:underline mt-1" onClick={() => { navigator.clipboard?.writeText(selected.dealer.did); }}>
                      {formatDidShort(selected.dealer.did)}
                    </button>
                    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-sm">
                      <div><dt className="ds-overline">Region</dt><dd className="mt-0.5">{selected.dealer.region}</dd></div>
                      <div><dt className="ds-overline">Authorized since</dt><dd className="mt-0.5">{new Date(selected.dealer.authorized_since).toLocaleDateString()}</dd></div>
                      <div><dt className="ds-overline">Status</dt><dd className="mt-0.5"><StatusBadge status={selected.dealer.status} /></dd></div>
                      <div><dt className="ds-overline">Reports (window)</dt><dd className="mt-0.5 font-semibold">{selected.reportCount}</dd></div>
                      <div><dt className="ds-overline">Counterfeit rate</dt><dd className="mt-0.5 font-semibold">{(getCounterfeitRate(selected.dealer.did, window) * 100).toFixed(1)}%</dd></div>
                      <div><dt className="ds-overline">Distinct reporters</dt><dd className="mt-0.5">{getUniqueReporters(selected.dealer.did, window)}</dd></div>
                    </dl>
                    <div className="mt-3 flex gap-2">
                      <Link href={`/authenticity-reports?dealer_did=${encodeURIComponent(selected.dealer.did)}`} className="ds-btn-sm ds-btn-outline">
                        View reports ({getReportsInWindow(selected.dealer.did, window).length})
                      </Link>
                    </div>
                    <ProvenanceFooter feature="dealer_kpi__detail" />
                  </div>
                </div>
              </div>
              <div className="lg:col-span-5">
                <div className="ds-card h-full">
                  <div className="ds-card-header"><h3 className="ds-section-title">Counterfeit reports — weekly</h3></div>
                  <div className="ds-card-body h-48">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <LineChart data={weekly}>
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} dot />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7">
                <AttributionCard
                  title="Evidence pattern"
                  score={signal.score}
                  attributions={signal.attributions}
                  feature="dealer_kpi__counterfeit_signal_attribution"
                  onAttributionClick={() => router.push(`/authenticity-reports?dealer_did=${encodeURIComponent(selected.dealer.did)}`)}
                />
              </div>
              <div className="lg:col-span-5">
                <TimelineList
                  title="Enforcement history"
                  events={enforcement}
                  feature="dealer_authorization__event_log"
                  onProposalClick={(id) => router.push(`/dao/proposals/${id}`)}
                />
              </div>
            </div>

            <DealerActionPanel dealer={selected.dealer} onAction={() => setTick((t) => t + 1)} />
          </>
        )}
      </div>
    </div>
  );
}
