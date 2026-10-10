'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Activity, Boxes, ClipboardList, FileKey2, LayoutDashboard, LogOut, MapPinned, Menu, PlaneTakeoff, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useI18n } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/overview', label: 'Tổng quan', icon: LayoutDashboard, permission: 'DASHBOARD_READ' },
  { href: '/dispatch/missions', label: 'Điều phối mission', icon: Activity, permission: 'MISSION_VIEW_ALL' },
  { href: '/assigned-missions', label: 'Mission được giao', icon: ClipboardList, permission: 'MISSION_VIEW' },
  { href: '/stations', label: 'Trạm', icon: MapPinned, permission: 'STATION_READ' },
  { href: '/uavs', label: 'Đội UAV', icon: PlaneTakeoff, permission: 'UAV_READ' },
  { href: '/inventory', label: 'Kho thiết bị', icon: Boxes, permission: 'INVENTORY_READ' },
  { href: '/media', label: 'Media', icon: FileKey2, permission: 'MEDIA_READ' },
  { href: '/audit', label: 'Audit', icon: Activity, permission: 'AUDIT_READ' },
];

export function AppShell({ children, activeResource }: { children: React.ReactNode; activeResource?: string }) {
  const pathname = usePathname();
  const { user, logout, can, permissionsReady } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const name = user?.fullName || user?.username || 'Tài khoản';
  const visibleNav = nav.filter(item => !permissionsReady || can(item.permission));
  return <div className="app-shell"><a className="skip-link" href="#workspace">Bỏ qua tới nội dung</a><aside className={cn('app-rail', open && 'app-rail-open')}>
    <Link href="/overview" className="app-brand" onClick={() => setOpen(false)}><span className="app-brand-mark"><PlaneTakeoff size={22} /></span><span><strong>UAV PAS</strong><small>Operations</small></span></Link>
    <button type="button" className="rail-close icon-button" aria-label="Đóng điều hướng" onClick={() => setOpen(false)}><X size={18} /></button>
    <div className="app-rail-label">VẬN HÀNH</div><nav aria-label="Điều hướng vận hành">{visibleNav.map(({ href, label, icon: Icon }) => {
      const active = activeResource ? (href.slice(1) === activeResource) : pathname === href || pathname.startsWith(`${href}/`);
      return <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined} className={cn('app-nav-link', active && 'app-nav-link-active')}><Icon size={18} />{label}</Link>;
    })}</nav>
    <div className="rail-footer"><p>UAV PAS <span>Operations</span></p><Button variant="ghost" size="sm" onClick={() => void logout()} leftIcon={<LogOut size={16} />} className="w-full justify-start text-slate-300 hover:bg-white/10 hover:text-white">{t('common.logout')}</Button></div>
  </aside>{open && <button className="nav-scrim" aria-label="Đóng điều hướng" onClick={() => setOpen(false)} />}
  <div className="workspace-content"><header className="app-topbar"><button className="mobile-menu icon-button" aria-label="Mở điều hướng" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={20} /></button><div className="topbar-location"><span>UAV PAS</span><span>/</span>Operations</div><div className="account-summary"><LanguageSwitcher variant="compact" /><span className="avatar-chip">{name.slice(0, 1).toUpperCase()}</span><div><strong>{name}</strong><small>{user?.role?.replace('ROLE_', '')}</small></div></div></header><main id="workspace" className="app-main" tabIndex={-1}>{children}</main></div></div>;
}
