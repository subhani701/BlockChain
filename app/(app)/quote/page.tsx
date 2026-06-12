'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { QuoteWorkbenchScreen } from '@/components/screens';
import { useApp } from '@/components/providers/app-provider';
import { ScreenPage } from '@/components/screens/screen-page';

function QuoteIndexContent() {
  const searchParams = useSearchParams();
  const { setQuoteContext, showToast } = useApp();

  useEffect(() => {
    const customerId = searchParams.get('customerId') ?? undefined;
    const partId = searchParams.get('partId') ?? undefined;
    const from = searchParams.get('from') ?? undefined;
    if (customerId || partId || from) {
      setQuoteContext({ customerId, partId, from });
      showToast('Quote workbench preloaded', 'info');
    }
  }, [searchParams, setQuoteContext, showToast]);

  return <ScreenPage render={(callbacks) => <QuoteWorkbenchScreen callbacks={callbacks} />} />;
}

export default function QuoteIndexPage() {
  return (
    <Suspense fallback={<div className="ds-page p-6 text-sm text-muted-foreground">Loading quote…</div>}>
      <QuoteIndexContent />
    </Suspense>
  );
}
