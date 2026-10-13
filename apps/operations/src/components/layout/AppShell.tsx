'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Activity, Bell, Boxes, ChevronLeft, ChevronRight, ClipboardList, Crosshair, FileKey2, LayoutDashboard, LogOut, MapPinned, Menu, PlaneTakeoff, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useI18n } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/overview', label: 'Tổng quan', icon: LayoutDashboard, permission: 'DASHBOARD_READ' },
  { href: '/sar-cockpit', label: 'Tác chiến AI & SAR', icon: Crosshair, permission: 'MISSION_VIEW' },
  { href: '/dispatch/missions', label: 'Điều phối mission', icon: Activity, permission: 'MISSION_VIEW_ALL' },
  { href: '/assigned-missions', label: 'Mission được giao', icon: ClipboardList, permission: 'MISSION_VIEW' },
  { href: '/stations', label: 'Trạm', icon: MapPinned, permission: 'STATION_READ' },
  { href: '/uavs', label: 'Đội UAV', icon: PlaneTakeoff, permission: 'UAV_READ' },
  { href: '/inventory', label: 'Kho thiết bị', icon: Boxes, permission: 'INVENTORY_READ' },
  { href: '/media', label: 'Media', icon: FileKey2, permission: 'MEDIA_READ' },
  { href: '/notifications', label: 'Thông báo', icon: Bell },
  { href: '/audit', label: 'Audit', icon: Activity, permission: 'AUDIT_READ' },
];

export function AppShell({ children, activeResource }: { children: React.ReactNode; activeResource?: string }) {
  const pathname = usePathname();
  const { user, logout, can, permissionsReady } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
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

  const name = user?.fullName || user?.username || 'Trực ban VJU';
  const roleLabel = user?.role?.replace('ROLE_', '') || 'OPERATOR';
  const visibleNav = nav.filter(item => !item.permission || !permissionsReady || can(item.permission));
  const activeNav = nav.find(({ href }) => activeResource ? (href.slice(1) === activeResource) : pathname === href || pathname.startsWith(`${href}/`));
  return <div className="app-shell"><a className="skip-link" href="#workspace">Bỏ qua tới nội dung</a><aside className={cn('app-rail', open && 'app-rail-open', collapsed && 'app-rail-collapsed')}>
    <div className={cn("app-rail-top flex items-center mb-4", collapsed ? "flex-col justify-center gap-2" : "justify-between")}>
      <Link href="/overview" className={cn('app-brand !p-0 !gap-2.5', collapsed && 'app-brand-collapsed !justify-center')} onClick={() => setOpen(false)} title="UAV PAS · Operations · VJU">
        <span className="app-brand-mark flex items-center justify-center bg-white p-0.5 rounded-xl border border-rose-100 shadow-sm overflow-hidden flex-shrink-0">
          <img src="/vju-logo.svg" alt="VJU Logo" width={32} height={32} className="w-[32px] h-[32px] object-contain" />
        </span>
        {!collapsed && <span className="brand-text flex flex-col leading-tight"><strong className="text-[15px] font-bold text-slate-800">UAV PAS</strong><small className="text-[11px] text-slate-500 font-medium">Operations · VJU</small></span>}
      </Link>
      <button
        type="button"
        className="collapse-toggle hidden lg:inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
        title={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
      >
        {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>
    </div>
    <button type="button" className="rail-close icon-button" aria-label="Đóng điều hướng" onClick={() => setOpen(false)}><X size={18} /></button>
    {!collapsed && <div className="app-rail-label">VẬN HÀNH</div>}
    <nav aria-label="Điều hướng vận hành">{visibleNav.map(({ href, label, icon: Icon }) => {
      const active = activeResource ? (href.slice(1) === activeResource) : pathname === href || pathname.startsWith(`${href}/`);
      return <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined} title={collapsed ? label : undefined} className={cn('app-nav-link', active && 'app-nav-link-active', collapsed && '!justify-center !px-0')}><Icon size={18} className="flex-shrink-0" />{!collapsed && <span className="truncate">{label}</span>}</Link>;
    })}</nav>
    <div className="rail-footer">
      {!collapsed && <p>UAV PAS <span>Đại học Việt Nhật</span></p>}
      <Button variant="ghost" size="sm" onClick={() => void logout()} leftIcon={collapsed ? undefined : <LogOut size={16} />} title={collapsed ? t('common.logout') : undefined} className={cn("w-full text-slate-500 hover:bg-slate-100 hover:text-slate-900", collapsed ? "justify-center !px-0" : "justify-start")}>
        {collapsed ? <LogOut size={16} /> : t('common.logout')}
      </Button>
    </div>
  </aside>{open && <button className="nav-scrim" aria-label="Đóng điều hướng" onClick={() => setOpen(false)} />}
  <div className="workspace-content"><header className="app-topbar"><button className="mobile-menu icon-button" aria-label="Mở điều hướng" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={20} /></button><div className="topbar-location"><span>UAV PAS</span><span>/</span><span>Operations</span>{activeNav && <><span>/</span><strong className="text-[#ab2523] font-semibold">{activeNav.label}</strong></>}</div><div className="account-summary"><LanguageSwitcher variant="compact" /><NotificationBell /><span className="avatar-chip">{name.slice(0, 1).toUpperCase()}</span><div className="leading-tight"><strong>{name}</strong><small className="text-[11px] font-mono uppercase tracking-wider text-slate-500">{roleLabel}</small></div></div></header><main id="workspace" className="app-main" tabIndex={-1}>{children}</main></div></div>;
}
