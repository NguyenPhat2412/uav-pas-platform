'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Button } from './ui';

const navItems = [
  { href: '/dashboard', key: 'dashboard', defaultLabel: 'Tổng quan', permission: 'MISSION_VIEW' },
  { href: '/services', key: 'services', defaultLabel: 'Dịch vụ UAV', permission: 'MISSION_VIEW' },
  { href: '/missions', key: 'missions', defaultLabel: 'Mission của tôi', permission: 'MISSION_VIEW' },
  { href: '/billing', key: 'billing', defaultLabel: 'Gói cước & Hóa đơn' },
  { href: '/notifications', key: 'notifications', defaultLabel: 'Thông báo' },
  { href: '/profile', key: 'profile', defaultLabel: 'Tài khoản' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, can, permissionsReady } = useAuth();
  const { t } = useI18n();

  return (
    <div className="customer-shell">
      <a href="#content" className="skip-link">{t('common.skipToContent')}</a>
      <aside className="sidebar">
        <Link href="/dashboard" className="brand">
          <b>UAV PAS</b>
          <small>{t('nav.portalTitle')}</small>
        </Link>
        <nav aria-label="Điều hướng khách hàng">
          {navItems
            .filter((item) => !item.permission || (permissionsReady && can(item.permission)))
            .map(({ href, key, defaultLabel }) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href || pathname.startsWith(`${href}/`) ? 'page' : undefined}
              >
                {t(`nav.${key}`) || defaultLabel}
              </Link>
            ))}
        </nav>
        <button className="logout" onClick={() => void logout()}>
          {t('common.logout')}
        </button>
      </aside>
      <div className="customer-workspace">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>{t('nav.portalTitle')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <LanguageSwitcher />
            <Link href="/profile" className="account">
              {user?.fullName || user?.username}
            </Link>
          </div>
        </header>
        <main id="content" className="customer-main">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageGuard({
  children,
  permission = 'MISSION_VIEW',
}: {
  children: React.ReactNode;
  permission?: string | null;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, permissionsReady, permissionError, refreshPermissions, can } = useAuth();
  const { t } = useI18n();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isDemo = isMounted && typeof window !== 'undefined' && window.location.search.includes('demo=true');

  useEffect(() => {
    if (isMounted && !isDemo && !isLoading && !isAuthenticated) router.replace('/login');
  }, [router, isLoading, isAuthenticated, isDemo, isMounted]);

  if (isDemo) {
    return <AppShell>{children}</AppShell>;
  }

  if (!isMounted || isLoading || !isAuthenticated) {
    return (
      <div className="center-state" role="status">
        {t('common.authenticating')}
      </div>
    );
  }

  return (
    <AppShell>
      {permission && permissionError ? (
        <div className="error" role="alert">
          {t('common.permissionError')} <Button onClick={() => void refreshPermissions()}>{t('common.retry')}</Button>
        </div>
      ) : permission && !permissionsReady ? (
        <div role="status">{t('common.checkingPermissions')}</div>
      ) : permission && !can(permission) ? (
        <div className="notice" role="alert">
          {t('common.permissionDenied')}
        </div>
      ) : (
        children
      )}
    </AppShell>
  );
}
