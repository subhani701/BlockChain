'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/navigation';

export default function AccountIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`${ROUTES.account('c3')}`);
  }, [router]);

  return (
    <div className="ds-page">
      <p className="text-sm text-muted-foreground">Loading account…</p>
    </div>
  );
}
