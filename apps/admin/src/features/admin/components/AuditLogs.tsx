'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { displayLabel, formatDate, auditDetail } from '@uav/ui/presentation';
import { useAuth } from '@/contexts/AuthContext';
import { adminService } from '../services/admin.service';
import { QueryState, EmptyState } from '@/components/data/WorkspaceState';
import { Pagination } from './Pagination';
export function AuditLogs() {
  const { user, can, permissionsReady } = useAuth();
  const [page, setPage] = useState(0); const [search, setSearch] = useState('');
  const q = useQuery({ queryKey: ['session', user?.id, 'admin-audit', page], queryFn: ({signal}) => adminService.audit(page,25,signal), enabled: permissionsReady && can('AUDIT_READ') });
  const rows = (q.data?.content ?? []).filter(log => [log.actorUsername, displayLabel(log.action), displayLabel(log.entityType), log.entityId, auditDetail(log.details)].join(' ').toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')));
  return <div className="data-table audit-table">
    <div className="audit-toolbar"><label htmlFor="audit-search">Tìm trong trang hiện tại<input id="audit-search" type="search" placeholder="Người thực hiện, thao tác hoặc mã đối tượng" value={search} onChange={e => setSearch(e.target.value)} /></label><span aria-live="polite">{rows.length} / {q.data?.content.length ?? 0} bản ghi trên trang</span></div>
    <QueryState query={q}>{q.data?.content.length ? <>
      {rows.length ? <div className="table-scroll" tabIndex={0} aria-label="Nhật ký quản trị"><table className="console-table"><thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Thao tác</th><th>Đối tượng</th><th>Mã</th><th>Nội dung</th></tr></thead><tbody>{rows.map(log => <tr key={log.id}>
        <td data-label="Thời gian"><time dateTime={log.createdAt}>{formatDate(log.createdAt)}</time></td>
        <td data-label="Người thực hiện"><span className="table-primary">{log.actorUsername || 'Hệ thống'}</span></td>
        <td data-label="Thao tác"><span className="audit-action">{displayLabel(log.action)}</span></td>
        <td data-label="Đối tượng">{displayLabel(log.entityType)}</td><td data-label="Mã">{log.entityId}</td>
        <td data-label="Nội dung" className="audit-details">{auditDetail(log.details)}</td>
      </tr>)}</tbody></table></div> : <EmptyState title="Không có kết quả trên trang này" detail="Thử từ khóa khác hoặc chuyển sang trang tiếp theo." />}
      <Pagination page={page} totalPages={q.data.totalPages} total={q.data.totalElements} onChange={setPage} />
    </> : <EmptyState title="Chưa có nhật ký hoạt động" />}</QueryState>
  </div>;
}
