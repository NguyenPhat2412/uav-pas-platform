'use client';
import Link from 'next/link';
import { useState } from 'react';
import { PageGuard } from '@/components/layout';
import { Button, Panel, Status } from '@/components/ui';
import { useMissions } from '@/features/customer/hooks';
import { DEMO_CUSTOMER_MISSIONS } from '@/features/customer/service';
import type { MissionStatus } from '@/features/customer/types';

export default function MissionsPage() {
  return (
    <PageGuard>
      <Missions />
    </PageGuard>
  );
}

function Missions() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MissionStatus | ''>('');
  const q = useMissions(search, 0, statusFilter || undefined);

  const rawRows = q.data?.content?.length ? q.data.content : DEMO_CUSTOMER_MISSIONS.content;
  const rows = rawRows.filter(m => {
    const matchSearch =
      !search ||
      m.code.toLowerCase().includes(search.toLowerCase()) ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.locationName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Mission của tôi</h1>
          <p>Danh sách các yêu cầu bay, tiến độ phê duyệt vùng trời và kết quả thu thập dữ liệu thuộc phạm vi tài khoản.</p>
        </div>
        <Link href="/missions/create">
          <Button>+ Tạo mission mới</Button>
        </Link>
      </div>

      <Panel
        title={`Danh sách nhiệm vụ (${rows.length})`}
        action={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['', 'IN_PROGRESS', 'PENDING_CONFIRMATION', 'COMPLETED', 'DRAFT'] as const).map(st => (
              <button
                key={st || 'ALL'}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={{
                  border: statusFilter === st ? '1px solid #ab2523' : '1px solid #e2e8f0',
                  background: statusFilter === st ? 'rgba(171, 37, 35, 0.08)' : '#ffffff',
                  color: statusFilter === st ? '#ab2523' : '#475569',
                  padding: '5px 10px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {st === ''
                  ? 'Tất cả'
                  : st === 'IN_PROGRESS'
                    ? 'Đang bay'
                    : st === 'PENDING_CONFIRMATION'
                      ? 'Chờ duyệt'
                      : st === 'COMPLETED'
                        ? 'Hoàn thành'
                        : 'Bản nháp'}
              </button>
            ))}
          </div>
        }
      >
        <div className="table-wrap">
          <div style={{ paddingBottom: 16 }}>
            <input
              aria-label="Tìm mission"
              className="field"
              style={{
                display: 'block',
                width: '100%',
                maxWidth: 420,
                padding: '9px 13px',
                borderRadius: 9,
                border: '1px solid #cbd5e1',
              }}
              placeholder="Tìm theo mã (MS-2026...), tiêu đề hoặc địa điểm..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {rows.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Mã nhiệm vụ</th>
                  <th>Tiêu đề &amp; Nghiệp vụ</th>
                  <th>Khu vực hoạt động</th>
                  <th>Thời gian dự kiến</th>
                  <th>Mức ưu tiên</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(m => (
                  <tr key={m.id}>
                    <td>
                      <Link href={`/missions/${m.id}`} className="button-link">
                        {m.code}
                      </Link>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{m.title}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {m.missionType}
                      </div>
                    </td>
                    <td>{m.locationName}</td>
                    <td>{new Date(m.startTime).toLocaleString('vi-VN')}</td>
                    <td>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: m.priority === 'URGENT' || m.priority === 'HIGH' ? '#ab2523' : '#475569',
                        }}
                      >
                        {m.priority}
                      </span>
                    </td>
                    <td>
                      <Status value={m.status} />
                    </td>
                    <td>
                      <Link href={`/missions/${m.id}`} className="button-link" style={{ fontSize: 13 }}>
                        Chi tiết →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">Bạn chưa có mission phù hợp với bộ lọc hiện tại.</div>
          )}
        </div>
      </Panel>
    </>
  );
}
