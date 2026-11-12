'use client';

import {Activity, AlertTriangle, Archive, CheckCircle2, CircleHelp, Cpu, Database, HardDrive, Lock, Mail, RefreshCw, Send, Wallet, XCircle} from 'lucide-react';
import {Alert, Badge, type BadgeProps, Button, Card, CardHeader, CardTitle, KpiCard, MetricStrip} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import {QueryState} from '@/components/data/WorkspaceState';
import {cn} from '@/lib/utils';
import {useSystemHealth} from '@/hooks/settings/useSettings';
import type {HealthStatus, SystemHealth} from '@/types/settings/system-health.types';

const tone: Record<HealthStatus, { stripe: string; text: string; badge: NonNullable<BadgeProps['variant']>; icon: typeof CheckCircle2 }> = {
    UP: {stripe: 'border-l-uav-blue', text: 'text-uav-blue', badge: 'success', icon: CheckCircle2},
    DEGRADED: {stripe: 'border-l-amber-500', text: 'text-amber-700', badge: 'warning', icon: AlertTriangle},
    DOWN: {stripe: 'border-l-red-600', text: 'text-red-700', badge: 'error', icon: XCircle},
    UNKNOWN: {stripe: 'border-l-slate-400', text: 'text-slate-500', badge: 'default', icon: CircleHelp},
};

const componentIcon: Record<string, typeof Database> = {
    database: Database,
    storage: HardDrive,
    webhooks: Send,
    financialOutbox: Wallet,
    mail: Mail,
    backups: Archive,
    tls: Lock,
};

/** Labels for components added by the infrastructure package live in the adminInfra namespace; admin.health wins when both exist. */
function useHealthLabel() {
    const {t} = useI18n();
    return (path: string) => {
        const primary = `admin.health.${path}`;
        const value = t(primary);
        if (value !== primary) return value;
        const fallback = `adminInfra.health.${path}`;
        const infra = t(fallback);
        return infra !== fallback ? infra : value;
    };
}

export function AdminSystemHealthPanel() {
    const {t, formatDate} = useI18n();
    const query = useSystemHealth();
    return (
        <div className="space-y-4">
            <QueryState query={query}>
                {query.data && (
                    <Body
                        data={query.data}
                        refreshing={query.isFetching}
                        onRefresh={() => void query.refetch()}
                        checkedAt={formatDate(query.data.checkedAt, {timeStyle: 'medium'})}
                    />
                )}
            </QueryState>
            <Alert variant="info" className="py-2.5 text-xs">{t('admin.health.note')}</Alert>
        </div>
    );
}

