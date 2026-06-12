'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { QuoteWorkbenchScreen } from '@/components/screens';
import { useApp } from '@/components/providers/app-provider';
import { ScreenPage } from '@/components/screens/screen-page';

function QuoteDetailContent({ params }: { params: { quoteId: string } }) {
  const searchParams = useSearchParams();
  const { setQuoteContext, showToast } = useApp();

  useEffect(() => {
    const customerId = searchParams.get('customerId') ?? undefined;
    const partId = searchParams.get('partId') ?? undefined;
    const from = searchParams.get('from') ?? undefined;
    setQuoteContext({ customerId, partId, from });
    if (customerId || partId) {
      showToast(`Quote ${params.quoteId} preloaded`, 'info');
    }
  }, [params.quoteId, searchParams, setQuoteContext, showToast]);

  return (
    <ScreenPage
      render={(callbacks) => (
        <QuoteWorkbenchScreen callbacks={callbacks} quoteId={params.quoteId} />
      )}
    />
  );
}

export default function QuoteDetailPage({ params }: { params: { quoteId: string } }) {
  return (
    <Suspense fallback={<div className="ds-page p-6 text-sm text-muted-foreground">Loading quote…</div>}>
      <QuoteDetailContent params={params} />
    </Suspense>
  );
}
