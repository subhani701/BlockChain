'use client';

import { ProvenanceAdminScreen } from '@/components/screens';
import { ScreenPage } from '@/components/screens/screen-page';

export default function ProvenanceRegistryPage() {
  return <ScreenPage render={(callbacks) => <ProvenanceAdminScreen callbacks={callbacks} />} />;
}
