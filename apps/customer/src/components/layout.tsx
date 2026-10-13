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

  const name = user?.fullName || user?.username || 'Khách hàng VJU';
  const roleLabel = user?.role?.replace('ROLE_', '') || 'CUSTOMER';
  const visibleNav = navItems.filter((item) => !item.permission || !permissionsReady || !user || can(item.permission));
  const activeNav = navItems.find(({ href }) => pathname === href || pathname.startsWith(`${href}/`));

  return (
    <div className="customer-shell">
      <a href="#content" className="skip-link">{t('common.skipToContent')}</a>
      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <div
          style={{
            display: 'flex',
            flexDirection: collapsed ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            gap: collapsed ? 8 : 0,
            marginBottom: 16,
          }}
        >
          <Link
            href="/dashboard"
            className="brand"
            title="UAV PAS · Customer Portal · VJU"
            style={{
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: '10px',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                width: 34,
                height: 34,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                background: '#fff',
                border: '1px solid #ffe4e6',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                padding: 2,
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              <img src="/vju-logo.svg" alt="VJU Logo" width={30} height={30} style={{ width: 30, height: 30, objectFit: 'contain' }} />
            </span>
            {!collapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                <b style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>UAV PAS</b>
                <small style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Customer · VJU</small>
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
              border: '1px solid #e5e7eb',
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

        {!collapsed && (
          <div style={{ padding: '0 8px 10px', color: '#7c7c7c', fontSize: 11, letterSpacing: '0.08em', fontWeight: 700 }}>
            KHÁCH HÀNG
          </div>
        )}

        <nav aria-label="Điều hướng khách hàng">
          {visibleNav.map(({ href, key, defaultLabel, icon: Icon }) => {
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
                  padding: collapsed ? '10px 0' : '8px 10px',
                }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labelText}</span>}
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', borderTop: '1px solid #e5e7eb', paddingTop: 14 }}>
          {!collapsed && (
            <p style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px 10px', fontSize: 11, color: '#7c7c7c', margin: 0 }}>
              UAV PAS <span>Đại học Việt Nhật</span>
            </p>
          )}
          <button
            className="logout"
            onClick={() => void logout()}
            title={collapsed ? t('common.logout') : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '10px 0' : '8px 10px',
            }}
          >
            <LogOut size={16} style={{ flexShrink: 0 }} />
            {!collapsed && <span>{t('common.logout')}</span>}
          </button>
        </div>
      </aside>
      <div className="customer-workspace">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: 13, color: '#6d7d91' }}>
            <span style={{ color: '#202020', fontWeight: 600 }}>UAV PAS</span>
            <span style={{ color: '#a4b1c0' }}>/</span>
            <span>Customer Portal</span>
            {activeNav && (
              <>
                <span style={{ color: '#a4b1c0' }}>/</span>
                <strong style={{ color: '#ab2523', fontWeight: 600 }}>
                  {t(`nav.${activeNav.key}`) || activeNav.defaultLabel}
                </strong>
              </>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <LanguageSwitcher />
            <Link
              href="/notifications"
              title="Thông báo"
              style={{
                display: 'inline-flex',
                width: 34,
                height: 34,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: '#fff',
                color: '#475569',
              }}
            >
              <Bell size={16} />
            </Link>
            <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  display: 'inline-flex',
                  width: 34,
                  height: 34,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  background: '#fdf2f2',
                  color: '#ab2523',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {name.slice(0, 1).toUpperCase()}
              </span>
              <div style={{ lineHeight: 1.25 }}>
                <strong style={{ display: 'block', fontSize: 13, color: '#0f172a' }}>{name}</strong>
                <small style={{ display: 'block', fontSize: 11, fontFamily: 'monospace', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {roleLabel}
                </small>
              </div>
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
