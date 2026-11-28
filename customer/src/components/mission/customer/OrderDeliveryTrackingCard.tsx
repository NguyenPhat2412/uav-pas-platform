'use client';

import {
    Battery,
    CalendarClock,
    Check,
    Clock3,
    PackageCheck,
    Plane,
    Radio,
    ShieldCheck,
    Star,
} from 'lucide-react';
import {OrderTrackingPathMap} from '@/components/mission/customer/OrderTrackingPathMap';
import {formatTrackingLink} from '@/forms/project-form';
import {useOrderRealtimeSync, useOrderTracking} from '@/hooks/useCustomerProjects';
import {useI18n} from '@/providers/I18nContext';
import type {Mission} from '@/types/mission.types';
import type {OrderTrackingSnapshot} from '@/types/project.types';

function resolveMilestoneIndex(mission: Mission, snapshot?: OrderTrackingSnapshot | null): number {
    const effectiveStatus = snapshot?.status || mission.status;
    if (effectiveStatus === 'REVIEWED' || mission.reviewed) return 5;
    if (effectiveStatus === 'DELIVERED' || effectiveStatus === 'COMPLETED') return 4;
    if (effectiveStatus === 'IN_FLIGHT' || effectiveStatus === 'IN_PROGRESS' || snapshot?.activeSimulation) return 3;
    if (['ACCEPTED', 'SCHEDULED', 'CONFIRMED', 'RESOURCE_RESERVED', 'READY'].includes(effectiveStatus)) return 2;
    if (effectiveStatus === 'PENDING_PROVIDER') return 1;
    return 0;
}

export function isFlightFinishedAwaitingHandover(
    missionStatus: string,
    snapshot?: Pick<OrderTrackingSnapshot, 'status' | 'progressPct' | 'activeSimulation'> | null,
): boolean {
    const effectiveStatus = snapshot?.status || missionStatus;
    if (effectiveStatus !== 'IN_PROGRESS' && effectiveStatus !== 'IN_FLIGHT') return false;
    if (!snapshot) return false;
    return Number(snapshot.progressPct || 0) >= 100 || snapshot.activeSimulation === false;
}

