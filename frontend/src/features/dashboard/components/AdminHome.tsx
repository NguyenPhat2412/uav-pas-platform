'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import type {ReactNode} from 'react';
import {AlertTriangle, ChevronRight, CircleAlert, ClipboardList, History, Info} from 'lucide-react';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {HeaderSearch} from '@/components/layout/HeaderSearch';
import {ADMIN_SIDEBAR_ROUTES} from '@/components/layout/sidebar-routes';
import {ADMIN_RECENT_PAGES_KEY, readRecentPages} from '@/components/layout/recent-pages';
import {formatDate} from '@/components/shared/presentation';
import {useAdminPendingMissions} from '@/features/dashboard/hooks/useAdminDashboard';
import {useAlertCenter} from '@/features/alerts/hooks/useAlertCenter';
import {useAlertMessage} from '@/features/alerts/hooks/useAlertMessage';
import {cn} from '@/lib/utils';

const LIST_SIZE = 5;
const severityIcon = {
    CRITICAL: {icon: CircleAlert, tone: 'text-primary'},
    WARNING: {icon: AlertTriangle, tone: 'text-primary'},
    INFO: {icon: Info, tone: 'text-primary/75'},
} as const;

/**
 * Compact Red & White Admin Command Header + 3 live action cards
 * so KPIs and the Interactive Mission Map remain immediately visible above the fold.
 */
export function AdminHome() {
    const {can, permissionsReady} = useAuth();
    const {t} = useI18n();
    const alertMessage = useAlertMessage();
    const [recent, setRecent] = useState<string[]>([]);

    const allowed = useMemo(
        () => ADMIN_SIDEBAR_ROUTES.filter(item => !item.permission || (permissionsReady && can(item.permission))),
        [can, permissionsReady],
    );
    const labelOf = (item: (typeof ADMIN_SIDEBAR_ROUTES)[number]) => {
        const key = `adminNav.${item.key}`;
        const translated = t(key);
        return translated !== key ? translated : (item.defaultLabel || item.key);
    };
    const byHref = new Map(allowed.map(item => [item.href, item]));

    const pending = useAdminPendingMissions();
    const alerts = useAlertCenter();

    useEffect(() => {
        // Read after mount: the list lives in this browser's storage, which the server cannot see.
        setRecent(readRecentPages(ADMIN_RECENT_PAGES_KEY).filter(href => href !== '/admin/dashboard'));
    }, []);

    const toSearchItem = (item: (typeof ADMIN_SIDEBAR_ROUTES)[number]) => {
        const Icon = item.icon;
        return {href: item.href, label: labelOf(item), group: t(`adminNavGroups.${item.group}`), icon: <Icon size={16}/>};
    };
    const searchItems = allowed.map(toSearchItem);
    const recentItems = recent.map(href => byHref.get(href)).filter(item => item !== undefined).slice(0, LIST_SIZE);
    const urgent = (alerts.data?.critical ?? 0) + (alerts.data?.warning ?? 0);
    const alertItems = (alerts.data?.items ?? []).slice(0, LIST_SIZE);
    const missions = pending.data?.content ?? [];

    return <div className="space-y-4">
        <section className="flex flex-col gap-3 rounded-panel border border-rose-200 border-t-2 border-t-primary bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
                <h1 className="m-0 text-lg font-extrabold tracking-tight text-primary sm:text-xl">
                    {t('admin.dashboard.home.question')}
                </h1>
                {urgent > 0 && can('DASHBOARD_READ') && (
                    <Link
                        href="/admin/alerts"
                        className="inline-flex items-center gap-2 rounded-badge bg-primary px-3 py-1 text-xs font-bold text-white transition hover:opacity-90"
                    >
                        <span className="h-2 w-2 rounded-full bg-white animate-pulse" aria-hidden="true"/>
                        {t('admin.dashboard.home.attention', {count: urgent})}
                        <ChevronRight size={13} aria-hidden="true"/>
                    </Link>
                )}
            </div>
            <div className="w-full lg:max-w-md">
                <HeaderSearch
                    variant="hero"
                    items={searchItems}
                    recent={recentItems.map(toSearchItem)}
                    placeholder={t('admin.dashboard.home.searchPlaceholder')}
                />
            </div>
        </section>

        <div className="grid grid-cols-1 gap-px border border-rose-200 bg-rose-200 lg:grid-cols-3">
            {can('MISSION_VIEW_ALL') && <HomeColumn title={t('admin.dashboard.home.pending')} count={pending.data?.totalElements}
                                                    href="/operations/dispatch/missions"
                                                    empty={pending.isPending ? t('admin.dashboard.home.loading') : t('admin.dashboard.home.pendingEmpty')}>
                {missions.slice(0, LIST_SIZE).map(mission => <HomeRow key={mission.id} href={`/operations/missions/${mission.id}`}
                                                                       icon={<ClipboardList size={15} className="text-primary"/>}
                                                                       label={mission.title || mission.code} meta={formatDate(mission.startTime)}/>)}
            </HomeColumn>}
            {can('DASHBOARD_READ') && <HomeColumn title={t('admin.dashboard.home.alerts')} count={alerts.data ? urgent : undefined} href="/admin/alerts"
                                                  empty={alerts.isPending ? t('admin.dashboard.home.loading') : t('admin.dashboard.home.alertsEmpty')}>
                {alertItems.map(alert => {
                    const {icon: Icon, tone} = severityIcon[alert.severity];
                    return <HomeRow key={alert.id} href={alert.href || '/admin/alerts'} icon={<Icon size={15} className={tone}/>}
                                    label={alertMessage(alert)}/>;
                })}
            </HomeColumn>}
            <HomeColumn title={t('admin.dashboard.home.recent')} empty={t('admin.dashboard.home.recentEmpty')}>
                {recentItems.map(item => <HomeRow key={item.href} href={item.href} icon={<History size={15} className="text-primary"/>}
                                                  label={<><span className="text-primary/65">{t(`adminNavGroups.${item.group}`)} / </span>{labelOf(item)}</>}/>)}
            </HomeColumn>
        </div>
    </div>;
}

