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
    <Link href="/" className="app-brand" onClick={() => setOpen(false)}><span className="app-brand-mark"><PlaneTakeoff size={22} /></span><span><strong>UAV PAS</strong><small>{t('console.workspace')}</small></span></Link>
    <button type="button" className="rail-close icon-button" aria-label={t('console.closeNavigation')} onClick={() => setOpen(false)}><X size={18} /></button>
    <div className="app-rail-label">{t('console.operations').toUpperCase()}</div><nav aria-label={t('console.operations')}>{nav.map(({ href, label, icon: Icon, tab }) => {
      const active = tab ? pathname === '/operations' && activeResource === tab : href === '/' ? pathname === '/' : pathname.startsWith(href);
      return <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined} className={cn('app-nav-link', active && 'app-nav-link-active')}><Icon size={18} />{label}</Link>;
    })}</nav><div className="rail-footer"><p>UAV PAS <span>{t('console.workspace')}</span></p><Button variant="ghost" size="sm" onClick={() => void logout()} leftIcon={<LogOut size={16} />} className="w-full justify-start text-slate-300 hover:bg-white/10 hover:text-white">{t('common.logout')}</Button></div>
  </aside>{open && <button className="nav-scrim" aria-label={t('console.closeNavigation')} onClick={() => setOpen(false)} />}
  <div className="workspace-content"><header className="app-topbar"><button className="mobile-menu icon-button" aria-label={t('console.openNavigation')} aria-expanded={open} onClick={() => setOpen(true)}><Menu size={20} /></button><div className="topbar-location"><span>UAV PAS</span><span>/</span>{t('console.workspace')}</div><div className="account-summary"><LanguageSwitcher variant="compact" /><span className="avatar-chip">{name.slice(0,1).toUpperCase()}</span><div><strong>{name}</strong><small>{user?.role?.replace('ROLE_', '')}</small></div></div></header><main id="workspace" className="app-main" tabIndex={-1}>{children}</main></div></div>;
}
