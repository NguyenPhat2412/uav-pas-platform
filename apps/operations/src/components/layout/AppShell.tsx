'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Activity, Boxes, ClipboardList, FileKey2, LayoutDashboard, LogOut, MapPinned, Menu, PlaneTakeoff, Wrench, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';
import { displayLabel } from '@uav/ui/presentation';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/overview', label: 'Tổng quan', icon: LayoutDashboard, permission: 'DASHBOARD_READ' },
  { href: '/dispatch/missions', label: 'Điều phối nhiệm vụ', icon: Activity, permission: 'MISSION_VIEW_ALL' },
  { href: '/assigned-missions', label: 'Nhiệm vụ được giao', icon: ClipboardList, permission: 'MISSION_VIEW' },
  { href: '/stations', label: 'Trạm', icon: MapPinned, permission: 'STATION_READ' },
  { href: '/uavs', label: 'Đội UAV', icon: PlaneTakeoff, permission: 'UAV_READ' },
  { href: '/maintenance', label: 'Bảo trì và sửa chữa', icon: Wrench, permission: 'UAV_MANAGE' },
  { href: '/inventory', label: 'Kho thiết bị', icon: Boxes, permission: 'INVENTORY_READ' },
  { href: '/media', label: 'Tệp và tài liệu', icon: FileKey2, permission: 'MEDIA_READ' },
  { href: '/audit', label: 'Nhật ký hoạt động', icon: Activity, permission: 'AUDIT_READ' },
];

export function AppShell({ children, activeResource }: { children: React.ReactNode; activeResource?: string }) {
  const pathname = usePathname();
  const { user, logout, can, permissionsReady } = useAuth();
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
  const name = user?.fullName || user?.username || 'Tài khoản';
  const visibleNav = nav.filter(item => permissionsReady && can(item.permission));
  return <div className="app-shell"><a className="skip-link" href="#workspace">Bỏ qua tới nội dung</a><aside ref={rail} id="portal-navigation" className={cn('app-rail', open && 'app-rail-open')}>
    <Link href="/overview" className="app-brand" onClick={() => setOpen(false)}><span className="app-brand-mark"><PlaneTakeoff size={22} /></span><span><strong>UAV PAS</strong><small>Vận hành</small></span></Link>
    <button type="button" className="rail-close icon-button" aria-label="Đóng điều hướng" onClick={() => { setOpen(false); menuButton.current?.focus(); }}><X size={18} /></button>
    <div className="app-rail-label">VẬN HÀNH</div><nav aria-label="Điều hướng vận hành">{visibleNav.map(({ href, label, icon: Icon }) => {
      const active = activeResource ? (href.slice(1) === activeResource || href.slice(1).startsWith(`${activeResource}/`)) : pathname === href || pathname.startsWith(`${href}/`);
      return <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined} className={cn('app-nav-link', active && 'app-nav-link-active')}><Icon size={18} />{label}</Link>;
    })}</nav>
    <div className="rail-footer"><p>UAV PAS <span>Vận hành</span></p><Button variant="ghost" size="sm" onClick={() => void logout()} leftIcon={<LogOut size={16} />} className="w-full justify-start text-slate-500 hover:bg-slate-100 hover:text-slate-900">Đăng xuất</Button></div>
  </aside>{open && <button className="nav-scrim" aria-label="Đóng điều hướng" onClick={() => { setOpen(false); menuButton.current?.focus(); }} />}
  <div className="workspace-content" inert={open}><header className="app-topbar"><button ref={menuButton} aria-controls="portal-navigation" className="mobile-menu icon-button" aria-label="Mở điều hướng" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={20} /></button><div className="topbar-location"><span>UAV PAS</span><span>/</span>Vận hành</div><div className="account-summary"><span className="avatar-chip">{name.slice(0, 1).toUpperCase()}</span><div><strong>{name}</strong><small>{displayLabel(user?.role)}</small></div></div></header><main id="workspace" className="app-main" tabIndex={-1}>{children}</main></div></div>;
}
