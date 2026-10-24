'use client';

import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {ChevronDown, CreditCard, LogOut, UserRound} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {Avatar} from '@/components/shared/Avatar';
import {cn} from '@/lib/utils';

/** Top-bar account button; its menu holds the account page, billing and sign-out. */
export function CustomerAccountMenu({name}: { name: string }) {
    const {user, logout} = useAuth();
    const {t} = useI18n();
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;
        const items = () => [...(root.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])];
        items()[0]?.focus();
        const outside = (event: PointerEvent) => {
            if (!root.current?.contains(event.target as Node)) setOpen(false);
        };
        const keydown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
                trigger.current?.focus();
                return;
            }
            if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
            event.preventDefault();
            const list = items();
            const index = list.indexOf(document.activeElement as HTMLElement);
            list[(index + (event.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length]?.focus();
        };
        document.addEventListener('pointerdown', outside);
        document.addEventListener('keydown', keydown);
        return () => {
            document.removeEventListener('pointerdown', outside);
            document.removeEventListener('keydown', keydown);
        };
    }, [open]);

    const close = () => setOpen(false);
    const itemClass = 'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors';
    return (
        <div ref={root} className="relative">
            <button
                ref={trigger}
                type="button"
                className={cn(
                    'flex items-center gap-2 rounded-xl border border-border bg-slate-50/70 px-2 py-1.5 text-left transition-colors hover:bg-slate-100 cursor-pointer',
                    open && 'border-primary/40 bg-slate-100'
                )}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls="customer-account-menu"
                aria-label={t('account.open', {name})}
                onClick={() => setOpen(value => !value)}
            >
                <Avatar name={name} avatarUrl={user?.avatarUrl}/>
                <strong className="hidden max-w-[150px] truncate text-sm font-semibold text-slate-800 sm:block">{name}</strong>
                <ChevronDown size={15} className={cn('text-slate-400 transition-transform', open && 'rotate-180')} aria-hidden="true"/>
            </button>
            {open && (
                <div id="customer-account-menu" role="menu" aria-label={t('account.menu')}
                     className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-border bg-card p-2 shadow-xl">
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
                    <hr className="my-1.5 border-slate-100"/>
                    <button type="button" role="menuitem"
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-danger transition-colors hover:bg-red-50 cursor-pointer"
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
