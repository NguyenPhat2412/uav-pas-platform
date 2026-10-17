'use client';
import { displayLabel } from '@uav/ui/presentation';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useAdminReferenceData } from '../hooks';
import { QueryState, EmptyState } from '@/components/data/WorkspaceState';

export function Registry() {
  const { permissions } = useAdminReferenceData();
  const [filter, setFilter] = useState('');
  const rows = permissions.data?.filter(p => (p.code + ' ' + p.description).toLowerCase().includes(filter.toLowerCase()));
  return <div className="data-table">
    <div className="table-toolbar">
      <label className="table-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Tìm quyền</span><input placeholder="Mã quyền hoặc mô tả" value={filter} onChange={e => setFilter(e.target.value)} /></label>
      {permissions.data && <span className="table-result-count" role="status">{rows?.length ?? 0} quyền</span>}
    </div>
    <QueryState query={permissions}>{rows?.length ? <div className="table-scroll" tabIndex={0} aria-label="Danh mục quyền"><table className="console-table">
      <thead><tr><th>Mã quyền</th><th>Nhóm chức năng</th><th>Mô tả</th><th>Hỗ trợ</th></tr></thead>
      <tbody>{rows.map(p => <tr key={p.code}><td className="table-primary">{p.code}</td><td>{displayLabel(p.code.split('_')[0])}</td><td>{p.description}</td><td>Đang hỗ trợ</td></tr>)}</tbody>
    </table></div> : <EmptyState title="Không tìm thấy quyền" detail="Thử tìm bằng mã quyền hoặc một phần mô tả khác." />}</QueryState>
  </div>;
}
