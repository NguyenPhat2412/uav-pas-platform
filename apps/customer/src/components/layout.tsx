'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, Bell, Boxes, ChevronLeft, ChevronRight, CreditCard, LayoutDashboard, LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Button } from './ui';

const navItems = [
  { href: '/dashboard', key: 'dashboard', defaultLabel: 'Tổng quan', icon: LayoutDashboard, permission: 'MISSION_VIEW' },
  { href: '/services', key: 'services', defaultLabel: 'Dịch vụ UAV', icon: Boxes, permission: 'MISSION_VIEW' },
  { href: '/missions', key: 'missions', defaultLabel: 'Mission của tôi', icon: Activity, permission: 'MISSION_VIEW' },
  { href: '/billing', key: 'billing', defaultLabel: 'Gói cước & Hóa đơn', icon: CreditCard },
  { href: '/notifications', key: 'notifications', defaultLabel: 'Thông báo', icon: Bell },
  { href: '/profile', key: 'profile', defaultLabel: 'Tài khoản', icon: User },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, can, permissionsReady } = useAuth();
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const isParamCollapsed = typeof window !== 'undefined' && window.location.search.includes('collapsed=true');
      const saved = localStorage.getItem('uav_sidebar_collapsed');
      if (isParamCollapsed) {
        setCollapsed(true);
      } else if (saved !== null) {
        setCollapsed(saved === 'true');
      }
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('uav_sidebar_collapsed', String(next)); } catch {}
      return next;
    });
  };

  return (
    <div className="customer-shell">
      <a href="#content" className="skip-link">{t('common.skipToContent')}</a>
      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', marginBottom: 16 }}>
          <Link href="/dashboard" className="brand" title="UAV PAS · Customer Portal · VJU" style={{ padding: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/vju-logo.svg" alt="VJU Logo" width={34} height={34} style={{ width: 34, height: 34, objectFit: 'contain', flexShrink: 0 }} />
            {!collapsed && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <b style={{ lineHeight: 1.2, fontSize: 16, color: '#0f172a' }}>UAV PAS</b>
                <small style={{ fontSize: 11, color: '#64748b' }}>{t('nav.portalTitle')} · VJU</small>
              </div>
            )}
          </Link>
          <button
            type="button"
            className="collapse-toggle"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            title={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              border: '1px solid #dce5ef',
              borderRadius: 6,
              background: '#fff',
              color: '#64748b',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>
        <nav aria-label="Điều hướng khách hàng">
          {navItems
            .filter((item) => !item.permission || (permissionsReady && can(item.permission)))
            .map(({ href, key, defaultLabel, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              const labelText = t(`nav.${key}`) || defaultLabel;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  title={collapsed ? labelText : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? '10px 0' : '9px 12px',
                  }}
                >
                  <Icon size={18} style={{ flexShrink: 0 }} />
                  {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labelText}</span>}
                </Link>
              );
            })}
        </nav>
        <button
          className="logout"
          onClick={() => void logout()}
          title={collapsed ? t('common.logout') : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '10px 0' : '10px 12px',
          }}
        >
          <LogOut size={16} style={{ flexShrink: 0 }} />
          {!collapsed && <span>{t('common.logout')}</span>}
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
