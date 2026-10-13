'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Activity, Boxes, FileKey2, LayoutDashboard, LogOut, MapPinned, Menu, PlaneTakeoff, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useI18n } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';
export function AppShell({ children, activeResource }: { children: React.ReactNode; activeResource?: string }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const nav = [
    { href: '/', label: t('console.nav.overview'), icon: LayoutDashboard },
    { href: '/missions', label: t('console.nav.missions'), icon: Activity },
    { href: '/operations?tab=uavs', label: t('console.nav.uavs'), icon: PlaneTakeoff, tab: 'uavs' },
    { href: '/operations?tab=stations', label: t('console.nav.stations'), icon: MapPinned, tab: 'stations' },
    { href: '/operations?tab=equipment', label: t('console.nav.equipment'), icon: Boxes, tab: 'equipment' },
    { href: '/operations?tab=media', label: t('console.nav.media'), icon: FileKey2, tab: 'media' },
    { href: '/operations?tab=audit', label: t('console.nav.audit'), icon: Activity, tab: 'audit' },
    { href: '/access-control', label: t('console.nav.access'), icon: ShieldCheck },
  ];
  const name = user?.fullName || user?.username || t('console.account');
  return <div className="app-shell"><a className="skip-link" href="#workspace">{t('console.skipToContent')}</a><aside className={cn('app-rail', open && 'app-rail-open')}>
    <Link href="/" className="app-brand" onClick={() => setOpen(false)}>
      <span className="app-brand-mark flex items-center justify-center bg-white p-0.5 rounded-xl border border-rose-100 shadow-sm overflow-hidden">
        <img src="/vju-logo.svg" alt="VJU Logo" width={34} height={34} className="w-[34px] h-[34px] object-contain" />
      </span>
      <span className="flex items-center gap-1.5"><strong className="whitespace-nowrap">UAV PAS</strong><span className="text-[10px] font-bold text-[#ab2523] bg-[#fdf2f2] px-1.5 py-0.5 rounded border border-[#fecaca] whitespace-nowrap">VJU OPS</span></span>
    </Link>
    <button type="button" className="rail-close icon-button" aria-label={t('console.closeNavigation')} onClick={() => setOpen(false)}><X size={18} /></button>
    <div className="app-rail-label">{t('console.operations').toUpperCase()}</div><nav aria-label={t('console.operations')}>{nav.map(({ href, label, icon: Icon, tab }) => {
      const active = tab ? pathname === '/operations' && activeResource === tab : href === '/' ? pathname === '/' : pathname.startsWith(href);
      return <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined} className={cn('app-nav-link', active && 'app-nav-link-active')}><Icon size={18} />{label}</Link>;
    })}</nav><div className="rail-footer"><Button variant="ghost" size="sm" onClick={() => void logout()} leftIcon={<LogOut size={16} />} className="w-full justify-start text-slate-700 hover:bg-[#fdf2f2] hover:text-[#ab2523] whitespace-nowrap font-semibold">{t('common.logout')}</Button></div>
  </aside>{open && <button className="nav-scrim" aria-label={t('console.closeNavigation')} onClick={() => setOpen(false)} />}
  <div className="workspace-content"><header className="app-topbar"><button className="mobile-menu icon-button" aria-label={t('console.openNavigation')} aria-expanded={open} onClick={() => setOpen(true)}><Menu size={20} /></button><div className="topbar-location"><span>UAV PAS</span><span>/</span>{t('console.workspace')}</div><div className="account-summary"><LanguageSwitcher variant="compact" /><span className="avatar-chip">{name.slice(0,1).toUpperCase()}</span><div className="flex items-center gap-1.5"><strong className="whitespace-nowrap">{name}</strong><span className="text-[10px] font-bold text-[#007f3e] bg-[#ecfdf5] px-1.5 py-0.5 rounded border border-[#a7f3d0] whitespace-nowrap">{user?.role?.replace('ROLE_', '') || 'VJU'}</span></div></div></header><main id="workspace" className="app-main" tabIndex={-1}>{children}</main></div></div>;
}
