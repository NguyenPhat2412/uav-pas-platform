'use client';
import Link from 'next/link';
import { useState } from 'react';
import { PageGuard } from '@/components/layout';
import { Button, Panel } from '@/components/ui';
import { useServices } from '@/features/customer/hooks';
import { DEMO_SERVICES } from '@/features/customer/service';

const SERVICE_META: Record<string, { sensor: string; sla: string; ceiling: string; badgeColor: string }> = {
  'SAR-01': { sensor: 'AI AMD KV260 + FLIR Thermal', sla: 'Phản ứng 15 phút', ceiling: '150m AGL', badgeColor: '#ab2523' },
  'MAP-02': { sensor: 'D-RTK 2 + Zenmuse P1 45MP', sla: 'GSD ≤ 2.0 cm/px', ceiling: '120m AGL', badgeColor: '#007f3e' },
  'AGRI-03': { sensor: 'Multispectral NDVI + Nhiệt', sla: 'Báo cáo trong 6h', ceiling: '100m AGL', badgeColor: '#007f3e' },
  'SEC-04': { sensor: 'Zoom Quang 30x + 5G WebRTC', sla: 'Streaming < 250ms', ceiling: '120m AGL', badgeColor: '#ab2523' },
  'ENV-05': { sensor: 'Quang phổ UV-VIS + Sampler', sla: 'Chuẩn ISO-14001', ceiling: '80m AGL', badgeColor: '#0284c7' },
  'LOG-06': { sensor: 'Tải trọng 5.5kg + Hộp lạnh', sla: 'Bán kính 25 km', ceiling: '110m AGL', badgeColor: '#d97706' },
};

export default function ServicesPage() {
  return (
    <PageGuard>
      <Services />
    </PageGuard>
  );
}

function Services() {
  const q = useServices();
  const [search, setSearch] = useState('');
  const list = q.data && q.data.length > 0 ? q.data : DEMO_SERVICES;
  const filtered = list.filter(
    s =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      (s.description ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Danh mục Dịch vụ UAV Chuyên dụng</h1>
          <p>Danh mục giải pháp bay không người lái VJU tích hợp trí tuệ nhân tạo tại biên và định vị RTK độ chính xác cao.</p>
        </div>
        <Link href="/missions/create">
          <Button>Đặt lịch bay tùy chỉnh</Button>
        </Link>
      </div>

      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <input
          aria-label="Tìm kiếm dịch vụ UAV"
          placeholder="Tìm theo mã dịch vụ (SAR-01, MAP-02...) hoặc tên nghiệp vụ..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: '1 1 320px',
            maxWidth: 460,
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            fontSize: 13.5,
          }}
        />
        <span className="muted" style={{ fontSize: 13 }}>
          Hiển thị <b>{filtered.length}</b> gói dịch vụ đang hoạt động
        </span>
      </div>

      <div className="grid grid-3">
        {filtered.map(service => {
          const meta = SERVICE_META[service.code] ?? {
            sensor: 'Tổ hợp cảm biến quang - nhiệt VJU',
            sla: 'Cam kết SLA 99.5%',
            ceiling: '120m AGL',
            badgeColor: '#ab2523',
          };
          return (
            <Panel key={service.id}>
              <div className="service-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '3px 9px',
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: 800,
                      color: meta.badgeColor,
                      background: `${meta.badgeColor}14`,
                      border: `1px solid ${meta.badgeColor}30`,
                    }}
                  >
                    {service.code}
                  </span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#007f3e', background: '#ecfdf5', padding: '3px 8px', borderRadius: 999 }}>
                    ● Sẵn sàng điều phối
                  </span>
                </div>

                <h3 style={{ margin: '6px 0 2px', fontSize: 16.5, lineHeight: 1.35, color: '#0f172a' }}>{service.name}</h3>
                <p className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>
                  {service.description || 'Dịch vụ UAV theo yêu cầu.'}
                </p>

                <div
                  style={{
                    marginTop: 8,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'grid',
                    gap: 6,
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted">Cảm biến / Tải trọng:</span>
                    <strong style={{ color: '#1e293b' }}>{meta.sensor}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted">Thời lượng tiêu chuẩn:</span>
                    <strong style={{ color: '#1e293b' }}>{service.defaultDurationMinutes} phút / ca bay</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted">Chỉ tiêu kỹ thuật:</span>
                    <strong style={{ color: '#007f3e' }}>{meta.sla}</strong>
                  </div>
                </div>

                <div className="spacer" />
                <div style={{ paddingTop: 10, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="muted" style={{ fontSize: 12 }}>Trần bay: {meta.ceiling}</span>
                  <Link href={`/missions/create?serviceId=${service.id}`} className="button-link" style={{ fontSize: 13.5 }}>
                    Đặt dịch vụ này →
                  </Link>
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
