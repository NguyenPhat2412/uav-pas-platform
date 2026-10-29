'use client';

import Link from 'next/link';
import {ChevronDown, CreditCard, LogOut, Radar, ShieldCheck, UserRound} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {Avatar} from '@/components/shared/Avatar';
import {displayLabel} from '@/components/shared/presentation';
import {canUsePortal} from '@/features/auth/utils/portal';
import {useDropdownMenu} from '@/hooks/useDropdownMenu';
import {cn} from '@/lib/utils';

/** Top-bar account button; its menu holds the account page, billing and sign-out. */
export function CustomerAccountMenu({name}: { name: string }) {
    const {user, logout} = useAuth();
    const {t} = useI18n();
    const {open, setOpen, close, root, trigger} = useDropdownMenu();
    const itemClass = 'flex items-center gap-2.5 rounded-control px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors';
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
                aria-controls="customer-account-menu"
                aria-label={t('account.open', {name})}
                onClick={() => setOpen(value => !value)}
            >
                <Avatar name={name} avatarUrl={user?.avatarUrl}/>
                <span className="hidden min-w-0 flex-col leading-tight sm:flex">
                    <strong className="max-w-[150px] truncate text-xs font-bold text-slate-900">{name}</strong>
                    <small className="truncate text-[11px] font-medium text-slate-500">{displayLabel(user?.role)}</small>
                </span>
                <ChevronDown size={15} className={cn('text-slate-400 transition-transform', open && 'rotate-180')} aria-hidden="true"/>
            </button>
            {open && (
                <div id="customer-account-menu" role="menu" aria-label={t('account.menu')}
                     className="absolute right-0 z-50 mt-2 w-64 rounded-overlay border border-border bg-card p-2 shadow-xl">
                    <div className="mb-1 flex items-center gap-3 border-b border-slate-100 px-3 py-2.5">
                        <Avatar name={name} avatarUrl={user?.avatarUrl} size={40}/>
                        <div className="min-w-0 flex-1">
                            <strong className="block truncate text-sm font-bold text-slate-900">{name}</strong>
                            <small className="block truncate text-xs text-slate-500">{user?.email}</small>
                        </div>
                    </div>
                    <Link role="menuitem" href="/customer/profile" onClick={close} className={itemClass}>
                        <UserRound size={16} aria-hidden="true"/>{t('account.profile')}
                    </Link>
                    <Link role="menuitem" href="/customer/billing" onClick={close} className={itemClass}>
                        <CreditCard size={16} aria-hidden="true"/>{t('account.billing')}
                    </Link>
                    {canUsePortal(user?.role, 'operations') && (
                        <Link role="menuitem" href="/operations/overview" onClick={close} className={itemClass}>
                            <Radar size={16} aria-hidden="true"/>{t('shell.portalSwitcher.operationsPortal')}
                        </Link>
                    )}
                    {canUsePortal(user?.role, 'admin') && (
                        <Link role="menuitem" href="/admin/dashboard" onClick={close} className={itemClass}>
                            <ShieldCheck size={16} aria-hidden="true"/>{t('shell.portalSwitcher.adminPortal')}
                        </Link>
                    )}
                    <hr className="my-1.5 border-slate-100"/>
                    <button type="button" role="menuitem"
                            className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-sm font-semibold text-danger transition-colors hover:bg-red-50 cursor-pointer"
                            onClick={() => {
                                close();
                                void logout();
                            }}>
                        <LogOut size={16} aria-hidden="true"/>{t('common.logout')}
                    </button>
                </div>
            )}
        </div>
    );
}