function HomeColumn({title, count, href, empty, children}: {
    title: string; count?: number; href?: string; empty: string; children: ReactNode[];
}) {
    const heading = <>
        <span>{title}</span>
        {count !== undefined && <span className="rounded-badge bg-primary px-2 py-0.5 text-[11px] font-bold text-white">{count}</span>}
        {href && <ChevronRight size={14} aria-hidden="true"/>}
    </>;
    return <section className="min-w-0 bg-white p-4">
        <h2 className="m-0 mb-2 border-b border-rose-100 pb-2 text-xs font-bold uppercase tracking-wider text-primary">
            {href ? <Link href={href} className="inline-flex items-center gap-2 hover:underline">{heading}</Link>
                : <span className="inline-flex items-center gap-2">{heading}</span>}
        </h2>
        {children.length ? <ul className="m-0 list-none divide-y divide-rose-100 p-0">{children}</ul>
            : <p className="m-0 py-3 text-xs text-primary/65">{empty}</p>}
    </section>;
}

function HomeRow({href, icon, label, meta}: { href: string; icon: ReactNode; label: ReactNode; meta?: string }) {
    return <li>
        <Link href={href} className={cn('group flex items-center gap-2.5 py-2 text-[13px] font-medium text-foreground transition-colors hover:text-primary')}>
            <span className="shrink-0" aria-hidden="true">{icon}</span>
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {meta && <span className="shrink-0 text-[11px] text-primary/65">{meta}</span>}
            <ChevronRight size={14} aria-hidden="true" className="shrink-0 text-rose-300 transition-colors group-hover:text-primary"/>
        </Link>
    </li>;
}
