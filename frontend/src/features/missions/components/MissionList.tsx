'use client';

import Link from 'next/link';
import {RefreshCw} from 'lucide-react';
import {Button, Spinner} from '@/components/ui';
import {DataTable, options, type TableColumn} from '@/components/data/DataTable';
import {displayLabel} from "@/components/shared/presentation";
import {Mission} from "@/features/missions/types/mission.types";
import {MissionStatusBadge} from "@/features/missions/components/MissionStatusBadge";
import {toMissionSlug} from "@/lib/url-slugs";
import {useI18n} from '@/contexts/I18nContext';

/** Full-width mission table for the operations portal; search, sort, filters and paging run on the loaded list. */
export function MissionList({missions, loading, error, onRefresh, label, showCustomer = false}: {
    missions: Mission[];
    loading: boolean;
    error: string | null;
    onRefresh: () => void;
    label: string;
    showCustomer?: boolean;
}) {
    const {t, formatDate} = useI18n();
    const columns: TableColumn<Mission>[] = [
        {
            accessorKey: 'code',
            header: t('opsMissions.list.col.code'),
            cell: ({row}) => <Link href={`/operations/missions/${toMissionSlug(row.original)}`}
                                   className="whitespace-nowrap font-semibold text-primary hover:underline">{row.original.code}</Link>,
        },
        {
            accessorKey: 'title',
            header: t('opsMissions.list.col.title'),
            cell: ({row}) => <Link href={`/operations/missions/${toMissionSlug(row.original)}`}
                                   className="font-semibold text-slate-900 hover:text-primary">{row.original.title}</Link>,
        },
        ...(showCustomer ? [{
            accessorKey: 'customerName',
            header: t('opsMissions.list.col.customer'),
            cell: ({row}: { row: { original: Mission } }) => row.original.customerName || '—',
        }] : []),
        {
            accessorKey: 'startTime',
            header: t('opsMissions.list.col.start'),
            cell: ({row}) => <span className="whitespace-nowrap tabular-nums">{formatDate(row.original.startTime, {dateStyle: 'short', timeStyle: 'short'})}</span>,
        },
        {accessorKey: 'locationName', header: t('opsMissions.list.col.location')},
        {
            accessorKey: 'missionType',
            header: t('opsMissions.list.col.type'),
            cell: ({row}) => displayLabel(row.original.missionType),
            filterFn: 'equalsString',
        },
        {
            accessorKey: 'status',
            header: t('opsMissions.list.col.status'),
            cell: ({row}) => <MissionStatusBadge status={row.original.status}/>,
            filterFn: 'equalsString',
        },
    ];
    if (loading) return <div className="flex min-h-48 items-center justify-center rounded-panel border border-border bg-card"><Spinner size="lg"/></div>;
    if (error) return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-rose-200 bg-rose-50 p-4 text-sm text-danger">
        <span>{error}</span>
        <Button size="sm" variant="outline" onClick={onRefresh} leftIcon={<RefreshCw size={15}/>}>{t('opsMissions.list.refresh')}</Button>
    </div>;
    return <DataTable label={label} data={missions} columns={columns} searchLabel={t('opsMissions.list.search')}
                      filters={[
                          {column: 'status', label: t('opsMissions.list.col.status'), options: options(missions.map(m => m.status))},
                          {column: 'missionType', label: t('opsMissions.list.col.type'), options: options(missions.map(m => m.missionType))},
                      ]}
                      actions={<Button size="sm" variant="outline" onClick={onRefresh} leftIcon={<RefreshCw size={15}/>}>{t('opsMissions.list.refresh')}</Button>}/>;
}
