'use client';

import { FieldVerifyScreen } from '@/components/screens/legacy-screens';
import { useApp } from '@/components/providers/app-provider';
import { ScreenPage } from '@/components/screens/screen-page';

export default function FieldVerifyPage() {
  const { isDark, setIsDark, setSidebarOpen, showToast } = useApp();

  return (
    <ScreenPage
      render={(callbacks) => (
        <FieldVerifyScreen
          isDark={isDark}
          setIsDark={setIsDark}
          onMenuClick={() => {
            setSidebarOpen(true);
            showToast('Navigation opened', 'info');
          }}
          callbacks={callbacks}
        />
      )}
    />
  );
}