export function OrderDeliveryTrackingCard({mission}: { mission: Mission }) {
    const {t, formatNumber} = useI18n();
    const isFlying = mission.status === 'IN_FLIGHT' || mission.status === 'IN_PROGRESS';
    const shouldPollTracking = !['DRAFT', 'CANCELLED', 'REJECTED'].includes(mission.status);
    const trackingQuery = useOrderTracking(mission.id, isFlying, shouldPollTracking);
    const {wsConnected} = useOrderRealtimeSync(mission.id);

    const snapshot = trackingQuery.isSuccess ? trackingQuery.data : null;
    const activeIdx = resolveMilestoneIndex(mission, snapshot);
    const progressPct = snapshot
        ? Math.max(0, Math.min(100, Math.round(Number(snapshot.progressPct || 0))))
        : mission.status === 'DELIVERED' || mission.status === 'COMPLETED' || mission.status === 'REVIEWED'
          ? 100
          : isFlying
            ? 55
            : 0;

    const awaitingHandover = isFlightFinishedAwaitingHandover(mission.status, snapshot);
    const showEta = Boolean(snapshot && !awaitingHandover && (snapshot.etaMinutes ?? 0) > 0);
    const fallbackCenter: [number, number] | null =
        mission.latitude != null && mission.longitude != null
            ? [Number(mission.latitude), Number(mission.longitude)]
            : null;
    const hasMapData = Boolean(
        (snapshot?.waypoints && snapshot.waypoints.length > 0) ||
            (snapshot?.track && snapshot.track.length > 0) ||
            snapshot?.position ||
            fallbackCenter,
    );

    const milestones = [
        {key: 'ordered', label: t('marketplaceShop.milestoneOrdered'), icon: Clock3},
        {key: 'dispatched', label: t('marketplaceShop.milestoneDispatched'), icon: ShieldCheck},
        {key: 'scheduled', label: t('marketplaceShop.milestoneScheduled'), icon: CalendarClock},
        {
            key: 'inflight',
            label: awaitingHandover
                ? t('marketplaceShop.flightCompletedAwaitingHandover')
                : t('marketplaceShop.milestoneInFlight'),
            icon: Plane,
        },
        {key: 'delivered', label: t('marketplaceShop.milestoneDelivered'), icon: PackageCheck},
        {key: 'reviewed', label: t('marketplaceShop.milestoneReviewed'), icon: Star},
    ];

    return (
        <section className="grid grid-cols-1 gap-4 rounded-panel border border-slate-200 bg-card p-4 lg:grid-cols-12">
            {/* Simulated Flight Path Map & Telemetry Summary */}
            <div className="space-y-3 lg:col-span-7">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 className="m-0 text-sm font-bold text-slate-900">
                            {t('marketplaceShop.trackingTitle')}
                        </h3>
                        <p className="m-0 text-xs text-slate-500">{t('marketplaceShop.trackingSubtitle')}</p>
                    </div>
                    {awaitingHandover ? (
                        <span className="inline-flex items-center gap-1.5 rounded-badge bg-amber-50 px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-amber-800 ring-1 ring-amber-200">
                            <PackageCheck size={13} aria-hidden="true"/>
                            {t('marketplaceShop.flightCompletedAwaitingHandover')}
                        </span>
                    ) : wsConnected ? (
                        <span className="inline-flex items-center gap-1.5 rounded-badge bg-uav-red-light px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-primary">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden="true"/>
                            {t('marketplaceShop.trackingLiveBadge')}
                        </span>
                    ) : null}
                </div>

                {hasMapData && (
                    <OrderTrackingPathMap
                        waypoints={snapshot?.waypoints}
                        track={snapshot?.track}
                        position={snapshot?.position}
                        fallbackCenter={fallbackCenter}
                        ariaLabel={t('marketplaceShop.trackingMapTitle')}
                        plannedLabel={t('marketplaceShop.trackingPlannedRoute')}
                        flownLabel={t('marketplaceShop.trackingFlownTrail')}
                        uavLabel={t('marketplaceShop.trackingUavPosition')}
                    />
                )}

                {/* Progress Bar */}
                <div className="space-y-1.5 rounded-control border border-slate-200 bg-slate-50 p-3 tabular-nums">
                    <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-600">{t('marketplaceShop.trackingProgress')}</span>
                        <span className="font-bold text-primary">{progressPct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                            className="h-full rounded-full bg-primary transition-[width] duration-300"
                            style={{width: `${progressPct}%`}}
                        />
                    </div>
                </div>

                {snapshot ? (
                    <dl className={`m-0 grid gap-2 tabular-nums sm:gap-2.5 ${showEta ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        {showEta && (
                            <div className="rounded-control border border-slate-200 bg-white p-2.5">
                                <dt className="flex items-center gap-1 text-[11px] leading-tight text-slate-500 sm:text-xs">
                                    <Clock3 size={13} className="shrink-0 text-primary" aria-hidden="true"/>
                                    <span className="line-clamp-2">{t('marketplaceShop.trackingEta')}</span>
                                </dt>
                                <dd className="m-0 mt-1 text-xs leading-tight font-bold text-slate-900 sm:text-sm">
                                    {t('marketplaceShop.trackingMinutes', {value: formatNumber(snapshot.etaMinutes ?? 0)})}
                                </dd>
                            </div>
                        )}
                        <div className="rounded-control border border-slate-200 bg-white p-2.5">
                            <dt className="flex items-center gap-1 text-[11px] leading-tight text-slate-500 sm:text-xs">
                                <Battery size={13} className="shrink-0 text-slate-700" aria-hidden="true"/>
                                <span className="line-clamp-2">{t('marketplaceShop.trackingBattery')}</span>
                            </dt>
                            <dd className="m-0 mt-1 text-xs leading-tight font-bold text-slate-900 sm:text-sm">
                                {snapshot.battery != null ? `${Math.round(Number(snapshot.battery))}%` : '—'}
                            </dd>
                        </div>
                        <div className="rounded-control border border-slate-200 bg-white p-2.5">
                            <dt className="flex items-center gap-1 text-[11px] leading-tight text-slate-500 sm:text-xs">
                                <Radio size={13} className="shrink-0 text-slate-700" aria-hidden="true"/>
                                <span className="line-clamp-2">{t('marketplaceShop.trackingLink')}</span>
                            </dt>
                            <dd className="m-0 mt-1 text-xs leading-tight font-bold text-slate-900 sm:text-sm">
                                {formatTrackingLink(snapshot.link)}
                            </dd>
                        </div>
                    </dl>
                ) : (
                    <p className="m-0 rounded-control border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                        {t('marketplaceShop.trackingIdle')}
                    </p>
                )}
            </div>

            {/* Shopee-style Vertical Delivery Milestone Timeline */}
            <div className="border-t border-slate-100 pt-3 lg:col-span-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-4">
                <ol className="m-0 space-y-2.5 list-none p-0">
                    {milestones.map((m, idx) => {
                        const Icon = m.icon;
                        const done = idx < activeIdx;
                        const current = idx === activeIdx;
                        return (
                            <li key={m.key} className="flex items-center gap-2.5">
                                <span
                                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                        current
                                            ? 'bg-primary text-white ring-4 ring-uav-red-light'
                                            : done
                                              ? 'bg-slate-900 text-white'
                                              : 'border border-slate-200 bg-slate-50 text-slate-400'
                                    }`}
                                    aria-hidden="true"
                                >
                                    {done ? <Check size={13}/> : <Icon size={13}/>}
                                </span>
                                <span
                                    className={`line-clamp-2 text-xs leading-snug ${
                                        current
                                            ? 'font-bold text-primary'
                                            : done
                                              ? 'font-semibold text-slate-800'
                                              : 'text-slate-400'
                                    }`}
                                >
                                    {m.label}
                                </span>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </section>
    );
}
