'use client';

import Link from 'next/link';
import { Wrench } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { getServiceRequests } from '@/lib/store/provenance';
import { StatusBadge } from '@/components/badges/StatusBadge';
import { DataTable, type DataTableColumn } from '@/components/ui-ami';
import type { ServiceRequest } from '@/lib/store/types';
import { formatRelativeTime } from '@/lib/store/provenance';

export function ServiceRequestsScreen() {
  const rows = getServiceRequests();

  const columns: DataTableColumn<ServiceRequest>[] = [
    {
      key: 'sr',
      header: 'Service request',
      cell: (r) => (
        <Link href={`/service-requests/${r.sr_id}/authenticity`} className="font-medium text-primary hover:underline">
          {r.sr_id}
        </Link>
      ),
    },
    { key: 'customer', header: 'Customer', cell: (r) => r.customer_display_name },
    { key: 'centre', header: 'Service centre', hideOnMobile: true, cell: (r) => r.service_centre.display_name },
    { key: 'opened', header: 'Opened', cell: (r) => formatRelativeTime(r.opened_at) },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'auth',
      header: 'Authenticity',
      cell: (r) => r.verification ? <StatusBadge status={r.verification.result} /> : <StatusBadge status="NOT_YET_SCANNED" />,
    },
    {
      key: 'action',
      header: '',
      cell: (r) => (
        <Link href={`/service-requests/${r.sr_id}/authenticity`} className="ds-btn-sm ds-btn-outline">
          Authenticity
        </Link>
      ),
    },
  ];

  return (
    <div className="ds-page">
      <div className="ds-page-inner-wide ds-stack">
        <div>
          <PageHeader
            icon={Wrench}
            title="Open Service Requests"
            subtitle="Field service operations — open an SR to run authenticity verification"
          />
        </div>
        <DataTable columns={columns} data={rows} keyFn={(r) => r.sr_id} emptyTitle="No service requests" />
      </div>
    </div>
  );
}