function Body({data, refreshing, onRefresh, checkedAt}: {
    data: SystemHealth;
    refreshing: boolean;
    onRefresh: () => void;
    checkedAt: string;
}) {
    const {t} = useI18n();
    const label = useHealthLabel();
    const overall = tone[data.status] ?? tone.UNKNOWN;
    const OverallIcon = overall.icon;
    const problems = data.components.filter(c => c.status === 'DOWN' || c.status === 'DEGRADED');
    const heapPct = data.runtime.heapMaxMb ? Math.round(data.runtime.heapUsedMb / data.runtime.heapMaxMb * 100) : 0;
    const uptime = formatUptime(data.runtime.uptimeSeconds, t);

    return (
        <>
            <Card className={cn('flex flex-wrap items-center gap-4 border-l-4 px-5 py-4', overall.stripe)} role="status">
                <OverallIcon size={28} className={overall.text} aria-hidden="true"/>
                <div className="min-w-0 flex-1">
                    <h2 className={cn('m-0 text-lg font-bold', overall.text)}>{t(`admin.health.overall.${data.status}`)}</h2>
                    <p className="m-0 text-[13px] text-slate-600">
                        {problems.length
                            ? t('admin.health.problems', {list: problems.map(c => label(`component.${c.key}`)).join(', ')})
                            : t('admin.health.allGood')}
                    </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{t('admin.health.checkedAt', {time: checkedAt})}</span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onRefresh}
                        disabled={refreshing}
                        leftIcon={<RefreshCw size={14} className={cn(refreshing && 'animate-spin')} aria-hidden="true"/>}
                    >
                        {t('admin.health.refresh')}
                    </Button>
                </div>
            </Card>

            <div className="grid gap-3 md:grid-cols-2 md:[&>*:last-child:nth-child(odd)]:col-span-full">
                {data.components.map(c => {
                    const s = tone[c.status] ?? tone.UNKNOWN;
                    const Icon = componentIcon[c.key] ?? Activity;
                    const StatusIcon = s.icon;
                    return (
                        <Card key={c.key} className={cn('border-l-4', s.stripe)} aria-labelledby={`health-${c.key}`}>
                            <CardHeader className="flex-row items-center gap-2 space-y-0 px-4 py-3">
                                <Icon size={17} className="text-slate-500" aria-hidden="true"/>
                                <CardTitle id={`health-${c.key}`} className="m-0 flex-1 text-[14px] font-bold text-slate-900">
                                    {label(`component.${c.key}`)}
                                </CardTitle>
                                <Badge variant={s.badge} size="sm" icon={<StatusIcon size={12} aria-hidden="true"/>}>
                                    {label(`status.${c.status}`)}
                                </Badge>
                            </CardHeader>
                            <dl className="m-0 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 px-4 py-3 text-[13px]">
                                {c.latencyMs != null && (
                                    <>
                                        <dt className="text-slate-500">{t('admin.health.latency')}</dt>
                                        <dd className="m-0 text-right tabular-nums text-slate-900">{c.latencyMs} ms</dd>
                                    </>
                                )}
                                {Object.entries(c.details).map(([key, value]) => (
                                    <div key={key} className="contents">
                                        <dt className="text-slate-500">{label(`detail.${key}`)}</dt>
                                        <dd className={cn('m-0 text-right tabular-nums text-slate-900', isWarning(c.key, key, value) && 'font-semibold text-amber-700')}>
                                            {String(value)}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                            {c.status !== 'UP' && (
                                <p className="m-0 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-600">
                                    {label(`hint.${c.key}.${c.status}`)}
                                </p>
                            )}
                        </Card>
                    );
                })}
            </div>

            <Card aria-labelledby="health-runtime">
                <CardHeader className="flex-row items-center gap-2 space-y-0 px-4 py-3">
                    <Cpu size={17} className="text-slate-500" aria-hidden="true"/>
                    <CardTitle id="health-runtime" className="m-0 text-[14px] font-bold text-slate-900">
                        {t('admin.health.runtime')}
                    </CardTitle>
                </CardHeader>
                <MetricStrip className="border-0">
                    <KpiCard label={t('admin.health.uptime')} value={uptime} tone="blue"/>
                    <KpiCard
                        label={t('admin.health.heap')}
                        value={`${data.runtime.heapUsedMb} / ${data.runtime.heapMaxMb} MB`}
                        meta={`${heapPct}%`}
                        tone={heapPct >= 85 ? 'red' : heapPct >= 70 ? 'amber' : 'blue'}
                    />
                    <KpiCard
                        label={t('admin.health.load')}
                        value={data.runtime.systemLoad >= 0 ? `${data.runtime.systemLoad} / ${data.runtime.processors} CPU` : '—'}
                        tone="slate"
                    />
                    <KpiCard label={t('admin.health.java')} value={data.runtime.javaVersion} tone="slate"/>
                </MetricStrip>
                <div className="px-4 py-2.5 border-t border-slate-100">
                    <div className="h-1.5 bg-slate-100" aria-hidden="true">
                        <span
                            className={cn('block h-1.5', heapPct >= 85 ? 'bg-red-600' : heapPct >= 70 ? 'bg-amber-500' : 'bg-uav-blue')}
                            style={{width: `${heapPct}%`}}
                        />
                    </div>
                </div>
            </Card>
        </>
    );
}

function isWarning(component: string, key: string, value: string | number) {
    return typeof value === 'number' && value > 0 && ['stuck', 'failed24h', 'lagging', 'failed'].includes(key)
        && ['webhooks', 'financialOutbox'].includes(component);
}

function formatUptime(seconds: number, t: (key: string, params?: Record<string, string | number>) => string) {
    const days = Math.floor(seconds / 86400), hours = Math.floor(seconds % 86400 / 3600), minutes = Math.floor(seconds % 3600 / 60);
    return days ? t('admin.health.uptimeDays', {days, hours}) : t('admin.health.uptimeHours', {hours, minutes});
}
