'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QrCode, ScanLine } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/badges/StatusBadge';
import { AttributionCard, KpiGrid, KpiTile, TimelineList } from '@/components/panels';
import { ProvenanceFooter } from '@/components/panels/ProvenanceFooter';
import { CounterfeitReportForm } from '@/components/skf/CounterfeitReportForm';
import { DataTable, type DataTableColumn } from '@/components/ui-ami';
import { useApp } from '@/components/providers/app-provider';
import {
  formatDidShort,
  formatRelativeTime,
  getCustodyChain,
  getLastDealerFromChain,
  getProduct,
  getReportsByDealer,
  getServiceRequest,
  scanServiceRequest,
} from '@/lib/store/provenance';
import type { CounterfeitReport } from '@/lib/store/types';

interface SrAuthenticityScreenProps {
  srId: string;
}

export function SrAuthenticityScreen({ srId }: SrAuthenticityScreenProps) {
  const router = useRouter();
  const { showToast, setSelectedDealerDid } = useApp();
  const [tick, setTick] = useState(0);
  const sr = useMemo(() => getServiceRequest(srId), [srId, tick]);
  const product = sr ? getProduct(sr.product_serial) : undefined;
  const custody = sr ? getCustodyChain(sr.product_serial) : [];
  const lastDealer = sr ? getLastDealerFromChain(sr.product_serial) : null;
  const dealerReports = lastDealer ? getReportsByDealer(lastDealer.did, 365) : [];

  if (!sr) {
    return (
      <div className="ds-page">
        <div className="ds-page-inner-wide">
          <p className="ds-title">Service request not found</p>
          <Link href="/service-requests" className="text-sm text-primary hover:underline mt-2 inline-block">Back to service requests</Link>
        </div>
      </div>
    );
  }

  const verification = sr.verification;
  const showReportForm = verification && ['COUNTERFEIT', 'CANNOT_VERIFY'].includes(verification.result);

  const handleScan = () => {
    scanServiceRequest(srId);
    setTick((t) => t + 1);
    showToast('QR scan complete — Merkle proof verified', 'success');
  };

  const copyDid = (did: string) => {
    navigator.clipboard?.writeText(did);
    showToast('DID copied', 'info');
  };

  const reportColumns: DataTableColumn<CounterfeitReport>[] = [
    { key: 'at', header: 'Reported', cell: (r) => formatRelativeTime(r.reported_at) },
    { key: 'sku', header: 'SKU', cell: (r) => <span className="font-mono text-xs">{r.sku}</span> },
    { key: 'sev', header: 'Severity', cell: (r) => <StatusBadge status={r.severity} /> },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    { key: 'sc', header: 'Reporter', cell: (r) => r.reporter_service_centre, hideOnMobile: true },
  ];

  return (
    <div className="ds-page">
      <div className="ds-page-inner-wide ds-stack">
        <PageHeader
          icon={ScanLine}
          title="Authenticity check"
          subtitle={`${sr.sr_id} · ${sr.customer_display_name}`}
          action={
            verification && ['NOT_YET_SCANNED', 'CANNOT_VERIFY'].includes(verification.result) ? (
              <button type="button" onClick={handleScan} className="ds-btn-md ds-btn-primary">
                <QrCode size={14} /> Scan QR
              </button>
            ) : undefined
          }
        />

        {/* SR context ribbon */}
        <div className="ds-card sticky top-0 z-20 md:static">
          <div className="ds-card-body-compact">
            <KpiGrid columns={5}>
              <KpiTile variant="context" label="Service request" value={sr.sr_id} subValue={sr.customer_display_name} />
              <KpiTile variant="context" label="Opened" value={formatRelativeTime(sr.opened_at)} />
              <KpiTile variant="context" label="Service centre" value={sr.service_centre.display_name} />
              <KpiTile
                variant="context"
                label="Technician DID"
                value={formatDidShort(sr.technician.did)}
                mono
                onClick={() => copyDid(sr.technician.did)}
              />
              <KpiTile
                variant="context"
                label="Status"
                value={<StatusBadge status={sr.status} className="text-[11px] px-2 py-0.5" />}
              />
            </KpiGrid>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Verification headline */}
          <div className="lg:col-span-6">
            <div className="ds-card h-full">
              <div className="ds-card-header flex items-center justify-between">
                <h3 className="ds-section-title">Authenticity verification</h3>
                {verification && ['NOT_YET_SCANNED', 'CANNOT_VERIFY'].includes(verification.result) && (
                  <button type="button" onClick={handleScan} className="ds-btn-sm ds-btn-primary">
                    <QrCode size={14} /> Scan / Re-scan QR
                  </button>
                )}
              </div>
              <div className="ds-card-body">
                {verification ? (
                  <>
                    <StatusBadge status={verification.result} className="text-sm px-3 py-1" />
                    {verification.confidence !== null && (
                      <p className="text-3xl font-bold mt-3 tabular-nums">{Math.round(verification.confidence * 100)}%</p>
                    )}
                    {verification.timestamp && (
                      <p className="text-xs text-muted-foreground mt-1">Verified {formatRelativeTime(verification.timestamp)}</p>
                    )}
                  </>
                ) : (
                  <p className="ds-caption">Not yet scanned</p>
                )}
                <ProvenanceFooter feature="provenance__verification_result" />
              </div>
            </div>
          </div>

          {/* Product panel */}
          <div className="lg:col-span-6">
            <div className="ds-card h-full">
              <div className="ds-card-header"><h3 className="ds-section-title">Product</h3></div>
              <div className="ds-card-body">
                {product ? (
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="ds-overline">Serial</dt><dd className="font-medium mt-0.5">{product.serial}</dd></div>
                    <div><dt className="ds-overline">SKU</dt><dd className="font-medium mt-0.5">{product.sku}</dd></div>
                    <div><dt className="ds-overline">Batch</dt><dd className="font-medium mt-0.5">{product.batch_id}</dd></div>
                    <div><dt className="ds-overline">Manufactured</dt><dd className="font-medium mt-0.5">{new Date(product.manufactured_at).toLocaleDateString()}</dd></div>
                    {verification?.chain_anchor_ref && (
                      <div className="col-span-2">
                        <dt className="ds-overline">On-chain anchor</dt>
                        <dd><button type="button" className="font-mono text-xs text-primary hover:underline" onClick={() => showToast('Opening block explorer…', 'info')}>{verification.chain_anchor_ref}</button></dd>
                      </div>
                    )}
                    {verification?.merkle_root && (
                      <div className="col-span-2">
                        <dt className="ds-overline">Merkle root</dt>
                        <dd><button type="button" className="font-mono text-xs text-primary hover:underline" onClick={() => { navigator.clipboard?.writeText(verification.merkle_root!); showToast('Root copied', 'info'); }}>{verification.merkle_root}</button></dd>
                      </div>
                    )}
                  </dl>
                ) : (
                  <p className="ds-caption">Product not found</p>
                )}
                <ProvenanceFooter feature="provenance__chain_anchor_ref" />
              </div>
            </div>
          </div>

          {/* Custody timeline */}
          <div className="lg:col-span-12">
            <TimelineList
              title="Custody chain — plant to customer"
              events={custody}
              feature="provenance__custody_chain__current"
              horizontalOnMobile
            />
            {lastDealer && (
              <p className="text-xs text-muted-foreground mt-2 px-1">
                Last dealer:{' '}
                <button type="button" className="text-primary hover:underline" onClick={() => { setSelectedDealerDid(lastDealer.did); router.push('/channel-governance/dealers'); }}>
                  {lastDealer.name}
                </button>
              </p>
            )}
          </div>

          {/* Explanation */}
          <div className="lg:col-span-6">
            <AttributionCard
              title="Why this result"
              attributions={verification?.attribution ?? []}
              feature="provenance__verification_attribution"
            />
          </div>

          {/* Dealer history */}
          <div className="lg:col-span-6">
            <div className="ds-card">
              <div className="ds-card-header"><h3 className="ds-section-title">Reports against this dealer (365d)</h3></div>
              <DataTable
                embedded
                columns={reportColumns}
                data={dealerReports.slice(0, 5)}
                keyFn={(r) => r.report_id}
                emptyTitle="No reports in window"
                onRowClick={(r) => router.push(`/authenticity-reports?highlight=${r.report_id}`)}
              />
              <div className="px-4 pb-3"><ProvenanceFooter feature="counterfeit_report__by_dealer__w365d" /></div>
            </div>
          </div>

          {/* Report form */}
          {showReportForm && product && lastDealer && (
            <div className="lg:col-span-12">
              <CounterfeitReportForm
                srId={sr.sr_id}
                productSerial={product.serial}
                sku={product.sku}
                technicianDid={sr.technician.did}
                serviceCentre={sr.service_centre.display_name}
                defaultDealerDid={lastDealer.did}
                onSubmitted={() => {
                  setTick((t) => t + 1);
                  if (lastDealer) {
                    setSelectedDealerDid(lastDealer.did);
                    showToast('Optional: review dealer in Channel Governance console', 'info');
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
