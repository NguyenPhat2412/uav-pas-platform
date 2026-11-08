'use client';

import Link from 'next/link';
import React, {useMemo} from 'react';
import {History} from 'lucide-react';
import {Card, CardContent, CardHeader, CardTitle, StatusBadge} from '@/components/ui';
import {DataTable, type TableColumn, type TableFilter} from '@/components/data/DataTable';
import {EmptyState} from '@/components/data/WorkspaceState';
import {useI18n} from '@/providers/I18nContext';
import type {SimRunStatus, SimulationRunLog} from '@/types/simulation/simulation.types';

const RUN_STATUSES: readonly SimRunStatus[] = [
    'RUNNING',
    'COMPLETED',
    'FAILSAFE_RTH',
    'EMERGENCY_LANDED',
    'ABORTED',
];

export interface SimulationRunHistoryCardProps {
    runs: SimulationRunLog[];
    num: (value: number, digits?: number) => string;
    formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
}

export function SimulationRunHistoryCard({runs, num, formatDate}: SimulationRunHistoryCardProps) {
    const {t} = useI18n();

    const columns = useMemo<TableColumn<SimulationRunLog>[]>(() => [
        {
            id: 'uav',
            accessorKey: 'uavCode',
            header: t('simulation.history.uav'),
            cell: ({row}) => {
                const r = row.original;
                return (
                    <div>
                        <div className="font-semibold text-slate-900">{r.uavCode}</div>
                        <div className="text-[11px] font-normal tabular-nums text-slate-400">
                            {formatDate(r.startedAt, {month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'})}
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'mission',
            accessorFn: r => r.missionCode ?? '',
            header: t('simulation.history.mission'),
            cell: ({row}) => {
                const r = row.original;
                return r.missionId != null && r.missionCode ? (
                    <Link href={`/operations/missions/${r.missionId}`} className="font-bold text-uav-blue hover:underline">
                        {r.missionCode}
                    </Link>
                ) : (
                    <span className="text-slate-400">{t('simulation.history.freeFlight')}</span>
                );
            },
        },
        {
            id: 'environment',
            accessorKey: 'altitudeMeters',
            header: t('simulation.history.environment'),
            cell: ({row}) => {
                const r = row.original;
                return (
                    <span className="tabular-nums text-slate-600">
                        {num(r.altitudeMeters)} m · {num(r.windSpeedMs, 1)} m/s ({num(r.windDirectionDeg)}°) · {num(r.timeScale)}x
                    </span>
                );
            },
        },
        {
            id: 'progress',
            accessorKey: 'distanceFlownMeters',
            header: t('simulation.history.progress'),
            cell: ({row}) => {
                const r = row.original;
                return (
                    <div className="tabular-nums text-slate-600">
                        <div>{r.waypointsReached}/{r.waypointCount} · {num(r.distanceFlownMeters)} m</div>
                        <div className="text-[11px] text-slate-400">
                            {num(r.startBatteryPct)}% → {r.endBatteryPct != null ? `${num(r.endBatteryPct)}%` : '—'}
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'status',
            accessorKey: 'status',
            header: t('simulation.history.status'),
            cell: ({row}) => {
                const r = row.original;
                return <StatusBadge status={r.status} label={t(`simulation.runStatus.${r.status}`)}/>;
            },
        },
        {
            id: 'outcome',
            accessorFn: r => r.outcomeSummary ?? '',
            header: t('simulation.history.outcome'),
            cell: ({row}) => (
                <span className="block max-w-xs text-slate-600">
                    {row.original.outcomeSummary ?? '—'}
                </span>
            ),
        },
    ], [t, num, formatDate]);

    const filters = useMemo<TableFilter[]>(() => [
        {
            column: 'status',
            label: t('simulation.history.status'),
            options: RUN_STATUSES.map(status => ({
                value: status,
                label: t(`simulation.runStatus.${status}`),
            })),
        },
    ], [t]);

    return (
        <Card>
            <CardHeader className="px-4 py-3">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <History size={16} className="text-uav-blue" aria-hidden="true"/>
                    {t('simulation.history.title')}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                {runs.length === 0 ? (
                    <EmptyState title={t('simulation.history.empty')}/>
                ) : (
                    <DataTable
                        data={runs}
                        columns={columns}
                        filters={filters}
                        label={t('simulation.history.title')}
                        pageSize={10}
                    />
                )}
            </CardContent>
        </Card>
    );
}
