'use client';
import { useCollection } from "@/hooks/useCollections";
import type { AuditLog } from "@/types/resources";
import { DataTable, options } from '@/components/data/DataTable';
import { QueryState } from '@/components/data/WorkspaceState';
import { auditDetail, displayLabel } from "@/components/shared/presentation";
export function AuditPanel() {
  const query = useCollection('audit');
  const rows = query.data || [];
  const columns = [
    { accessorKey: 'createdAt', header: 'Thời gian', cell: ({ row }: { row: { original: AuditLog } }) => row.original.createdAt ? new Date(row.original.createdAt).toLocaleString('vi-VN') : '—' },
    { accessorKey: 'actorUsername', header: 'Người thực hiện', cell: ({ row }: { row: { original: AuditLog } }) => row.original.actorUsername || '—' },
    { id: 'action', accessorFn: (row: AuditLog) => `${row.action} ${displayLabel(row.action)}`, header: 'Hành động', cell: ({ row }: { row: { original: AuditLog } }) => displayLabel(row.original.action) },
    { id: 'entityType', accessorFn: (row: AuditLog) => `${row.entityType} ${displayLabel(row.entityType)} ${row.entityId || ''}`, header: 'Đối tượng', cell: ({ row }: { row: { original: AuditLog } }) => displayLabel(row.original.entityType) + ' ' + (row.original.entityId || '') },
    { id: 'details', accessorFn: (row: AuditLog) => `${row.details || ''} ${auditDetail(row.details)}`, header: 'Chi tiết', cell: ({ row }: { row: { original: AuditLog } }) => auditDetail(row.original.details) },
  ];
  return <QueryState query={query}><DataTable label="Nhật ký hoạt động" data={rows} columns={columns} filters={[{ column: 'action', label: 'Hành động', options: options(rows.map(row => row.action)) }, { column: 'entityType', label: 'Đối tượng', options: options(rows.map(row => row.entityType)) }]} /></QueryState>;
}
