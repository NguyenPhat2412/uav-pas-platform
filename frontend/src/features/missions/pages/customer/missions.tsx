'use client';
import Link from 'next/link';
import { useState } from 'react';
import { displayLabel, formatDate } from "@/components/shared/presentation";
import { PageGuard } from "@/components/customer/layout";
import { Button, Panel, Status } from "@/components/customer/ui";
import { useAuth } from '@/contexts/AuthContext';
import { useMissions } from "@/lib/query/customer";
import { missionListFilters, missionPageRange, missionStatuses } from "@/features/missions/forms/mission-form";
import type { MissionStatus } from "@/types/customer";

export default function MissionsPage() { return <PageGuard><Missions /></PageGuard>; }
function Missions() {
  const [filters, setFilters] = useState(missionListFilters('', ''));
  const { can } = useAuth();
  const query = useMissions(filters.search.trim(), filters.page, filters.status || undefined);
  const page = query.data;
  const range = page ? missionPageRange(page) : undefined;
  return <>
    <div className="page-heading"><div><h1>Nhiệm vụ của tôi</h1><p>Theo dõi tiến độ và kết quả các nhiệm vụ của bạn.</p></div>{can('MISSION_CREATE') && <Link className="button button-primary" href="/customer/missions/create">Tạo nhiệm vụ</Link>}</div>
    <Panel>
      <div className="filter-row">
        <label className="field"><span>Tìm nhiệm vụ</span><input aria-label="Tìm nhiệm vụ" placeholder="Tìm theo mã hoặc tiêu đề" value={filters.search} onChange={event => setFilters(missionListFilters(event.target.value, filters.status))} /></label>
        <label className="field"><span>Trạng thái</span><select value={filters.status} onChange={event => setFilters(missionListFilters(filters.search, event.target.value as MissionStatus | ''))}><option value="">Tất cả trạng thái</option>{missionStatuses.map(status => <option key={status} value={status}>{displayLabel(status)}</option>)}</select></label>
        {(filters.search || filters.status) && <Button variant="secondary" onClick={() => setFilters(missionListFilters('', ''))}>Xóa bộ lọc</Button>}
      </div>
      {query.isError ? <div className="error" role="alert">Không thể tải nhiệm vụ. <Button variant="secondary" onClick={() => void query.refetch()}>Thử lại</Button></div>
        : query.isLoading ? <div className="empty" role="status">Đang tải nhiệm vụ…</div>
        : <>
          {!!range?.total && <p className="muted" role="status">Hiển thị {range.first}–{range.last} / {range.total} nhiệm vụ</p>}
          {page?.content.length ? <div className="table-wrap"><table className="table"><thead><tr><th>Mã</th><th>Tiêu đề</th><th>Thời gian</th><th>Trạng thái</th></tr></thead><tbody>{page.content.map(mission => <tr key={mission.id}>
            <td data-label="Mã"><Link href={`/customer/missions/${mission.id}`} className="button-link">{mission.code}</Link></td><td data-label="Tiêu đề">{mission.title}</td><td data-label="Thời gian">{formatDate(mission.startTime)}</td><td data-label="Trạng thái"><Status value={mission.status} /></td>
          </tr>)}</tbody></table></div> : <div className="empty">{filters.page > 0 ? 'Trang này không còn nhiệm vụ. Hãy quay lại trang trước hoặc tải lại từ đầu.' : filters.search || filters.status ? 'Không tìm thấy nhiệm vụ theo bộ lọc đã chọn.' : 'Bạn chưa có nhiệm vụ. Tạo yêu cầu đầu tiên để bắt đầu.'}</div>}
          {page && (page.totalPages > 1 || filters.page > 0) && <nav className="pagination" aria-label="Phân trang nhiệm vụ">
            <Button variant="secondary" disabled={filters.page === 0 || query.isFetching} onClick={() => setFilters(value => ({ ...value, page: Math.max(0, value.page - 1) }))}>Trang trước</Button>
            <span aria-live="polite">Trang {page.page + 1} / {Math.max(page.totalPages, page.page + 1)}</span>
            <Button variant="secondary" disabled={!page.hasNext || query.isFetching} onClick={() => setFilters(value => ({ ...value, page: value.page + 1 }))}>Trang sau</Button>
            {!page.content.length && filters.page > 0 && <Button variant="secondary" onClick={() => setFilters(value => ({ ...value, page: 0 }))}>Về trang đầu</Button>}
          </nav>}
        </>}
    </Panel>
  </>;
}
