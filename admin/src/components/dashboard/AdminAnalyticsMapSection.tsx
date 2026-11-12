'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import {useMemo, useState} from 'react';
import {ExternalLink, MapPin, Navigation} from 'lucide-react';
import {
    Badge,
    Button,
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui';
import {Legend} from '@/components/dashboard/AdminCharts';
import {displayLabel} from '@/lib/presentation';
import {useI18n} from '@/providers/I18nContext';
import type {AdminAnalytics as Analytics} from '@/types/admin';
import {cn} from '@/lib/utils';

const MissionMap = dynamic(
    () => import('@/components/dashboard/MissionMap').then(m => m.MissionMap),
    {ssr: false},
);

// Strict Red & White shades so every status group stays in the red-white palette.
export const statusGroups = [
    {key: 'waiting', color: '#a1a1aa', states: ['PENDING_CONFIRMATION']},
    {key: 'scheduled', color: '#71717a', states: ['CONFIRMED', 'RESOURCE_RESERVED', 'READY']},
    {key: 'active', color: '#c43a4a', states: ['IN_PROGRESS']},
    {key: 'completed', color: '#3f3f46', states: ['COMPLETED']},
    {key: 'stopped', color: '#7f1d1d', states: ['CANCELLED', 'REJECTED', 'FAILED']},
    {key: 'draft', color: '#fecaca', states: ['DRAFT']},
] as const;

export function groupOf(status: string) {
    return (
        statusGroups.find(group => (group.states as readonly string[]).includes(status)) ??
        statusGroups[5]
    );
}

export function AdminAnalyticsMapSection({
    locations,
}: {
    locations: Analytics['missionLocations'];
}) {
    const {t} = useI18n();
    const [mapFilter, setMapFilter] = useState<string>('all');
    const [selectedMissionCode, setSelectedMissionCode] = useState<string | null>(null);

    const allMapPoints = useMemo(
        () =>
            locations.map(p => {
                const g = groupOf(p.status);
                return {
                    ...p,
                    color: g.color,
                    label: displayLabel(p.status),
                    statusKey: g.key,
                    pulse: g.key === 'active' || g.key === 'waiting' || g.key === 'stopped',
                };
            }),
        [locations],
    );

    const filteredMapPoints = useMemo(
        () =>
            mapFilter === 'all'
                ? allMapPoints
                : allMapPoints.filter(p => p.statusKey === mapFilter),
        [allMapPoints, mapFilter],
    );

    const mapGroupCounts = useMemo(() => {
        const counts: Record<string, number> = {all: allMapPoints.length};
        for (const g of statusGroups) {
            counts[g.key] = allMapPoints.filter(p => p.statusKey === g.key).length;
        }
        return counts;
    }, [allMapPoints]);

    const activeMissionPoint = useMemo(
        () =>
            filteredMapPoints.find(p => p.code === selectedMissionCode) ??
            filteredMapPoints[0] ??
            null,
        [filteredMapPoints, selectedMissionCode],
    );

    return (
        <Card id="admin-mission-map" className="col-span-full min-w-0 rounded-none border-0 bg-white">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b border-rose-200 bg-uav-red-light/60 px-[18px] py-3.5">
                <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-control bg-primary text-white">
                        <MapPin size={15} aria-hidden="true" />
                    </span>
                    <div>
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-[15px] font-bold tracking-tight text-primary">
                                {t('admin.analytics.mapTitle')}
                            </CardTitle>
                            <Badge variant="primary" size="sm" className="bg-primary text-white tabular-nums">
                                {filteredMapPoints.length}/{allMapPoints.length} điểm bay
                            </Badge>
                        </div>
                        <CardDescription className="m-0 text-xs text-primary/75">
                            Nhấp vào bộ lọc trạng thái hoặc chọn trực tiếp từng nhiệm vụ bên phải để định vị tọa độ trên bản đồ.
                        </CardDescription>
                    </div>
                </div>
                <Link
                    href="/admin/fleet-map"
                    className="inline-flex items-center gap-1.5 rounded-control bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
                >
                    <span>Mở Bản đồ Đội bay Toàn màn hình</span>
                    <ExternalLink size={13} aria-hidden="true" />
                </Link>
            </CardHeader>

            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-100 bg-white px-[18px] py-2.5">
                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Lọc điểm nhiệm vụ trên bản đồ">
                    <Button
                        type="button"
                        size="sm"
                        variant={mapFilter === 'all' ? 'primary' : 'outline'}
                        aria-pressed={mapFilter === 'all'}
                        onClick={() => setMapFilter('all')}
                        className="h-7 px-2.5 py-1 text-xs"
                    >
                        <span>Tất cả</span>
                        <Badge variant="default" size="sm" className="tabular-nums">
                            {mapGroupCounts.all ?? 0}
                        </Badge>
                    </Button>
                    {statusGroups.slice(0, 5).map(g => {
                        const isActive = mapFilter === g.key;
                        return (
                            <Button
                                key={g.key}
                                type="button"
                                size="sm"
                                variant={isActive ? 'primary' : 'outline'}
                                aria-pressed={isActive}
                                onClick={() => setMapFilter(isActive ? 'all' : g.key)}
                                className="h-7 px-2.5 py-1 text-xs"
                            >
                                <span
                                    className="h-2 w-2 rounded-full border border-white"
                                    style={{background: isActive ? '#ffffff' : g.color}}
                                    aria-hidden="true"
                                />
                                <span>{t(`admin.analytics.status.${g.key}`)}</span>
                                <strong className="tabular-nums">{mapGroupCounts[g.key] ?? 0}</strong>
                            </Button>
                        );
                    })}
                </div>
                <Legend items={statusGroups.slice(0, 5).map(g => ({label: t(`admin.analytics.status.${g.key}`), color: g.color}))} />
            </div>

            {allMapPoints.length ? (
                <div className="grid grid-cols-1 divide-y divide-rose-200 lg:grid-cols-[minmax(0,1fr)_320px] lg:divide-x lg:divide-y-0">
                    <div className="relative min-w-0">
                        <MissionMap
                            ariaLabel={t('admin.analytics.mapAria', {count: filteredMapPoints.length})}
                            points={filteredMapPoints}
                            selectedCode={activeMissionPoint?.code ?? null}
                            onSelect={setSelectedMissionCode}
                        />
                        {activeMissionPoint && (
                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rose-200 bg-uav-red-light/50 px-4 py-2.5 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-white" aria-hidden="true" />
                                    <strong className="font-mono font-bold text-primary">{activeMissionPoint.code}</strong>
                                    <Badge variant="outline" size="sm" className="border-rose-200 bg-white text-primary">
                                        {activeMissionPoint.label}
                                    </Badge>
                                    <span className="font-mono text-[11px] tabular-nums text-primary/75">
                                        ({activeMissionPoint.latitude.toFixed(4)}, {activeMissionPoint.longitude.toFixed(4)})
                                    </span>
                                </div>
                                <Link href="/operations/dispatch/missions" className="font-bold text-primary hover:underline">
                                    Điều phối nhiệm vụ →
                                </Link>
                            </div>
                        )}
                    </div>

                    <aside className="flex max-h-[425px] flex-col bg-white" aria-label="Danh sách tọa độ nhiệm vụ">
                        <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50/50 px-3.5 py-2.5 text-xs">
                            <strong className="font-bold tracking-wider text-primary uppercase">Tọa độ Nhiệm vụ</strong>
                            <span className="font-semibold tabular-nums text-primary/75">{filteredMapPoints.length} mục</span>
                        </div>
                        <ul className="m-0 flex-1 list-none divide-y divide-rose-100 overflow-y-auto p-0">
                            {filteredMapPoints.map(pt => {
                                const selected = activeMissionPoint?.code === pt.code;
                                return (
                                    <li key={pt.code}>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedMissionCode(pt.code)}
                                            className={cn(
                                                'flex w-full cursor-pointer items-center justify-between gap-2 border-l-[3px] px-3.5 py-2.5 text-left text-xs transition-colors',
                                                selected
                                                    ? 'border-l-primary bg-uav-red-light font-bold text-primary'
                                                    : 'border-l-transparent bg-white text-foreground hover:bg-rose-50/60',
                                            )}
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <Navigation size={12} className="shrink-0 text-primary" aria-hidden="true" />
                                                    <span className="font-mono font-bold text-primary">{pt.code}</span>
                                                </div>
                                                <span className="mt-0.5 block font-mono text-[11px] tabular-nums text-primary/65">
                                                    {pt.latitude.toFixed(4)}, {pt.longitude.toFixed(4)}
                                                </span>
                                            </div>
                                            <Badge variant="outline" size="sm" className="shrink-0 border-rose-200 bg-white text-primary">
                                                {pt.label}
                                            </Badge>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </aside>
                </div>
            ) : (
                <p className="m-0 p-6 text-[13px] text-primary/70">{t('admin.analytics.mapEmpty')}</p>
            )}
        </Card>
    );
}
