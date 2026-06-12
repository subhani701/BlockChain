'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { FileWarning } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useSearchParams } from 'next/navigation';
import { getCounterfeitReports, getDealerByDid, formatRelativeTime } from '@/lib/store/provenance';
import { StatusBadge } from '@/components/badges/StatusBadge';
import { DataTable, type DataTableColumn } from '@/components/ui-ami';
import type { CounterfeitReport } from '@/lib/store/types';

export function AuthenticityReportsScreen() {
  const searchParams = useSearchParams();
  const dealerDid = searchParams.get('dealer_did');
  const highlight = searchParams.get('highlight');

  const rows = useMemo(() => {
    let list = getCounterfeitReports();
    if (dealerDid) list = list.filter((r) => r.dealer_did === dealerDid);
    return list;
  }, [dealerDid]);

  const dealer = dealerDid ? getDealerByDid(dealerDid) : undefined;

  const columns: DataTableColumn<CounterfeitReport>[] = [
    { key: 'id', header: 'Report ID', cell: (r) => <span className={r.report_id === highlight ? 'font-bold text-primary' : 'font-mono text-xs'}>{r.report_id}</span> },
    {
      key: 'sr',
      header: 'Service request',
      cell: (r) => (
        <Link href={`/service-requests/${r.sr_id}/authenticity`} className="text-primary hover:underline text-xs">
          {r.sr_id}
        </Link>
      ),
    },
    { key: 'dealer', header: 'Dealer', hideOnMobile: true, cell: (r) => <span className="font-mono text-xs">{r.dealer_did.split(':').pop()}</span> },
    { key: 'sku', header: 'SKU', cell: (r) => <span className="font-mono text-xs">{r.sku}</span> },
    { key: 'severity', header: 'Severity', cell: (r) => <StatusBadge status={r.severity} /> },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    { key: 'at', header: 'Reported', cell: (r) => formatRelativeTime(r.reported_at) },
  ];

  return (
    <div className="ds-page">
      <div className="ds-page-inner-wide ds-stack">
        <PageHeader
          icon={FileWarning}
          title="Authenticity Reports"
          subtitle={dealer ? `Filtered by ${dealer.display_name}` : 'All counterfeit reports filed by service technicians'}
          action={
            dealer ? (
              <Link href="/channel-governance/dealers" className="ds-btn-md ds-btn-outline shrink-0">
                Dealer console
              </Link>
            ) : undefined
          }
        />
        <DataTable columns={columns} data={rows} keyFn={(r) => r.report_id} emptyTitle="No reports" />
      </div>
    </div>
  );
}
