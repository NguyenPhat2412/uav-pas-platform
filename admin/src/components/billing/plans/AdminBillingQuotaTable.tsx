'use client';

import React, {useMemo} from 'react';
import {Edit3, Users} from 'lucide-react';
import {
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
import type {UserQuota} from '@/types/admin';

type QuotaTableRow = UserQuota & {id: number};

export interface AdminBillingQuotaTableProps {
    quotas: UserQuota[];
    onEdit: (quota: UserQuota) => void;
}

export function AdminBillingQuotaTable({quotas, onEdit}: AdminBillingQuotaTableProps) {
    const {t} = useI18n();

    const rows = useMemo<QuotaTableRow[]>(
        () => quotas.map(q => ({...q, id: q.id ?? q.userId})),
        [quotas],
    );

    const columns = useMemo<TableColumn<QuotaTableRow>[]>(
        () => [
            {
                id: 'customer',
                accessorFn: row => `${row.fullName ?? ''} ${row.username}`,
                header: t('admin.billing.col.customer'),
                cell: ({row}) => (
                    <div>
                        <strong className="block font-semibold text-slate-900">
                            {row.original.fullName ?? row.original.username}
                        </strong>
                        <span className="text-[11px] tabular-nums text-slate-400">
                            @{row.original.username}
                        </span>
                    </div>
                ),
            },
            {
                id: 'planCode',
                accessorKey: 'planCode',
                header: t('admin.billing.col.plan'),
                cell: ({row}) => (
                    <Badge variant="primary" size="sm" className="tabular-nums">
                        {row.original.planCode}
                    </Badge>
                ),
            },
            {
                id: 'flightHoursLimit',
                accessorKey: 'flightHoursLimit',
                header: t('admin.billing.col.monthlyLimit'),
                cell: ({row}) => (
                    <span className="font-bold tabular-nums text-slate-800">
                        {t('admin.billing.hours', {hours: row.original.flightHoursLimit})}
                    </span>
                ),
            },
            {
                id: 'flightHoursUsed',
                accessorKey: 'flightHoursUsed',
                header: t('admin.billing.col.flown'),
                cell: ({row}) => (
                    <span className="tabular-nums text-slate-700">
                        {t('admin.billing.hours', {hours: row.original.flightHoursUsed})}
                    </span>
                ),
            },
            {
                id: 'usage',
                accessorFn: row =>
                    Math.round((row.flightHoursUsed / Math.max(row.flightHoursLimit, 0.01)) * 100),
                header: t('admin.billing.col.usage'),
                cell: ({row}) => {
                    const ratio = Math.round(
                        (row.original.flightHoursUsed /
                            Math.max(row.original.flightHoursLimit, 0.01)) *
                            100,
                    );
                    return (
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className={`h-full ${ratio > 85 ? 'bg-rose-500' : 'bg-blue-600'}`}
                                    style={{width: `${Math.min(100, ratio)}%`}}
                                />
                            </div>
                            <StatusBadge
                                status={ratio > 85 ? 'WARNING' : 'ACTIVE'}
                                label={`${ratio}%`}
                            />
                        </div>
                    );
                },
            },
            {
                id: 'concurrent',
                accessorKey: 'concurrentUavsUsed',
                header: t('admin.billing.col.concurrent'),
                cell: ({row}) => (
                    <span className="tabular-nums text-slate-700">
                        {row.original.concurrentUavsUsed} / {row.original.concurrentUavsLimit}
                    </span>
                ),
            },
            {
                id: 'actions',
                enableSorting: false,
                enableHiding: false,
                header: t('admin.billing.col.actions'),
                cell: ({row}) => (
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        leftIcon={<Edit3 size={12} />}
                        onClick={() => onEdit(row.original)}
                    >
                        {t('admin.billing.edit')}
                    </Button>
                ),
            },
        ],
        [onEdit, t],
    );

    return (
        <Card>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
                <Users size={16} className="shrink-0 text-primary" aria-hidden="true" />
                <CardTitle className="text-sm font-bold text-slate-900">
                    {t('admin.billing.quotasHeading')}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <DataTable
                    data={rows}
                    columns={columns}
                    label={t('admin.billing.dataTable')}
                    searchLabel={t('admin.billing.searchCustomer')}
                    pageSize={10}
                />
            </CardContent>
        </Card>
    );
}
