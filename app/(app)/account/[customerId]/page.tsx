'use client';

import { use } from 'react';
import { AccountWikiScreen } from '@/components/screens/legacy-screens';
import { ScreenPage } from '@/components/screens/screen-page';

export default function AccountCustomerPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = use(params);

  return (
    <ScreenPage
      render={(callbacks) => <AccountWikiScreen callbacks={callbacks} customerId={customerId} />}
    />
  );
}
