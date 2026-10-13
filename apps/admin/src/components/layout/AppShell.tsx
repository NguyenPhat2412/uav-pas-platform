'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { BarChart3, CreditCard, FileKey2, KeyRound, LayoutDashboard, LogOut, Menu, PlaneTakeoff, Radio, Settings, ShieldCheck, Users, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useI18n } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard, permission: 'DASHBOARD_READ' },
  { href: '/users', label: 'Người dùng', icon: Users, permission: 'USER_READ' },
  { href: '/access-control', label: 'Kiểm soát truy cập', icon: ShieldCheck, permission: 'PERMISSION_MANAGE' },
  { href: '/role-templates', label: 'Mẫu vai trò', icon: KeyRound, permission: 'PERMISSION_MANAGE' },
  { href: '/permissions', label: 'Danh mục quyền', icon: FileKey2, permission: 'PERMISSION_MANAGE' },
  { href: '/billing', label: 'Gói cước & Hạn mức', icon: CreditCard, permission: 'PERMISSION_MANAGE' },
  { href: '/reports', label: 'Báo cáo & Thống kê', icon: BarChart3, permission: 'DASHBOARD_READ' },
  { href: '/webhooks', label: 'Webhooks & Tích hợp', icon: Radio, permission: 'PERMISSION_MANAGE' },
  { href: '/settings', label: 'Cấu hình hệ thống', icon: Settings, permission: 'PERMISSION_MANAGE' },
  { href: '/audit-logs', label: 'Nhật ký quản trị', icon: FileKey2, permission: 'AUDIT_READ' },
];

export function AppShell({ children, activeResource }: { children: React.ReactNode; activeResource?: string }) {
  const pathname = usePathname();
  const { user, logout, can, permissionsReady } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const name = user?.fullName || user?.username || 'Tài khoản';
  const visibleNav = nav.filter(item => !item.permission || !permissionsReady || can(item.permission));
  return <div className="app-shell"><a className="skip-link" href="#workspace">Bỏ qua tới nội dung</a><aside className={cn('app-rail', open && 'app-rail-open')}>
    <Link href="/dashboard" className="app-brand" onClick={() => setOpen(false)}><span className="app-brand-mark"><PlaneTakeoff size={22} /></span><span><strong>UAV PAS</strong><small>Administration</small></span></Link>
    <button type="button" className="rail-close icon-button" aria-label="Đóng điều hướng" onClick={() => setOpen(false)}><X size={18} /></button>
    <div className="app-rail-label">QUẢN TRỊ</div><nav aria-label="Điều hướng quản trị">{visibleNav.map(({ href, label, icon: Icon }) => {
      const active = activeResource ? (href.slice(1) === activeResource) : pathname === href || pathname.startsWith(`${href}/`);
      return <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined} className={cn('app-nav-link', active && 'app-nav-link-active')}><Icon size={18} />{label}</Link>;
    })}</nav>
    <div className="rail-footer"><p>UAV PAS <span>Admin</span></p><Button variant="ghost" size="sm" onClick={() => void logout()} leftIcon={<LogOut size={16} />} className="w-full justify-start text-slate-500 hover:bg-slate-100 hover:text-slate-900">{t('common.logout')}</Button></div>
  </aside>{open && <button className="nav-scrim" aria-label="Đóng điều hướng" onClick={() => setOpen(false)} />}
  <div className="workspace-content"><header className="app-topbar"><button className="mobile-menu icon-button" aria-label="Mở điều hướng" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={20} /></button><div className="topbar-location"><span>UAV PAS</span><span>/</span>Administration</div><div className="account-summary"><LanguageSwitcher variant="compact" /><span className="avatar-chip">{name.slice(0, 1).toUpperCase()}</span><div><strong>{name}</strong><small>{user?.role?.replace('ROLE_', '')}</small></div></div></header><main id="workspace" className="app-main" tabIndex={-1}>{children}</main></div></div>;
}
