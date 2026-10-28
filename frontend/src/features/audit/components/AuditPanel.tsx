'use client';
import {useCollection} from '@/lib/query/operations';
import type {AuditLog} from "@/types/resources";
import {DataTable, options} from '@/components/data/DataTable';
import {QueryState} from '@/components/data/WorkspaceState';
import {auditDetail, displayLabel} from "@/components/shared/presentation";
import {useI18n} from '@/contexts/I18nContext';

export function AuditPanel() {
    const {t, formatDate} = useI18n();
    const query = useCollection('audit');
    const rows = query.data || [];
    const columns = [
        {
            accessorKey: 'createdAt',
            header: t('opsAssets.audit.time'),
            cell: ({row}: {
                row: { original: AuditLog }
            }) => row.original.createdAt ? formatDate(row.original.createdAt, {dateStyle: 'short', timeStyle: 'medium'}) : '—'
        },
        {
            accessorKey: 'actorUsername',
            header: t('opsAssets.audit.actor'),
            cell: ({row}: { row: { original: AuditLog } }) => row.original.actorUsername || '—'
        },
        {
            id: 'action',
            accessorFn: (row: AuditLog) => `${row.action} ${displayLabel(row.action)}`,
            header: t('opsAssets.audit.action'),
            cell: ({row}: { row: { original: AuditLog } }) => displayLabel(row.original.action)
        },
        {
            id: 'entityType',
            accessorFn: (row: AuditLog) => `${row.entityType} ${displayLabel(row.entityType)} ${row.entityId || ''}`,
            header: t('opsAssets.audit.entity'),
            cell: ({row}: {
                row: { original: AuditLog }
            }) => displayLabel(row.original.entityType) + ' ' + (row.original.entityId || '')
        },
        {
            id: 'details',
            accessorFn: (row: AuditLog) => `${row.details || ''} ${auditDetail(row.details)}`,
            header: t('opsAssets.audit.details'),
            cell: ({row}: { row: { original: AuditLog } }) => auditDetail(row.original.details)
        },
    ];
    return <QueryState query={query}><DataTable label={t('opsAssets.audit.tableLabel')} data={rows} columns={columns} filters={[{
        column: 'action',
        label: t('opsAssets.audit.action'),
        options: options(rows.map(row => row.action))
    }, {column: 'entityType', label: t('opsAssets.audit.entity'), options: options(rows.map(row => row.entityType))}]}/></QueryState>;
}
