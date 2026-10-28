'use client';

import Link from 'next/link';
import {Briefcase, ChevronDown, LogOut, Radar, Settings, ShieldCheck, UserRound} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {displayLabel} from '@/components/shared/presentation';
import {canUsePortal} from '@/features/auth/utils/portal';
import {useDropdownMenu} from '@/hooks/useDropdownMenu';
import {cn} from '@/lib/utils';

/**
 * Top-bar account button shared by the admin and operations shells; everything account-related lives in its
 * menu so the sidebar holds navigation only.
 */
export function AccountMenu({portal}: { portal: 'admin' | 'operations' }) {
    const {user, logout, can} = useAuth();
    const {t} = useI18n();
    const {open, setOpen, close, root, trigger} = useDropdownMenu();
    const name = user?.fullName || user?.username || t('shell.dutyOfficer');
    const initial = name.slice(0, 1).toUpperCase();
    return (
        <div ref={root} className="relative">
            <button
                ref={trigger}
                type="button"
                className={cn(
                    'flex items-center gap-2.5 rounded-control border border-border bg-card px-2.5 py-1.5 text-left transition-colors hover:bg-slate-50 cursor-pointer',
                    open && 'border-primary/40 bg-slate-50'
                )}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls="account-menu"
                aria-label={t('admin.account.open', {name})}
                onClick={() => setOpen(value => !value)}
            >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shrink-0" aria-hidden="true">
                    {initial}
                </span>
                <span className="hidden max-w-36 xl:flex flex-col leading-tight min-w-0">
                    <strong className="truncate text-xs font-bold text-slate-900">{name}</strong>
                    <small className="truncate text-[11px] font-medium text-slate-500">{displayLabel(user?.role)}</small>
                </span>
                <ChevronDown size={15} className="text-slate-400" aria-hidden="true"/>
            </button>
            {open && (
                <div
                    id="account-menu"
                    className="absolute right-0 mt-2 w-64 rounded-overlay border border-border bg-card p-2 shadow-xl z-50"
                    role="menu"
                    aria-label={t('admin.account.menu')}
                >
                    <div className="flex items-start gap-3 border-b border-slate-100 px-3 py-2.5 mb-1">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shrink-0" aria-hidden="true">
                            {initial}
                        </span>
                        <div className="min-w-0 flex-1">
                            <strong className="block truncate text-sm font-bold text-slate-900">{name}</strong>
                            <small className="block truncate text-xs text-slate-500">{user?.email}</small>
                            <span className="mt-1 inline-block rounded-badge bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                                {displayLabel(user?.role)}
                            </span>
                        </div>
                    </div>
                    {user && portal === 'admin' && (
                        <Link
                            role="menuitem"
                            href="/admin/profile"
                            onClick={close}
                            className="flex items-center gap-2.5 rounded-control px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        >
                            <UserRound size={16} aria-hidden="true"/>
                            {t('admin.account.myAccount')}
                        </Link>
                    )}
                    {portal === 'admin' && canUsePortal(user?.role, 'operations') && (
                        <Link
                            role="menuitem"
                            href="/operations/overview"
                            onClick={close}
                            className="flex items-center gap-2.5 rounded-control px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        >
                            <Radar size={16} aria-hidden="true"/>
                            {t('admin.account.operations')}
                        </Link>
                    )}
                    {portal === 'operations' && canUsePortal(user?.role, 'admin') && (
                        <Link
                            role="menuitem"
                            href="/admin/dashboard"
                            onClick={close}
                            className="flex items-center gap-2.5 rounded-control px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        >
                            <ShieldCheck size={16} aria-hidden="true"/>
                            {t('admin.account.admin')}
                        </Link>
                    )}
                    {canUsePortal(user?.role, 'customer') && (
                        <Link
                            role="menuitem"
                            href="/customer/dashboard"
                            onClick={close}
                            className="flex items-center gap-2.5 rounded-control px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        >
                            <Briefcase size={16} aria-hidden="true"/>
                            Cổng Khách hàng
                        </Link>
                    )}
                    {portal === 'admin' && can('PERMISSION_MANAGE') && (
                        <Link
                            role="menuitem"
                            href="/admin/settings"
                            onClick={close}
                            className="flex items-center gap-2.5 rounded-control px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        >
                            <Settings size={16} aria-hidden="true"/>
                            {t('admin.account.settings')}
                        </Link>
                    )}
                    <hr className="my-1.5 border-slate-100"/>
                    <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-sm font-semibold text-danger hover:bg-red-50 transition-colors cursor-pointer"
                        onClick={() => {
                            close();
                            void logout();
                        }}
                    >
                        <LogOut size={16} aria-hidden="true"/>
                        {t('common.logout')}
                    </button>
                </div>
            )}
        </div>
    );
}
