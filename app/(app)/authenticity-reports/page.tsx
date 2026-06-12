import { Suspense } from 'react';
import { AuthenticityReportsScreen } from '@/components/skf/authenticity-reports-screen';

export default function AuthenticityReportsPage() {
  return (
    <Suspense fallback={<div className="ds-page"><p className="ds-caption">Loading reports…</p></div>}>
      <AuthenticityReportsScreen />
    </Suspense>
  );
}
