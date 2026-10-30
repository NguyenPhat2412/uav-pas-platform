'use client';

import Link from 'next/link';
import {AlertTriangle, Bell, ChevronRight, CircleAlert, Info} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';
import {useDropdownMenu} from '@/hooks/useDropdownMenu';
import {useAdminAnalytics} from '@/features/dashboard/hooks/useAdminDashboard';
import type {AdminAlert} from '@/types/admin';
import {cn} from '@/lib/utils';
import {useAlertCenter} from '@/features/alerts/hooks/useAlertCenter';
import {useAlertMessage} from '@/features/alerts/hooks/useAlertMessage';

const centerLevel = {CRITICAL: 'danger', WARNING: 'warning', INFO: 'info'} as const;

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
    const analyticsAlerts = useAdminAnalytics(30).data?.alerts ?? [];
    // Alert center (GET /api/v1/admin/alerts): top critical/warning items join the analytics alerts.
    const centerMessage = useAlertMessage();
    const center = useAlertCenter();
    const centerItems = (center.data?.items ?? []).filter(item => item.severity !== 'INFO').slice(0, 5);
    const alerts: (AdminAlert & { text?: string })[] = [
        ...centerItems.map(item => ({
            level: centerLevel[item.severity],
            code: `center:${item.id}`,
            message: centerMessage(item),
            text: centerMessage(item),
            href: item.href,
            count: 1,
        } as AdminAlert & { text?: string })),
        ...analyticsAlerts,
    ];
    const urgent = alerts.some(alert => alert.level === 'danger');
    const {open, setOpen, close, root, trigger} = useDropdownMenu({arrowNavigation: false});
    const label = alerts.length ? t('admin.analytics.alertsCount', {count: alerts.length}) : t('admin.analytics.alertsNone');

    // Backend messages are Vietnamese; prefer the localized catalog entry for known alert codes.
    const message = (alert: AdminAlert & { text?: string }) => {
        if (alert.text) return alert.text;
        const key = `admin.analytics.alertCodes.${alert.code}`;
        const text = t(key, {count: alert.count});
        return text === key ? alert.message : text;
    };

    return (
        <div ref={root} className="relative">
            <button
                ref={trigger}
                type="button"
                className={cn(
                    'relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-control border transition-colors',
                    'border-border bg-card text-slate-600 hover:bg-slate-100'
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
                    <span className={cn('absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white', urgent ? 'bg-danger' : 'bg-amber-500')}>
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
                    <footer className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5">
                        <Link href="/admin/alerts" onClick={close} className="text-xs font-semibold text-primary hover:underline">
                            {t('adminPlatform.alerts.viewAll')}
                        </Link>
                        <Link href="/admin/notifications" onClick={close} className="text-xs font-semibold text-primary hover:underline">
                            {t('admin.analytics.allNotifications')}
                        </Link>
                    </footer>
                </div>
            )}
        </div>
    );
}
