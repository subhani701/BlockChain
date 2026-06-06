'use client';

import { SellerWorklistScreen } from '@/components/screens';
import { ScreenPage } from '@/components/screens/screen-page';

export default function SellerWorklistPage() {
  return <ScreenPage render={(callbacks) => <SellerWorklistScreen callbacks={callbacks} />} />;
}
