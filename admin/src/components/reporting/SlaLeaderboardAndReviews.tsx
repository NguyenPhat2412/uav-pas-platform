'use client';

import React, {useMemo} from 'react';
import {Award, Star} from 'lucide-react';
import {
    Badge,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    StatusBadge,
} from '@/components/ui';
import {DataTable, type TableColumn} from '@/components/data/DataTable';
import {EmptyState} from '@/components/data/WorkspaceState';
import {useI18n} from '@/providers/I18nContext';
import type {CustomerReviewRow, OperatorSlaRow} from '@/types/admin';

type OperatorLeaderboardRow = OperatorSlaRow & {id: number};

export interface SlaLeaderboardAndReviewsProps {
    operators: OperatorSlaRow[];
    reviews: CustomerReviewRow[];
}

export function SlaLeaderboardAndReviews({
    operators,
    reviews,
}: SlaLeaderboardAndReviewsProps) {
    const {t, formatNumber, formatDate} = useI18n();

    const rows = useMemo<OperatorLeaderboardRow[]>(
        () => operators.map(op => ({...op, id: op.operatorId})),
        [operators],
    );

    const columns = useMemo<TableColumn<OperatorLeaderboardRow>[]>(
        () => [
            {
                id: 'operator',
                accessorFn: row => `${row.fullName} ${row.username}`,
                header: t('capabilities.sla.cols.operator'),
                cell: ({row}) => (
                    <div>
                        <div className="font-semibold text-slate-900">{row.original.fullName}</div>
                        <div className="font-mono text-[11px] text-slate-500">@{row.original.username}</div>
                    </div>
                ),
            },
            {
                id: 'completedMissions',
                accessorKey: 'completedMissions',
                header: t('capabilities.sla.cols.completed'),
                cell: ({row}) => (
                    <span className="font-semibold tabular-nums text-slate-800">
                        {row.original.completedMissions}
                    </span>
                ),
            },
            {
                id: 'totalFlightHours',
                accessorKey: 'totalFlightHours',
                header: t('capabilities.sla.cols.hours'),
                cell: ({row}) => (
                    <span className="tabular-nums text-slate-700">
                        {formatNumber(row.original.totalFlightHours, {maximumFractionDigits: 1})}h
                    </span>
                ),
            },
            {
                id: 'onTimeRate',
                accessorKey: 'onTimeRate',
                header: t('capabilities.sla.cols.onTime'),
                cell: ({row}) => (
                    <span className="tabular-nums text-slate-700">
                        {formatNumber(row.original.onTimeRate, {maximumFractionDigits: 0})}%
                    </span>
                ),
            },
            {
                id: 'preflightComplianceRate',
                accessorKey: 'preflightComplianceRate',
                header: t('capabilities.sla.cols.preflight'),
                cell: ({row}) => (
                    <span className="tabular-nums text-slate-700">
                        {formatNumber(row.original.preflightComplianceRate, {maximumFractionDigits: 0})}%
                    </span>
                ),
            },
            {
                id: 'avgRating',
                accessorFn: row => row.avgRating ?? -1,
                header: t('capabilities.sla.cols.rating'),
                cell: ({row}) =>
                    row.original.avgRating != null ? (
                        <Badge variant="warning" size="sm" className="tabular-nums">
                            ★ {formatNumber(row.original.avgRating, {minimumFractionDigits: 1, maximumFractionDigits: 1})}
                        </Badge>
                    ) : (
                        <span className="text-slate-400">—</span>
                    ),
            },
        ],
        [formatNumber, t],
    );

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
                <CardHeader className="flex-row items-center gap-2 space-y-0">
                    <Award size={16} className="shrink-0 text-primary" aria-hidden="true" />
                    <CardTitle className="text-sm font-bold text-slate-900">
                        {t('capabilities.sla.leaderboardTitle')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    {rows.length === 0 ? (
                        <EmptyState title={t('capabilities.sla.leaderboardEmpty')} />
                    ) : (
                        <DataTable
                            data={rows}
                            columns={columns}
                            label={t('capabilities.sla.leaderboardTitle')}
                            pageSize={5}
                        />
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex-row items-center gap-2 space-y-0">
                    <Star size={16} className="shrink-0 text-amber-500" aria-hidden="true" />
                    <CardTitle className="text-sm font-bold text-slate-900">
                        {t('capabilities.sla.recentReviewsTitle')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    {reviews.length === 0 ? (
                        <EmptyState title={t('capabilities.sla.recentReviewsEmpty')} />
                    ) : (
                        <div className="space-y-2.5">
                            {reviews.map(rev => (
                                <Card key={rev.reviewId} className="bg-slate-50/70 p-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <span className="font-mono text-[11px] font-bold text-slate-600">
                                                {rev.missionCode ?? `#${rev.missionId ?? rev.reviewId}`}
                                            </span>
                                            {rev.missionTitle && (
                                                <span className="ml-2 text-xs font-semibold text-slate-900">
                                                    {rev.missionTitle}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <StatusBadge
                                                status={rev.deliverablesAccepted ? 'APPROVED' : 'PENDING'}
                                                label={
                                                    rev.deliverablesAccepted
                                                        ? t('capabilities.review.acceptedBadge')
                                                        : t('capabilities.review.pendingBadge')
                                                }
                                            />
                                            <Badge variant="warning" size="sm" className="tabular-nums">
                                                ★ {rev.overallRating}/5
                                            </Badge>
                                        </div>
                                    </div>
                                    {rev.comment && (
                                        <p className="m-0 mt-1.5 text-xs text-slate-700">{rev.comment}</p>
                                    )}
                                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                                        <span>{rev.customerName ?? '—'}</span>
                                        {rev.updatedAt && <span>{formatDate(rev.updatedAt)}</span>}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
