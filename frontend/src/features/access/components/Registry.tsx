'use client';
import { displayLabel, permissionLabel } from "@/components/shared/presentation";
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useAdminReferenceData } from "@/lib/query/admin";
import { QueryState, EmptyState } from "@/components/admin/data/WorkspaceState";

export function Registry() {
  const { permissions } = useAdminReferenceData();
  const [filter, setFilter] = useState('');
  const rows = permissions.data?.filter(p => (p.code + ' ' + permissionLabel(p.code, p.description)).toLowerCase().includes(filter.toLowerCase()));
  return <div className="data-table portal-responsive-table">
    <div className="table-toolbar">
      <label className="table-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Tìm quyền</span><input placeholder="Mã quyền hoặc mô tả" value={filter} onChange={e => setFilter(e.target.value)} /></label>
      {permissions.data && <span className="table-result-count" role="status">{rows?.length ?? 0} quyền</span>}
    </div>
    <QueryState query={permissions}>{rows?.length ? <div className="table-scroll" tabIndex={0} aria-label="Danh mục quyền"><table className="console-table">
      <thead><tr><th>Quyền truy cập</th><th>Nhóm chức năng</th><th>Hỗ trợ</th></tr></thead>
      <tbody>{rows.map(p => <tr key={p.code}><td data-label="Quyền"><strong className="table-primary">{permissionLabel(p.code, p.description)}</strong><span className="table-secondary">{p.code}</span></td><td data-label="Nhóm">{displayLabel(p.code.split('_')[0])}</td><td data-label="Hỗ trợ">Đang hỗ trợ</td></tr>)}</tbody>
    </table></div> : <EmptyState title="Không tìm thấy quyền" detail="Thử tìm bằng mã quyền hoặc một phần mô tả khác." />}</QueryState>
  </div>;
}
