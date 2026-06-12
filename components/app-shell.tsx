'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { HeaderNotifications } from '@/components/header-notifications';
import {
  Fingerprint,
  Lock,
  Menu,
  Moon,
  PanelLeft,
  PanelLeftClose,
  Sun,
  User,
  X,
} from 'lucide-react';
import { getPageTransitionKey, navGroups, ROUTES } from '@/lib/navigation';
import { fadeTransition, pageTransition } from '@/lib/motion';
import { getProvenanceAdminRoleOption } from '@/lib/provenance-admin-roles';
import { useApp } from '@/components/providers/app-provider';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const fullBleed = pathname === '/field-verify';
  const {
    isDark,
    setIsDark,
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    toggleSidebarCollapsed,
    showToast,
    provenanceAdminRole,
  } = useApp();
  const pageTransitionKey = getPageTransitionKey(pathname);
  const isProvenanceRegistry = pathname === ROUTES.provenanceRegistry;
  const roleOption = getProvenanceAdminRoleOption(provenanceAdminRole);
  const profileLabel = isProvenanceRegistry ? roleOption.label : 'OEM Admin';
  const railCollapsed = sidebarCollapsed;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const openNav = () => setSidebarOpen(true);

  return (
    <div
      className="h-[100dvh] overflow-hidden bg-background text-foreground transition-colors duration-200"
      data-sidebar-collapsed={railCollapsed ? 'true' : 'false'}
    >
      <div className="relative flex h-full">
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            />
          )}
        </AnimatePresence>

        <aside
          className={cn(
            'ds-shell-sidebar fixed top-0 left-0 z-50 flex h-[100dvh] flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground',
            'w-[min(100vw,18rem)] sm:w-72',
            railCollapsed ? 'lg:w-[4.5rem]' : 'lg:w-60 xl:w-64',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          )}
        >
          <div className={cn('border-b border-border shrink-0 px-4 py-4', railCollapsed && 'lg:px-2 lg:py-3')}>
            <div
              className={cn(
                'flex gap-2',
                railCollapsed ? 'flex-col items-center lg:flex-col' : 'items-center justify-between',
              )}
            >
              <Link
                href="/"
                className={cn(
                  'flex min-w-0 items-center',
                  railCollapsed ? 'justify-center lg:w-full' : 'gap-3 flex-1',
                )}
                onClick={() => setSidebarOpen(false)}
                title="VoltusWave Home"
              >
                <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-primary shrink-0">
                  <Fingerprint className="h-[18px] w-[18px] text-primary-foreground" />
                </div>
                <div className={cn('min-w-0 flex-1', railCollapsed && 'lg:hidden')}>
                  <h1 className="text-sm font-semibold text-foreground truncate">VoltusWave</h1>
                  <p className="text-xs font-normal text-muted-foreground truncate">Aftermarket Intelligence</p>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="ds-btn-icon ds-btn-ghost lg:hidden shrink-0"
                aria-label="Close navigation"
              >
                <X size={20} className="text-muted-foreground" />
              </button>

              <button
                type="button"
                onClick={toggleSidebarCollapsed}
                className="ds-btn-icon ds-btn-ghost hidden lg:inline-flex shrink-0"
                aria-label={railCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={railCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {railCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
              </button>
            </div>
          </div>

          <nav className={cn('flex-1 overflow-y-auto scrollbar-thin px-3 py-3', railCollapsed && 'lg:px-2')}>
            {navGroups.map((group) => (
              <div key={group.phase}>
                <p className={cn('ds-nav-phase', railCollapsed && 'lg:sr-only')}>{group.phase}</p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      title={item.label}
                      className={cn(
                        'ds-nav-link w-full',
                        railCollapsed && 'lg:justify-center lg:px-2 lg:gap-0',
                        active ? 'ds-nav-link-active' : 'ds-nav-link-inactive',
                      )}
                    >
                      <Icon size={16} className="shrink-0 opacity-80" />
                      <span className={cn('truncate flex-1 min-w-0', railCollapsed && 'lg:hidden')}>
                        {item.label}
                      </span>
                      {item.tier === 'admin' && (
                        <Lock
                          size={12}
                          className={cn('ml-auto shrink-0 opacity-40', railCollapsed && 'lg:hidden')}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className={cn('border-t border-border shrink-0 px-3 py-3', railCollapsed && 'lg:px-2')}>
            <div
              className={cn(
                'flex items-center gap-2 min-w-0',
                railCollapsed && 'lg:justify-center',
              )}
              title="Private Ethereum · connected"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className={cn('text-xs text-muted-foreground truncate', railCollapsed && 'lg:hidden')}>
                Private Ethereum · connected
              </span>
            </div>
          </div>
        </aside>

        <main
          className={cn(
            'ds-shell-main flex h-[100dvh] min-w-0 flex-1 flex-col overflow-hidden',
            railCollapsed && 'ds-shell-main-collapsed',
          )}
        >
          {!fullBleed && (
            <header className="z-30 shrink-0 ds-mobile-header lg:px-6 xl:px-8">
              <div className="flex items-center justify-end gap-2 sm:gap-3 w-full min-w-0">
                <button
                  type="button"
                  onClick={openNav}
                  className="ds-btn-icon ds-btn-ghost lg:hidden shrink-0 mr-auto"
                  aria-label="Open navigation"
                >
                  <Menu size={20} />
                </button>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
                  <div
                    className="flex items-center gap-1.5 h-8 max-w-[11rem] sm:max-w-[14rem] px-2 sm:px-3 rounded-md border border-border bg-card text-xs font-medium text-foreground min-w-0"
                    aria-label="Current role"
                  >
                    <User size={14} className="text-muted-foreground shrink-0" />
                    <span className="truncate hidden min-[380px]:inline">{profileLabel}</span>
                  </div>
                  <HeaderNotifications />
                  <button
                    type="button"
                    onClick={() => {
                      setIsDark(!isDark);
                      showToast(isDark ? 'Light mode enabled' : 'Dark mode enabled', 'info');
                    }}
                    className="ds-btn-icon ds-btn-outline shrink-0"
                    aria-label="Toggle theme"
                  >
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                  </button>
                </div>
              </div>
            </header>
          )}

          <div className="min-h-0 flex-1 w-full overflow-x-hidden overflow-y-auto">
            <AnimatePresence mode="sync">
              <motion.div
                key={pageTransitionKey}
                className="w-full min-w-0"
                variants={pageTransition}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={fadeTransition()}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
