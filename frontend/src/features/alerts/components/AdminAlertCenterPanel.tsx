'use client';

import Link from 'next/link';
import {useMemo, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {AlertTriangle, ChevronRight, CircleAlert, Info, RefreshCw} from 'lucide-react';
import {AdminPage} from '@/components/layout/AdminPage';
import {QueryState} from '@/components/data/WorkspaceState';
import {FilterSelect} from '@/components/shared/FilterSelect';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {cn} from '@/lib/utils';
import {alertCenterApi, alertCenterQueryKey, SEVERITIES, SOURCES, type AlertSeverity, type AlertSource} from '@/features/alerts/api';
import {useAlertMessage} from '@/features/alerts/useAlertMessage';

export const severityStyle: Record<AlertSeverity, { stripe: string; icon: typeof Info; text: string; chip: string }> = {
    CRITICAL: {stripe: 'border-l-red-600', icon: CircleAlert, text: 'text-red-700', chip: 'border-red-200 bg-red-50 text-red-700'},
    WARNING: {stripe: 'border-l-amber-500', icon: AlertTriangle, text: 'text-amber-700', chip: 'border-amber-200 bg-amber-50 text-amber-700'},
    INFO: {stripe: 'border-l-blue-600', icon: Info, text: 'text-blue-700', chip: 'border-blue-200 bg-blue-50 text-blue-700'},
};

function AlertCenterContent() {
    const {t, formatDate} = useI18n();
    const {user} = useAuth();
    const message = useAlertMessage();
    const query = useQuery({
        queryKey: alertCenterQueryKey(user?.id),
        queryFn: ({signal}) => alertCenterApi.current(signal),
        refetchInterval: 60_000,
    });
    const [severity, setSeverity] = useState<AlertSeverity | 'ALL'>('ALL');
    const [source, setSource] = useState<AlertSource | 'ALL'>('ALL');
    const items = useMemo(() => (query.data?.items ?? [])
        .filter(a => severity === 'ALL' || a.severity === severity)
        .filter(a => source === 'ALL' || a.source === source), [query.data, severity, source]);

    return <div className="space-y-5 pb-12">
        <div className="grid gap-3 sm:grid-cols-3">
            {SEVERITIES.map(level => {
                const style = severityStyle[level];
                const Icon = style.icon;
                const count = query.data ? query.data[level.toLowerCase() as 'critical' | 'warning' | 'info'] : null;
                return <div key={level} className={cn('flex items-center gap-3 rounded-panel border border-l-4 border-border bg-card px-4 py-3', style.stripe)}>
                    <Icon size={20} className={style.text} aria-hidden="true"/>
                    <span className="flex-1 text-sm font-semibold text-slate-700">{t(`adminPlatform.alerts.severity.${level}`)}</span>
                    <span className={cn('text-xl font-bold tabular-nums', style.text)}>{count ?? '—'}</span>
                </div>;
            })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
            <FilterSelect<AlertSeverity | 'ALL'> label={t('adminPlatform.alerts.filters.severity')} value={severity} onChange={setSeverity}
                                                 options={[{value: 'ALL', label: t('adminPlatform.alerts.filters.all')},
                                                     ...SEVERITIES.map(s => ({value: s, label: t(`adminPlatform.alerts.severity.${s}`)}))]}/>
            <FilterSelect<AlertSource | 'ALL'> label={t('adminPlatform.alerts.filters.source')} value={source} onChange={setSource}
                                               options={[{value: 'ALL', label: t('adminPlatform.alerts.filters.all')},
                                                   ...SOURCES.map(s => ({value: s, label: t(`adminPlatform.alerts.sources.${s}`)}))]}/>
            <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
                {query.data && <span>{t('adminPlatform.alerts.generatedAt', {time: formatDate(query.data.generatedAt, {timeStyle: 'medium'})})}</span>}
                <button type="button" onClick={() => void query.refetch()} disabled={query.isFetching}
                        className="inline-flex h-9 items-center gap-1.5 rounded-control border border-border bg-card px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                    <RefreshCw size={14} className={cn(query.isFetching && 'animate-spin')} aria-hidden="true"/>{t('adminPlatform.alerts.refresh')}
                </button>
            </div>
        </div>

        <QueryState query={query}>
            {items.length === 0
                ? <p className="rounded-panel border border-border bg-card px-4 py-8 text-center text-sm text-slate-500" role="status">
                    {query.data?.items.length ? t('adminPlatform.alerts.noneMatching') : t('adminPlatform.alerts.none')}
                </p>
                : <ul className="m-0 list-none divide-y divide-slate-100 overflow-hidden rounded-panel border border-border bg-card p-0">
                    {items.map(alert => {
                        const style = severityStyle[alert.severity] ?? severityStyle.INFO;
                        const Icon = style.icon;
                        return <li key={alert.id} className={cn('flex flex-wrap items-start gap-3 border-l-[3px] px-4 py-3', style.stripe)}>
                            <Icon size={17} className={cn('mt-0.5 shrink-0', style.text)} aria-hidden="true"/>
                            <div className="min-w-0 flex-1">
                                <p className="m-0 text-sm text-slate-900">{message(alert)}</p>
                                <p className="m-0 mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                                    <span className={cn('rounded-full border px-2 py-0.5 font-semibold', style.chip)}>{t(`adminPlatform.alerts.severity.${alert.severity}`)}</span>
                                    <span>{t(`adminPlatform.alerts.sources.${alert.source}`)}</span>
                                    {alert.since && <span>{t('adminPlatform.alerts.since', {time: formatDate(alert.since, {dateStyle: 'short', timeStyle: 'short'})})}</span>}
                                </p>
                            </div>
                            <Link href={alert.href} className="inline-flex items-center gap-0.5 whitespace-nowrap text-xs font-semibold text-primary hover:underline">
                                {t('adminPlatform.alerts.open')}<ChevronRight size={13} aria-hidden="true"/>
                            </Link>
                        </li>;
                    })}
                </ul>}
        </QueryState>
    </div>;
}

export default function AdminAlertCenterPage() {
    return <AdminPage title="adminPlatform.alerts.title" permission="DASHBOARD_READ" activeResource="alerts">
        <AlertCenterContent/>
    </AdminPage>;
}
