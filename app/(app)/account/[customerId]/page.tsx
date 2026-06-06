'use client';

import { useEffect } from 'react';
import { AccountWikiScreen } from '@/components/screens/legacy-screens';
import { useApp } from '@/components/providers/app-provider';
import { ScreenPage } from '@/components/screens/screen-page';
import { getCustomer } from '@/lib/data/ami-data';

export default function AccountCustomerPage({ params }: { params: { customerId: string } }) {
  const { setSelectedCustomerId, showToast } = useApp();

  useEffect(() => {
    setSelectedCustomerId(params.customerId);
    const customer = getCustomer(params.customerId);
    if (customer) showToast(`Viewing ${customer.name}`, 'info');
  }, [params.customerId, setSelectedCustomerId, showToast]);

  return <ScreenPage render={(callbacks) => <AccountWikiScreen callbacks={callbacks} initialCustomerId={params.customerId} />} />;
}
