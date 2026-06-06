'use client';

import { AccountWikiScreen } from '@/components/screens/legacy-screens';
import { ScreenPage } from '@/components/screens/screen-page';

export default function AccountIndexPage() {
  return <ScreenPage render={(callbacks) => <AccountWikiScreen callbacks={callbacks} initialCustomerId="c3" />} />;
}
