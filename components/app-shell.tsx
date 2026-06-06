'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  ChevronDown,
  Fingerprint,
  Lock,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from 'lucide-react';
import { navGroups, getNavItemForPath } from '@/lib/navigation';
import { fadeTransition, pageTransition } from '@/lib/motion';
import { useApp } from '@/components/providers/app-provider';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const fullBleed = pathname === '/field-verify';
  const { isDark, setIsDark, sidebarOpen, setSidebarOpen, showToast, channelAlertCount } = useApp();
  const activeNav = getNavItemForPath(pathname);
  const alertCount = channelAlertCount;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-primary/3 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative flex min-h-screen">
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
            'fixed lg:sticky top-0 left-0 h-[100dvh] bg-sidebar border-r border-sidebar-border z-50 flex flex-col overflow-hidden transition-all duration-300 ease-out shadow-sm',
            'w-72 xl:w-72',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
            'lg:translate-x-0',
            'lg:w-64 xl:w-72',
          )}
        >
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3 min-w-0" onClick={() => setSidebarOpen(false)}>
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25 shrink-0">
                  <Fingerprint className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-base font-bold tracking-tight text-foreground truncate">VoltusWave</h1>
                  <p className="text-[10px] font-medium text-muted-foreground truncate">Aftermarket Intelligence</p>
                </div>
              </Link>
              <button type="button" onClick={() => setSidebarOpen(false)} className="ds-btn-icon ds-btn-ghost lg:hidden">
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>
          </div>

          <nav className="flex-1 p-2 lg:p-3 overflow-y-auto scrollbar-thin">
            {navGroups.map((group) => (
              <div key={group.phase} className="mb-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground px-2.5 mb-1.5">
                  {group.phase}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <motion.div key={item.id} whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
                      <Link
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        title={item.label}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-1',
                          active
                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                        )}
                      >
                        <Icon size={18} className="shrink-0" />
                        <span className="truncate flex-1 min-w-0 lg:hidden">{item.label}</span>
                        <span className="truncate flex-1 min-w-0 hidden lg:inline xl:hidden">{item.shortLabel}</span>
                        <span className="truncate flex-1 min-w-0 hidden xl:inline">{item.label}</span>
                        {item.tier === 'admin' && <Lock size={12} className="ml-auto shrink-0 opacity-50" />}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="p-3 border-t border-border">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                <span className="text-xs text-muted-foreground truncate">Voltus Private Ethereum · connected</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => {
                  setIsDark(!isDark);
                  showToast(isDark ? 'Light mode enabled' : 'Dark mode enabled', 'info');
                }}
                className="ds-btn-icon ds-btn-outline shrink-0"
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </motion.button>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col overflow-x-hidden">
          {!fullBleed && (
            <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border px-4 py-3 ds-mobile-header lg:px-6">
              <div className="flex items-center gap-3 max-w-7xl mx-auto w-full">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="ds-btn-icon ds-btn-ghost lg:hidden shrink-0"
                  aria-label="Open navigation"
                >
                  <Menu size={20} />
                </button>

                <div className="min-w-0 flex-1">
                  <h1 className="text-sm lg:text-base font-bold text-foreground truncate">
                    {activeNav?.label ?? 'VoltusWave AMI'}
                  </h1>
                </div>

                <div className="hidden md:flex items-center flex-1 max-w-md">
                  <div className="relative w-full">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="search"
                      placeholder="Search customers, parts, batches…"
                      className="ds-shell-search"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    className="hidden sm:flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-border bg-card text-sm font-medium text-foreground shadow-xs"
                  >
                    OEM Admin
                    <ChevronDown size={14} className="text-muted-foreground" />
                  </button>
                  <Link
                    href="/channel-map"
                    className="relative ds-btn-icon ds-btn-outline"
                    aria-label={`${alertCount} channel alerts`}
                  >
                    <Bell size={18} />
                    {alertCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {alertCount}
                      </span>
                    )}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDark(!isDark);
                      showToast(isDark ? 'Light mode enabled' : 'Dark mode enabled', 'info');
                    }}
                    className="ds-btn-icon ds-btn-outline lg:hidden"
                  >
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                  </button>
                </div>
              </div>
            </header>
          )}

          <div className={cn('flex-1', !fullBleed && 'max-w-7xl w-full mx-auto')}>
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
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
