'use client';

import { BatchMintingScreen } from '@/components/screens/legacy-screens';
import { ScreenPage } from '@/components/screens/screen-page';

export default function BatchMintingPage() {
  return <ScreenPage render={(callbacks) => <BatchMintingScreen callbacks={callbacks} />} />;
}
