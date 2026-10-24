'use client';

import {useQuery} from '@tanstack/react-query';
import {Activity, AlertTriangle, CheckCircle2, CircleHelp, Cpu, Database, HardDrive, RefreshCw, Send, Wallet, XCircle} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {QueryState} from '@/components/data/WorkspaceState';
import {cn} from '@/lib/utils';
import {systemHealthService} from '@/features/settings/services/system-health.service';
import type {HealthStatus, SystemHealth} from '@/features/settings/types/system-health.types';

const tone: Record<HealthStatus, { stripe: string; text: string; icon: typeof CheckCircle2 }> = {
    UP: {stripe: 'border-l-uav-blue', text: 'text-uav-blue', icon: CheckCircle2},
    DEGRADED: {stripe: 'border-l-amber-500', text: 'text-amber-700', icon: AlertTriangle},
    DOWN: {stripe: 'border-l-red-600', text: 'text-red-700', icon: XCircle},
    UNKNOWN: {stripe: 'border-l-slate-400', text: 'text-slate-500', icon: CircleHelp},
};

const componentIcon: Record<string, typeof Database> = {database: Database, storage: HardDrive, webhooks: Send, financialOutbox: Wallet};

export function AdminSystemHealthPanel() {
    const {user} = useAuth();
    const {t, formatDate} = useI18n();
    const query = useQuery({
        queryKey: ['session', user?.id, 'system-health'],
        queryFn: ({signal}) => systemHealthService.get(signal),
        refetchInterval: 30_000,
    });
    return <div className="space-y-4">
        <QueryState query={query}>{query.data && <Body data={query.data} refreshing={query.isFetching} onRefresh={() => void query.refetch()}
                                                       checkedAt={formatDate(query.data.checkedAt, {timeStyle: 'medium'})}/>}</QueryState>
        <p className="text-xs text-slate-500">{t('admin.health.note')}</p>
    </div>;
}

function Body({data, refreshing, onRefresh, checkedAt}: { data: SystemHealth; refreshing: boolean; onRefresh: () => void; checkedAt: string }) {
    const {t} = useI18n();
    const overall = tone[data.status] ?? tone.UNKNOWN;
    const OverallIcon = overall.icon;
    const problems = data.components.filter(c => c.status === 'DOWN' || c.status === 'DEGRADED');
    const heapPct = data.runtime.heapMaxMb ? Math.round(data.runtime.heapUsedMb / data.runtime.heapMaxMb * 100) : 0;
    const uptime = formatUptime(data.runtime.uptimeSeconds, t);
    return <>
        <section className={cn('flex flex-wrap items-center gap-4 border border-l-4 border-slate-200 bg-white px-5 py-4', overall.stripe)} role="status">
            <OverallIcon size={28} className={overall.text} aria-hidden="true"/>
            <div className="min-w-0 flex-1">
                <h2 className={cn('m-0 text-lg font-bold', overall.text)}>{t(`admin.health.overall.${data.status}`)}</h2>
                <p className="m-0 text-[13px] text-slate-600">{problems.length
                    ? t('admin.health.problems', {list: problems.map(c => t(`admin.health.component.${c.key}`)).join(', ')})
                    : t('admin.health.allGood')}</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{t('admin.health.checkedAt', {time: checkedAt})}</span>
                <button type="button" onClick={onRefresh} disabled={refreshing}
                        className="inline-flex h-9 items-center gap-1.5 border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                    <RefreshCw size={14} className={cn(refreshing && 'animate-spin')} aria-hidden="true"/>{t('admin.health.refresh')}</button>
            </div>
        </section>

        <div className="grid gap-px border border-slate-200 bg-slate-200 [&>*]:border-0 md:grid-cols-2 md:[&>*:last-child:nth-child(odd)]:col-span-full">
            {data.components.map(c => {
                const s = tone[c.status] ?? tone.UNKNOWN;
                const Icon = componentIcon[c.key] ?? Activity;
                const StatusIcon = s.icon;
                return <section key={c.key} className={cn('border border-l-4 border-slate-200 bg-white', s.stripe)} aria-labelledby={`health-${c.key}`}>
                    <header className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                        <Icon size={17} className="text-slate-500" aria-hidden="true"/>
                        <h3 id={`health-${c.key}`} className="m-0 flex-1 text-[14px] font-bold text-slate-900">{t(`admin.health.component.${c.key}`)}</h3>
                        <span className={cn('inline-flex items-center gap-1 text-xs font-semibold', s.text)}>
                            <StatusIcon size={14} aria-hidden="true"/>{t(`admin.health.status.${c.status}`)}</span>
                    </header>
                    <dl className="m-0 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 px-4 py-3 text-[13px]">
                        {c.latencyMs != null && <><dt className="text-slate-500">{t('admin.health.latency')}</dt>
                            <dd className="m-0 text-right tabular-nums text-slate-900">{c.latencyMs} ms</dd></>}
                        {Object.entries(c.details).map(([key, value]) => <div key={key} className="contents">
                            <dt className="text-slate-500">{t(`admin.health.detail.${key}`)}</dt>
                            <dd className={cn('m-0 text-right tabular-nums text-slate-900', isWarning(c.key, key, value) && 'font-semibold text-amber-700')}>{String(value)}</dd>
                        </div>)}
                    </dl>
                    {c.status !== 'UP' && <p className="m-0 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-600">
                        {t(`admin.health.hint.${c.key}.${c.status}`)}</p>}
                </section>;
            })}
        </div>

        <section className="border border-slate-200 bg-white" aria-labelledby="health-runtime">
            <header className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                <Cpu size={17} className="text-slate-500" aria-hidden="true"/>
                <h3 id="health-runtime" className="m-0 text-[14px] font-bold text-slate-900">{t('admin.health.runtime')}</h3>
            </header>
            <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label={t('admin.health.uptime')} value={uptime}/>
                <Stat label={t('admin.health.heap')} value={`${data.runtime.heapUsedMb} / ${data.runtime.heapMaxMb} MB`}>
                    <span className="mt-2 block h-1.5 bg-slate-100"><span className={cn('block h-1.5', heapPct >= 85 ? 'bg-red-600' : heapPct >= 70 ? 'bg-amber-500' : 'bg-uav-blue')}
                                                                   style={{width: `${heapPct}%`}}/></span>
                </Stat>
                <Stat label={t('admin.health.load')} value={data.runtime.systemLoad >= 0 ? `${data.runtime.systemLoad} / ${data.runtime.processors} CPU` : '—'}/>
                <Stat label={t('admin.health.java')} value={data.runtime.javaVersion}/>
            </div>
        </section>
    </>;
}

function Stat({label, value, children}: { label: string; value: string; children?: React.ReactNode }) {
    return <div className="bg-white px-4 py-3">
        <span className="block text-xs text-slate-500">{label}</span>
        <strong className="mt-0.5 block text-[15px] tabular-nums text-slate-900">{value}</strong>
        {children}
    </div>;
}

function isWarning(component: string, key: string, value: string | number) {
    return typeof value === 'number' && value > 0 && ['stuck', 'failed24h', 'lagging', 'failed'].includes(key)
        && ['webhooks', 'financialOutbox'].includes(component);
}

function formatUptime(seconds: number, t: (key: string, params?: Record<string, string | number>) => string) {
    const days = Math.floor(seconds / 86400), hours = Math.floor(seconds % 86400 / 3600), minutes = Math.floor(seconds % 3600 / 60);
    return days ? t('admin.health.uptimeDays', {days, hours}) : t('admin.health.uptimeHours', {hours, minutes});
}
