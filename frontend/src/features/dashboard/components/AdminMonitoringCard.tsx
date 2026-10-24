'use client';

import Link from 'next/link';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {systemHealthService} from '@/features/settings/services/system-health.service';
import {TELEMETRY_POLL_MS, telemetryService} from '@/features/uavs/services/telemetry.service';
import {sarKeys, sarService} from '@/features/sar/services/sar.service';
import type {HealthStatus} from '@/features/settings/types/system-health.types';
import {cn} from '@/lib/utils';

type Tone = 'ok' | 'warn' | 'down' | 'idle';
const dot: Record<Tone, string> = {ok: 'bg-uav-blue', warn: 'bg-amber-500', down: 'bg-primary', idle: 'bg-slate-300'};
const healthTone: Record<HealthStatus, Tone> = {UP: 'ok', DEGRADED: 'warn', DOWN: 'down', UNKNOWN: 'idle'};

export interface FleetSummary {
    totalUavs: number;
    availableUavs: number;
    maintenanceUavs: number;
}

/** Live platform signals for the admin dashboard: service health, telemetry feed, fleet and open SAR work. */
export function AdminMonitoringCard({fleet, summaryLoaded}: { fleet: FleetSummary | null; summaryLoaded: boolean }) {
    const {user, can, permissionsReady} = useAuth();
    const {t, formatNumber} = useI18n();
    const canHealth = permissionsReady && can('PERMISSION_MANAGE');
    const health = useQuery({
        queryKey: ['session', user?.id, 'system-health'],
        queryFn: ({signal}) => systemHealthService.get(signal),
        enabled: canHealth,
        refetchInterval: 30_000,
    });
    const telemetry = useQuery({
        queryKey: ['telemetry', 'fleet'],
        queryFn: ({signal}) => telemetryService.fleet(signal),
        enabled: permissionsReady && can('UAV_READ'),
        refetchInterval: TELEMETRY_POLL_MS,
    });
    const sar = useQuery({
        queryKey: sarKeys.missions,
        queryFn: ({signal}) => sarService.missions(false, signal),
        enabled: permissionsReady && (can('MISSION_VIEW') || can('MISSION_VIEW_ALL')),
        refetchInterval: 30_000,
    });

    const live = (telemetry.data ?? []).filter(f => !f.stale);
    const freshest = live.reduce<number | null>((min, f) => min == null || f.ageSeconds < min ? f.ageSeconds : min, null);
    const lowBattery = live.filter(f => f.batteryPct != null && f.batteryPct <= 25).length;
    const sarOpen = sar.data?.length ?? 0;
    const sarLocated = sar.data?.filter(m => m.sarStatus === 'TARGET_LOCATED').length ?? 0;

    const rows: { key: string; label: string; value: string; tone: Tone; href?: string }[] = [];
    if (canHealth && health.data) {
        health.data.components.forEach(c => rows.push({
            key: c.key,
            label: t(`admin.health.component.${c.key}`),
            value: t(`admin.health.status.${c.status}`) + (c.latencyMs ? ` · ${formatNumber(c.latencyMs)} ms` : ''),
            tone: healthTone[c.status] ?? 'idle',
            href: '/admin/system-health',
        }));
    } else {
        rows.push({
            key: 'api', label: t('admin.dashboard.status.api'),
            value: canHealth && health.isError ? t('admin.dashboard.status.unreachable')
                : summaryLoaded ? t('admin.dashboard.status.operational') : t('admin.dashboard.status.checking'),
            tone: canHealth && health.isError ? 'down' : summaryLoaded ? 'ok' : 'idle',
        });
    }
    if (can('UAV_READ')) rows.push({
        key: 'telemetry', label: t('admin.dashboard.status.realtime'),
        value: telemetry.isError ? t('admin.dashboard.status.unreachable')
            : !telemetry.data ? t('admin.dashboard.status.checking')
                : live.length ? t('admin.dashboard.status.liveFeed', {live: live.length, total: fleet?.totalUavs ?? live.length, seconds: freshest ?? 0})
                    : t('admin.dashboard.status.noLiveFeed'),
        tone: telemetry.isError ? 'down' : live.length ? (lowBattery ? 'warn' : 'ok') : 'idle',
        href: '/admin/fleet-map',
    });
    if (lowBattery) rows.push({key: 'battery', label: t('admin.dashboard.status.lowBattery'), value: formatNumber(lowBattery), tone: 'warn', href: '/admin/fleet-map'});
    rows.push({
        key: 'fleet', label: t('admin.dashboard.status.fleet'),
        value: fleet ? t('admin.dashboard.status.fleetDetail', {available: fleet.availableUavs, total: fleet.totalUavs, maintenance: fleet.maintenanceUavs}) : '—',
        tone: !fleet ? 'idle' : fleet.totalUavs > 0 && (fleet.availableUavs === 0 || fleet.maintenanceUavs > 0) ? 'warn' : 'ok',
        href: '/admin/fleet-map',
    });
    if (sar.data) rows.push({
        key: 'sar', label: t('admin.dashboard.status.sar'),
        value: sarOpen ? t('admin.dashboard.status.sarOpen', {open: sarOpen, located: sarLocated}) : t('admin.dashboard.status.sarNone'),
        tone: sarLocated ? 'down' : sarOpen ? 'warn' : 'ok',
        href: '/operations/sar-cockpit',
    });

    return <section className="min-w-0 rounded-none border border-border bg-card">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-[18px] py-3.5">
            <h2 className="text-[15px] font-bold tracking-tight text-foreground">{t('admin.dashboard.status.title')}</h2>
            {canHealth && health.data && <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold',
                health.data.status === 'UP' ? 'text-uav-blue' : health.data.status === 'DOWN' ? 'text-primary' : 'text-amber-700')}>
                <span className={cn('h-2 w-2 rounded-full', dot[healthTone[health.data.status]])} aria-hidden="true"/>
                {t(`admin.health.status.${health.data.status}`)}</span>}
        </header>
        <ul className="m-0 list-none px-[18px] pb-3.5 pt-1.5">
            {rows.map(row => {
                const body = <>
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', dot[row.tone])} aria-hidden="true"/>
                    <span className="flex-1 text-foreground">{row.label}</span>
                    <small className={cn('text-right text-xs', row.tone === 'down' ? 'font-semibold text-primary' : row.tone === 'warn' ? 'text-amber-700' : 'text-muted')}>{row.value}</small>
                </>;
                return <li key={row.key} className="border-b border-dashed border-border text-[13px] last:border-b-0">
                    {row.href ? <Link href={row.href} className="flex items-center gap-2.5 py-2.5 hover:text-primary">{body}</Link>
                        : <div className="flex items-center gap-2.5 py-2.5">{body}</div>}
                </li>;
            })}
        </ul>
        {can('PERMISSION_MANAGE') && <div className="flex flex-wrap gap-2 px-[18px] pb-[18px]">
            <Link href="/admin/system-health" className="inline-flex min-h-[40px] items-center rounded-none border border-border bg-card px-4 text-[13px] font-bold text-foreground transition hover:bg-background">
                {t('admin.dashboard.status.openHealth')}</Link>
            <Link href="/admin/webhooks" className="inline-flex min-h-[40px] items-center rounded-none border border-border bg-card px-4 text-[13px] font-bold text-foreground transition hover:bg-background">
                {t('admin.dashboard.status.manageIntegrations')}</Link>
        </div>}
    </section>;
}
