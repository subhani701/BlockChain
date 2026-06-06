'use client';

import { ChannelMapScreen } from '@/components/screens/legacy-screens';
import { ScreenPage } from '@/components/screens/screen-page';

export default function ChannelMapPage() {
  return <ScreenPage render={(callbacks) => <ChannelMapScreen callbacks={callbacks} />} />;
}
