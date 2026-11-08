'use client';

import React, {useMemo} from 'react';
import {AlertTriangle, Wrench} from 'lucide-react';
import {
    Alert,
    Badge,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    StatusBadge,
} from '@/components/ui';
import {DataTable, type TableColumn} from '@/components/data/DataTable';
import {useI18n} from '@/providers/I18nContext';
import type {UavMaintenanceRiskRow} from '@/types/admin';

type MaintenanceRiskTableRow = UavMaintenanceRiskRow & {id: number};

export interface SlaMaintenanceRiskTableProps {
    risks: UavMaintenanceRiskRow[];
    overdueCount: number;
    dueSoonCount: number;
    canManageMaintenance: boolean;
    creatingUavId: number | null;
    feedback: {tone: 'info' | 'error'; text: string} | null;
    onCreatePreventiveOrder: (row: UavMaintenanceRiskRow) => void;
}

export function SlaMaintenanceRiskTable({
    risks,
    overdueCount,
    dueSoonCount,
    canManageMaintenance,
    creatingUavId,
    feedback,
    onCreatePreventiveOrder,
}: SlaMaintenanceRiskTableProps) {
    const {t, formatNumber} = useI18n();

    const rows = useMemo<MaintenanceRiskTableRow[]>(
        () => risks.map(r => ({...r, id: r.uavId})),
        [risks],
    );

    const columns = useMemo<TableColumn<MaintenanceRiskTableRow>[]>(
        () => [
            {
                id: 'uav',
                accessorFn: row => `${row.serialNumber} ${row.model} ${row.stationName ?? ''}`,
                header: t('capabilities.sla.uavCols.uav'),
                cell: ({row}) => (
                    <div>
                        <div className="font-mono text-xs font-bold text-slate-900">
                            {row.original.serialNumber}
                        </div>
                        <div className="text-[11px] text-slate-500">
                            {row.original.model}
                            {row.original.stationName ? ` · ${row.original.stationName}` : ''}
                        </div>
                    </div>
                ),
            },
            {
                id: 'usage',
                accessorKey: 'flightHoursSinceMaintenance',
                header: t('capabilities.sla.uavCols.usage'),
                cell: ({row}) => (
                    <span className="tabular-nums text-slate-700">
                        {t('capabilities.sla.missionsHours', {
                            missions: row.original.missionsSinceMaintenance,
                            hours: formatNumber(row.original.flightHoursSinceMaintenance, {
                                maximumFractionDigits: 1,
                            }),
                        })}
                    </span>
                ),
            },
            {
                id: 'telemetry',
                accessorFn: row => row.latestBatteryPct ?? -1,
                header: t('capabilities.sla.uavCols.telemetry'),
                cell: ({row}) => (
                    <div className="tabular-nums text-slate-700">
                        <div>
                            {row.original.latestBatteryPct != null
                                ? t('capabilities.smartDispatch.batteryPct', {
                                      pct: row.original.latestBatteryPct,
                                  })
                                : '—'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                            {row.original.daysSinceMaintenance != null
                                ? t('capabilities.sla.daysAgo', {days: row.original.daysSinceMaintenance})
                                : t('capabilities.sla.neverMaintained')}
                        </div>
                    </div>
                ),
            },
            {
                id: 'risk',
                accessorKey: 'riskScore',
                header: t('capabilities.sla.uavCols.risk'),
                cell: ({row}) => {
                    const raw = row.original.riskLevel;
                    const riskKey =
                        raw === 'OVERDUE' || raw === 'DUE_SOON' || raw === 'NORMAL' ? raw : 'NORMAL';
                    const badgeStatus = riskKey === 'NORMAL' ? 'AVAILABLE' : riskKey;
                    return (
                        <div>
                            <StatusBadge
                                status={badgeStatus}
                                label={`${t(`capabilities.sla.riskLevels.${riskKey}`)} · ${row.original.riskScore}`}
                            />
                            <div className="mt-1 max-w-xs text-[11px] text-slate-600">
                                {row.original.recommendation}
                            </div>
                        </div>
                    );
                },
            },
            {
                id: 'action',
                enableSorting: false,
                enableHiding: false,
                header: t('capabilities.sla.uavCols.action'),
                cell: ({row}) => {
                    const item = row.original;
                    if (item.hasOpenRepairOrder) {
                        return <Badge variant="default">{t('capabilities.sla.openOrderExists')}</Badge>;
                    }
                    if (item.riskLevel !== 'NORMAL' && canManageMaintenance) {
                        return (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                isLoading={creatingUavId === item.uavId}
                                disabled={creatingUavId !== null}
                                onClick={() => onCreatePreventiveOrder(item)}
                            >
                                {creatingUavId === item.uavId
                                    ? t('capabilities.sla.creatingOrder')
                                    : t('capabilities.sla.createPreventiveOrder')}
                            </Button>
                        );
                    }
                    return <span className="text-[11px] text-slate-400">—</span>;
                },
            },
        ],
        [canManageMaintenance, creatingUavId, formatNumber, onCreatePreventiveOrder, t],
    );

    return (
        <Card>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                <div className="flex items-center gap-2">
                    <Wrench size={16} className="shrink-0 text-primary" aria-hidden="true" />
                    <CardTitle className="text-sm font-bold text-slate-900">
                        {t('capabilities.sla.riskTitle')}
                    </CardTitle>
                </div>
                <Badge
                    variant="warning"
                    icon={<AlertTriangle size={12} className="shrink-0" aria-hidden="true" />}
                >
                    {t('capabilities.sla.riskSummary', {
                        overdue: overdueCount,
                        dueSoon: dueSoonCount,
                    })}
                </Badge>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
                {feedback && (
                    <Alert variant={feedback.tone === 'error' ? 'error' : 'success'}>
                        {feedback.text}
                    </Alert>
                )}
                <DataTable
                    data={rows}
                    columns={columns}
                    label={t('capabilities.sla.riskTitle')}
                    pageSize={10}
                />
            </CardContent>
        </Card>
    );
}
