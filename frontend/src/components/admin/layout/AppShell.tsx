'use client';

import Link from 'next/link';
import { activeDestination } from "@/components/shared/navigation";
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BarChart3, ChevronLeft, ChevronRight, CreditCard, FileKey2, KeyRound, LayoutDashboard, LogOut, Menu, Radio, Settings, ShieldCheck, Users, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Button } from "@/components/admin/ui";
import { displayLabel } from "@/components/shared/presentation";
import { cn } from '@/lib/utils';

const nav = [
  { href: "/admin/dashboard", label: 'Tổng quan', icon: LayoutDashboard, permission: 'DASHBOARD_READ' },
  { href: "/admin/users", label: 'Người dùng', icon: Users, permission: 'USER_READ' },
  { href: "/admin/access-control", label: 'Kiểm soát truy cập', icon: ShieldCheck, permission: 'PERMISSION_MANAGE' },
  { href: "/admin/role-templates", label: 'Mẫu vai trò', icon: KeyRound, permission: 'PERMISSION_MANAGE' },
  { href: "/admin/permissions", label: 'Danh mục quyền', icon: FileKey2, permission: 'PERMISSION_MANAGE' },
  { href: "/admin/billing", label: 'Gói cước & Hạn mức', icon: CreditCard, permission: 'PERMISSION_MANAGE' },
  { href: "/admin/reports", label: 'Báo cáo & Thống kê', icon: BarChart3, permission: 'DASHBOARD_READ' },
  { href: "/admin/webhooks", label: 'Webhooks & Tích hợp', icon: Radio, permission: 'USER_MANAGE' },
  { href: "/admin/settings", label: 'Cấu hình hệ thống', icon: Settings, permission: 'PERMISSION_MANAGE' },
  { href: "/admin/audit-logs", label: 'Nhật ký quản trị', icon: FileKey2, permission: 'AUDIT_READ' },
];

export function AppShell({ children, activeResource }: { children: React.ReactNode; activeResource?: string }) {
  const pathname = usePathname();
  const { user, logout, can, permissionsReady } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
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

  const name = user?.fullName || user?.username || 'Quản trị viên VJU';
  const roleLabel = displayLabel(user?.role);
  const visibleNav = nav.filter(item => !item.permission || (permissionsReady && can(item.permission)));
  const activeNav = activeDestination(visibleNav, pathname, activeResource);
  const railCollapsed = collapsed && !open;
  return <div className="app-shell"><a className="skip-link" href="#workspace">Bỏ qua tới nội dung</a><aside ref={rail} id="portal-navigation" className={cn('app-rail', open && 'app-rail-open', railCollapsed && 'app-rail-collapsed')}>
    <div className={cn("app-rail-top flex items-center mb-4", railCollapsed ? "flex-col justify-center gap-2" : "justify-between")}>
      <Link href="/admin/dashboard" className={cn('app-brand !p-0 !gap-2.5', railCollapsed && 'app-brand-collapsed !justify-center')} onClick={() => setOpen(false)} title="UAV PAS · Quản trị · VJU">
        <span className="app-brand-mark flex items-center justify-center bg-white p-0.5 rounded-xl border border-rose-100 shadow-sm overflow-hidden flex-shrink-0">
          <img src="/vju-logo.svg" alt="Đại học Việt Nhật" width={32} height={32} className="w-[32px] h-[32px] object-contain" />
        </span>
        {!railCollapsed && <span className="brand-text flex flex-col leading-tight"><strong className="text-[15px] font-bold text-slate-800">UAV PAS</strong><small className="text-[11px] text-slate-500 font-medium">Quản trị · VJU</small></span>}
      </Link>
      <button
        type="button"
        className="collapse-toggle hidden lg:inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        onClick={toggleCollapsed}
        aria-label={railCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
        title={railCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
      >
        {railCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>
    </div>
    <button type="button" className="rail-close icon-button" aria-label="Đóng điều hướng" onClick={() => setOpen(false)}><X size={18} /></button>
    {!railCollapsed && <div className="app-rail-label">QUẢN TRỊ</div>}
    <nav aria-label="Điều hướng quản trị">{visibleNav.map(({ href, label, icon: Icon }) => {
      const active = href === activeNav?.href;
      return <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined} aria-label={label} title={railCollapsed ? label : undefined} className={cn('app-nav-link', active && 'app-nav-link-active', railCollapsed && '!justify-center !px-0')}><Icon size={18} className="flex-shrink-0" />{!railCollapsed && <span className="truncate">{label}</span>}</Link>;
    })}</nav>
    <div className="rail-footer">
      {!railCollapsed && <p>UAV PAS <span>Đại học Việt Nhật</span></p>}
      <Button variant="ghost" size="sm" onClick={() => void logout()} leftIcon={railCollapsed ? undefined : <LogOut size={16} />} aria-label={t('common.logout')} title={railCollapsed ? t('common.logout') : undefined} className={cn("w-full text-slate-500 hover:bg-slate-100 hover:text-slate-900", railCollapsed ? "justify-center !px-0" : "justify-start")}>
        {railCollapsed ? <LogOut size={16} /> : t('common.logout')}
      </Button>
    </div>
  </aside>{open && <button className="nav-scrim" aria-label="Đóng điều hướng" onClick={() => setOpen(false)} />}
  <div className="workspace-content" inert={open}><header className="app-topbar"><button ref={menuButton} aria-controls="portal-navigation" className="mobile-menu icon-button" aria-label="Mở điều hướng" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={20} /></button><div className="topbar-location"><span>UAV PAS</span><span>/</span><span>Quản trị</span>{activeNav && <><span>/</span><strong className="text-[#ab2523] font-semibold">{activeNav.label}</strong></>}</div><div className="account-summary"><LanguageSwitcher variant="compact" /><span className="avatar-chip">{name.slice(0, 1).toUpperCase()}</span><div className="leading-tight"><strong>{name}</strong><small className="text-[11px] font-mono uppercase tracking-wider text-slate-500">{roleLabel}</small></div></div></header><main id="workspace" className="app-main" tabIndex={-1}>{children}</main></div></div>;
}
