'use client';

import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {AlertTriangle, Bell, ChevronRight, CircleAlert, Info} from 'lucide-react';
import {useI18n} from '@/contexts/I18nContext';
import {useAdminAnalytics} from '@/lib/query/admin';
import type {AdminAlert} from '@/types/admin';
import {cn} from '@/lib/utils';

const alertIcon = {danger: CircleAlert, warning: AlertTriangle, info: Info};
// Flat rows: severity is carried by the left stripe and icon colour, not by a filled card.
const alertStyles = {
    danger: {stripe: 'border-l-red-600', icon: 'text-red-600'},
    warning: {stripe: 'border-l-amber-500', icon: 'text-amber-600'},
    info: {stripe: 'border-l-blue-600', icon: 'text-blue-600'},
};

/** Bell in the admin top bar; operational alerts open in a popover instead of taking space on the dashboard. */
export function AdminAlertsPopover() {
    const {t} = useI18n();
    const alerts = useAdminAnalytics(30).data?.alerts ?? [];
    const urgent = alerts.some(alert => alert.level === 'danger');
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const label = alerts.length ? t('admin.analytics.alertsCount', {count: alerts.length}) : t('admin.analytics.alertsNone');

    useEffect(() => {
        if (!open) return;
        const outside = (event: PointerEvent) => {
            if (!root.current?.contains(event.target as Node)) setOpen(false);
        };
        const keydown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            setOpen(false);
            trigger.current?.focus();
        };
        document.addEventListener('pointerdown', outside);
        document.addEventListener('keydown', keydown);
        return () => {
            document.removeEventListener('pointerdown', outside);
            document.removeEventListener('keydown', keydown);
        };
    }, [open]);

    // Backend messages are Vietnamese; prefer the localized catalog entry for known alert codes.
    const message = (alert: AdminAlert) => {
        const key = `admin.analytics.alertCodes.${alert.code}`;
        const text = t(key, {count: alert.count});
        return text === key ? alert.message : text;
    };
    const close = () => setOpen(false);

    return (
        <div ref={root} className="relative">
            <button
                ref={trigger}
                type="button"
                className={cn(
                    'relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-control border transition-colors',
                    urgent
                        ? 'border-red-200 bg-red-50 text-danger hover:bg-red-100'
                        : alerts.length > 0
                            ? 'border-amber-200 bg-amber-50 text-warning hover:bg-amber-100'
                            : 'border-border bg-card text-slate-600 hover:bg-slate-100'
                )}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-controls="admin-alerts-popover"
                aria-label={label}
                title={label}
                onClick={() => setOpen(value => !value)}
            >
                <Bell size={17} aria-hidden="true"/>
                {alerts.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                        {alerts.length}
                    </span>
                )}
            </button>
            {open && (
                <div
                    id="admin-alerts-popover"
                    role="dialog"
                    aria-labelledby="admin-alerts-title"
                    className="absolute right-0 z-50 mt-2 w-[min(380px,calc(100vw-32px))] overflow-hidden rounded-overlay border border-border bg-card shadow-xl"
                >
                    <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                        <h2 id="admin-alerts-title" className="text-sm font-bold text-slate-900">{t('admin.analytics.alertsTitle')}</h2>
                        <span className={cn('text-xs font-semibold', alerts.length ? 'text-amber-700' : 'text-uav-blue')}>{label}</span>
                    </header>
                    {alerts.length ? (
                        <ul className="m-0 max-h-[60vh] list-none divide-y divide-slate-100 overflow-y-auto p-0">
                            {alerts.map(alert => {
                                const Icon = alertIcon[alert.level] ?? Info;
                                return (
                                    <li key={alert.code} className={cn('flex items-start gap-3 border-l-[3px] px-4 py-3 text-[13px] text-slate-800 hover:bg-slate-50', (alertStyles[alert.level] ?? alertStyles.info).stripe)}>
                                        <Icon size={16} className={cn('mt-0.5 shrink-0', (alertStyles[alert.level] ?? alertStyles.info).icon)} aria-hidden="true"/>
                                        <span className="flex-1">{message(alert)}</span>
                                        <Link href={alert.href} onClick={close}
                                              className="inline-flex items-center gap-0.5 whitespace-nowrap text-xs font-semibold text-primary hover:underline">
                                            {t('admin.analytics.resolve')}<ChevronRight size={13} aria-hidden="true"/>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="m-0 px-4 py-6 text-center text-[13px] text-slate-500">{t('admin.analytics.alertsEmpty')}</p>
                    )}
                    <footer className="border-t border-slate-100 px-4 py-2.5">
                        <Link href="/admin/notifications" onClick={close} className="text-xs font-semibold text-primary hover:underline">
                            {t('admin.analytics.allNotifications')}
                        </Link>
                    </footer>
                </div>
            )}
        </div>
    );
}
