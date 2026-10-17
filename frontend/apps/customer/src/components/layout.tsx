'use client';
import Link from 'next/link';
import { activeDestination } from '@uav/ui/navigation';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, Bell, Boxes, ChevronLeft, ChevronRight, CreditCard, LayoutDashboard, LogOut, Menu, X, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useCustomerProfile } from '@/features/customer/profile-query';
import { Button } from './ui';

const navItems = [
  { href: '/dashboard', key: 'dashboard', defaultLabel: 'Tổng quan', icon: LayoutDashboard, permission: 'MISSION_VIEW' },
  { href: '/services', key: 'services', defaultLabel: 'Dịch vụ UAV', icon: Boxes, permission: 'MISSION_VIEW' },
  { href: '/missions', key: 'missions', defaultLabel: 'Nhiệm vụ của tôi', icon: Activity, permission: 'MISSION_VIEW' },
  { href: '/billing', key: 'billing', defaultLabel: 'Gói cước & Hóa đơn', icon: CreditCard },
  { href: '/notifications', key: 'notifications', defaultLabel: 'Thông báo', icon: Bell },
  { href: '/profile', key: 'profile', defaultLabel: 'Tài khoản', icon: User },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, can, permissionsReady } = useAuth();
  const { t } = useI18n();
  const profile = useCustomerProfile();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const rail = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const trigger = menuButton.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    rail.current?.querySelector<HTMLButtonElement>('.rail-close')?.focus();
    const close = () => { setOpen(false); menuButton.current?.focus(); };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key !== 'Tab') return;
      const items = [...(rail.current?.querySelectorAll<HTMLElement>('a,button:not(:disabled)') ?? [])].filter(el => el.getClientRects().length);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const desktop = window.matchMedia('(min-width: 901px)');
    const resize = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener('change', resize);
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = previousOverflow; requestAnimationFrame(() => trigger?.focus()); document.removeEventListener('keydown', keydown); desktop.removeEventListener('change', resize); };
  }, [open]);

  useEffect(() => { try { setCollapsed(localStorage.getItem('uav_sidebar_collapsed') === 'true' || new URLSearchParams(window.location.search).get('collapsed') === 'true'); } catch {} }, []);
  const toggleCollapsed = () => setCollapsed(previous => { const next = !previous; try { localStorage.setItem('uav_sidebar_collapsed', String(next)); } catch {} return next; });
  const name = (profile.data?.id === user?.id ? profile.data?.fullName : undefined) || user?.fullName || user?.username || 'Khách hàng';
  const visibleNav = navItems.filter(item => !item.permission || (permissionsReady && !!user && can(item.permission)));
  const activeNav = activeDestination(visibleNav, pathname);
  const railCollapsed = collapsed && !open;
  return <div className="customer-shell">
    <a href="#content" className="skip-link">{t('common.skipToContent')}</a>
    <aside ref={rail} id="customer-navigation" className={`sidebar ${railCollapsed ? 'sidebar-collapsed' : ''} ${open ? 'sidebar-open' : ''}`}>
      <div className="sidebar-heading">
        <Link href="/dashboard" className="brand" onClick={() => setOpen(false)} aria-label="UAV PAS · Cổng khách hàng">
          <img src="/vju-logo.svg" alt="Đại học Việt Nhật" width={34} height={34}/>
          {!railCollapsed && <span><b>UAV PAS</b><small>Khách hàng · VJU</small></span>}
        </Link>
        <button type="button" className="collapse-toggle icon-button" onClick={toggleCollapsed} aria-label={railCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}>{railCollapsed ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}</button>
      </div>
      <button type="button" className="rail-close icon-button" aria-label="Đóng điều hướng" onClick={() => setOpen(false)}><X size={18}/></button>
      {!railCollapsed && <div className="sidebar-section-label">KHÁCH HÀNG</div>}
      <nav aria-label="Điều hướng khách hàng">{visibleNav.map(({ href, key, defaultLabel, icon: Icon }) => {
        const label = t(`nav.${key}`) || defaultLabel;
        return <Link key={href} href={href} aria-current={href === activeNav?.href ? 'page' : undefined} aria-label={label} title={railCollapsed ? label : undefined} onClick={() => setOpen(false)}><Icon size={18}/>{!railCollapsed && <span>{label}</span>}</Link>;
      })}</nav>
      <div className="sidebar-footer"><button type="button" className="logout" onClick={() => void logout()} aria-label={t('common.logout')}><LogOut size={18}/>{!railCollapsed && <span>{t('common.logout')}</span>}</button></div>
    </aside>
    {open && <button className="customer-nav-scrim" aria-label="Đóng điều hướng" onClick={() => setOpen(false)}/>}
    <div className="customer-workspace" inert={open}>
      <header className="topbar">
        <button ref={menuButton} type="button" className="customer-menu icon-button" aria-label="Mở điều hướng" aria-controls="customer-navigation" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={20}/></button>
        <div className="topbar-breadcrumb"><span>UAV PAS / Khách hàng / </span><strong>{activeNav ? t(`nav.${activeNav.key}`) || activeNav.defaultLabel : 'Khách hàng'}</strong></div>
        <div className="topbar-account"><LanguageSwitcher/><Link href="/notifications" className="icon-button" aria-label="Thông báo"><Bell size={18}/></Link><Link href="/profile" className="account" aria-label={`Hồ sơ của ${name}`}><span className="customer-avatar">{name.slice(0,1).toUpperCase()}</span><div><strong>{name}</strong><small>Cổng khách hàng</small></div></Link></div>
      </header>
      <main id="content" className="customer-main" tabIndex={-1}>{children}</main>
    </div>
  </div>;
}

export function PageGuard({ children, permission = 'MISSION_VIEW' }: { children: React.ReactNode; permission?: string | null }) {
  const router = useRouter(); const { isAuthenticated, isLoading, permissionsReady, permissionError, refreshPermissions, can } = useAuth();
  useEffect(() => { if (!isLoading && !isAuthenticated) router.replace('/login'); }, [router, isLoading, isAuthenticated]);
  if (isLoading || !isAuthenticated) return <div className="center-state" role="status">Đang xác thực…</div>;
  return <AppShell>{permission && permissionError ? <div className="error" role="alert">Không thể kiểm tra quyền truy cập. <Button onClick={() => void refreshPermissions()}>Thử lại</Button></div>
    : permission && !permissionsReady ? <div role="status">Đang kiểm tra quyền…</div>
    : permission && !can(permission) ? <div className="notice" role="alert">Tài khoản chưa được cấp quyền cho chức năng này.</div> : children}</AppShell>;
}
