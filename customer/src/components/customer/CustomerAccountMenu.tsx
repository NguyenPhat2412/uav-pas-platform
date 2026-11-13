'use client';

import Link from 'next/link';
import {ChevronDown, CreditCard, LogOut, Radar, ShieldCheck, UserRound} from 'lucide-react';
import {Avatar} from '@/components/shared/Avatar';
import {Button, Card} from '@/components/ui';
import {useDropdownMenu} from '@/hooks/useDropdownMenu';
import {displayLabel} from '@/lib/presentation';
import {cn} from '@/lib/utils';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {canUsePortal} from '@/utils/auth/portal';
import {resolvePortalHref} from '@/utils/auth/auth-entry';

/** Top-bar account button; its menu holds the account page, billing and sign-out. */
export function CustomerAccountMenu({name}: { name: string }) {
    const {user, logout} = useAuth();
    const {t} = useI18n();
    const {open, setOpen, close, root, trigger} = useDropdownMenu();
    const itemClass = 'flex items-center gap-2.5 rounded-control px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors';

    return (
        <div ref={root} className="relative">
            <Button
                ref={trigger}
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                    'h-auto gap-2.5 border-border bg-card px-2.5 py-1.5 text-left font-normal hover:bg-slate-50',
                    open && 'border-primary/40 bg-slate-50',
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
            </Button>
            {open && (
                <Card
                    id="customer-account-menu"
                    role="menu"
                    aria-label={t('account.menu')}
                    className="absolute right-0 z-50 mt-2 w-64 overflow-visible rounded-overlay border-border p-2 shadow-xl"
                >
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
                        <a role="menuitem" href={resolvePortalHref('/operations/overview')} onClick={close} className={itemClass}>
                            <Radar size={16} aria-hidden="true"/>{t('shell.portalSwitcher.operationsPortal')}
                        </a>
                    )}
                    {canUsePortal(user?.role, 'admin') && (
                        <a role="menuitem" href={resolvePortalHref('/admin/dashboard')} onClick={close} className={itemClass}>
                            <ShieldCheck size={16} aria-hidden="true"/>{t('shell.portalSwitcher.adminPortal')}
                        </a>
                    )}
                    <hr className="my-1.5 border-slate-100"/>
                    <Button
                        type="button"
                        role="menuitem"
                        variant="ghost"
                        size="sm"
                        leftIcon={<LogOut size={14} aria-hidden="true"/>}
                        className="h-auto w-full justify-start gap-2 px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-red-50"
                        onClick={() => {
                            close();
                            void logout();
                        }}
                    >
                        {t('common.logout')}
                    </Button>
                </Card>
            )}
        </div>
    );
}
