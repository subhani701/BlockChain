'use client';

import { GovernanceScreen } from '@/components/screens';
import { ScreenPage } from '@/components/screens/screen-page';

export default function GovernancePage() {
  return <ScreenPage render={(callbacks) => <GovernanceScreen callbacks={callbacks} />} />;
}
