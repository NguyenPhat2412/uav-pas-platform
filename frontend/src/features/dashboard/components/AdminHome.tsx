'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import type {ReactNode} from 'react';
import {useQuery} from '@tanstack/react-query';
import {AlertTriangle, ChevronRight, CircleAlert, ClipboardList, History, Info} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {HeaderSearch} from '@/components/layout/HeaderSearch';
import {ADMIN_SIDEBAR_ROUTES} from '@/components/layout/sidebar-routes';
import {ADMIN_RECENT_PAGES_KEY, readRecentPages} from '@/components/layout/recent-pages';
import {formatDate} from '@/components/shared/presentation';
import {adminService} from '@/lib/api/admin';
import {alertCenterApi, alertCenterQueryKey} from '@/features/alerts/api';
import {useAlertMessage} from '@/features/alerts/useAlertMessage';
import {cn} from '@/lib/utils';

const LIST_SIZE = 5;
const severityIcon = {
    CRITICAL: {icon: CircleAlert, tone: 'text-red-600'},
    WARNING: {icon: AlertTriangle, tone: 'text-amber-600'},
    INFO: {icon: Info, tone: 'text-blue-600'},
} as const;

/**
 * Admin home in the spirit of a cloud console: one question and a large page search on a plain page,
 * then three short live lists (missions waiting for approval, current alerts, pages visited last).
 */
export function AdminHome() {
    const {user, can, permissionsReady} = useAuth();
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

    const pending = useQuery({
        queryKey: ['session', user?.id, 'admin-pending-missions'],
        queryFn: ({signal}) => adminService.pendingMissions(signal),
        enabled: permissionsReady && can('MISSION_VIEW_ALL'),
    });
    const alerts = useQuery({
        queryKey: alertCenterQueryKey(user?.id),
        queryFn: ({signal}) => alertCenterApi.current(signal),
        enabled: permissionsReady && can('DASHBOARD_READ'),
        refetchInterval: 60_000,
        retry: false,
    });

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

    return <div className="space-y-10 pb-2">
        <section className="mx-auto flex max-w-3xl flex-col items-center gap-5 pt-6 text-center sm:pt-10">
            {urgent > 0 && can('DASHBOARD_READ') && <Link href="/admin/alerts"
                                       className="inline-flex items-center gap-2 rounded-badge border border-border bg-card px-4 py-1.5 text-[13px] font-medium text-foreground shadow-sm transition-colors hover:border-primary hover:text-primary">
                <span className="h-2 w-2 rounded-full bg-red-600" aria-hidden="true"/>
                {t('admin.dashboard.home.attention', {count: urgent})}
                <ChevronRight size={14} aria-hidden="true"/>
            </Link>}
            <h1 className="m-0 text-[28px] font-semibold tracking-tight text-foreground sm:text-[34px]">{t('admin.dashboard.home.question')}</h1>
            <div className="w-full text-left">
                <HeaderSearch variant="hero" items={searchItems} recent={recentItems.map(toSearchItem)}
                              placeholder={t('admin.dashboard.home.searchPlaceholder')}/>
            </div>
        </section>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-3">
            {can('MISSION_VIEW_ALL') && <HomeColumn title={t('admin.dashboard.home.pending')} count={pending.data?.totalElements}
                                                    href="/operations/dispatch/missions"
                                                    empty={pending.isPending ? t('admin.dashboard.home.loading') : t('admin.dashboard.home.pendingEmpty')}>
                {missions.slice(0, LIST_SIZE).map(mission => <HomeRow key={mission.id} href={`/operations/missions/${mission.id}`}
                                                                       icon={<ClipboardList size={16} className="text-slate-400"/>}
                                                                       label={mission.title || mission.code} meta={formatDate(mission.startTime)}/>)}
            </HomeColumn>}
            {can('DASHBOARD_READ') && <HomeColumn title={t('admin.dashboard.home.alerts')} count={alerts.data ? urgent : undefined} href="/admin/alerts"
                                                  empty={alerts.isPending ? t('admin.dashboard.home.loading') : t('admin.dashboard.home.alertsEmpty')}>
                {alertItems.map(alert => {
                    const {icon: Icon, tone} = severityIcon[alert.severity];
                    return <HomeRow key={alert.id} href={alert.href || '/admin/alerts'} icon={<Icon size={16} className={tone}/>}
                                    label={alertMessage(alert)}/>;
                })}
            </HomeColumn>}
            <HomeColumn title={t('admin.dashboard.home.recent')} empty={t('admin.dashboard.home.recentEmpty')}>
                {recentItems.map(item => <HomeRow key={item.href} href={item.href} icon={<History size={16} className="text-slate-400"/>}
                                                  label={<><span className="text-muted">{t(`adminNavGroups.${item.group}`)} / </span>{labelOf(item)}</>}/>)}
            </HomeColumn>
        </div>
    </div>;
}

function HomeColumn({title, count, href, empty, children}: {
    title: string; count?: number; href?: string; empty: string; children: ReactNode[];
}) {
    const heading = <>
        {title}
        {count !== undefined && <span className="rounded-badge bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{count}</span>}
        {href && <ChevronRight size={14} aria-hidden="true"/>}
    </>;
    return <section className="min-w-0">
        <h2 className="m-0 mb-1 text-sm font-medium text-muted">
            {href ? <Link href={href} className="inline-flex items-center gap-2 hover:text-primary">{heading}</Link>
                : <span className="inline-flex items-center gap-2">{heading}</span>}
        </h2>
        {children.length ? <ul className="m-0 list-none p-0">{children}</ul>
            : <p className="m-0 border-b border-border py-4 text-sm text-muted">{empty}</p>}
    </section>;
}

function HomeRow({href, icon, label, meta}: { href: string; icon: ReactNode; label: ReactNode; meta?: string }) {
    return <li className="border-b border-border">
        <Link href={href} className={cn('group flex items-center gap-3 py-3.5 text-[15px] text-foreground transition-colors hover:text-primary')}>
            <span className="shrink-0" aria-hidden="true">{icon}</span>
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {meta && <span className="shrink-0 text-xs text-muted">{meta}</span>}
            <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-slate-300 transition-colors group-hover:text-primary"/>
        </Link>
    </li>;
}
