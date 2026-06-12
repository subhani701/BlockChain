'use client';

import { InstallBaseScreen } from '@/components/screens/legacy-screens';
import { ScreenPage } from '@/components/screens/screen-page';

export default function InstallBasePage() {
  return <ScreenPage render={(callbacks) => <InstallBaseScreen callbacks={callbacks} />} />;
}
