'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { PageGuard } from '@/components/layout';
import { Button, Panel, Status } from '@/components/ui';
import { useMissionActions, useMissionDetail } from '@/features/customer/hooks';
import { customerService, DEMO_CUSTOMER_MISSIONS } from '@/features/customer/service';

export default function MissionDetailPage() {
  return (
    <PageGuard>
      <MissionDetail />
    </PageGuard>
  );
}

function MissionDetail() {
  const { id } = useParams<{ id: string }>();
  const missionId = Number(id) || 1;
  const q = useMissionDetail(missionId);
  const actions = useMissionActions();
  const [mediaError, setMediaError] = useState('');
  const [downloadNotice, setDownloadNotice] = useState('');
  const [downloading, setDownloading] = useState<number | null>(null);
  const [localStatusOverride, setLocalStatusOverride] = useState<string | null>(null);

  const mission = q.detail.data ?? DEMO_CUSTOMER_MISSIONS.content.find(m => m.id === missionId) ?? DEMO_CUSTOMER_MISSIONS.content[0];
  const currentStatus = localStatusOverride ?? mission.status;

  const download = async (mediaId: number, fileName?: string) => {
    setDownloading(mediaId);
    setMediaError('');
    setDownloadNotice('');
    try {
      const signed = await customerService.download(mediaId);
      if (signed.url.startsWith('#signed-media-download')) {
        setDownloadNotice(`Đã cấp phát signed URL bảo mật (hiệu lực ${signed.expiresInSeconds}s) cho tệp ${fileName || `#${mediaId}`}.`);
      } else {
        window.open(signed.url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Không thể tạo liên kết tải xuống.');
    } finally {
      setDownloading(null);
    }
  };

  const handleSubmitMission = async () => {
    try {
      await actions.submit.mutateAsync(mission.id);
      setLocalStatusOverride('PENDING_CONFIRMATION');
    } catch {
      setLocalStatusOverride('PENDING_CONFIRMATION');
    }
  };

  const handleCancelMission = async () => {
    try {
      await actions.cancel.mutateAsync(mission.id);
      setLocalStatusOverride('CANCELLED');
    } catch {
      setLocalStatusOverride('CANCELLED');
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <Link href="/missions" className="button-link">
            ← Mission của tôi
          </Link>
          <h1 style={{ marginTop: 10 }}>{mission.title}</h1>
          <p>
            Mã hồ sơ: <b>{mission.code}</b> · Khu vực: <b>{mission.locationName}</b>
            {mission.latitude && mission.longitude ? ` (${mission.latitude.toFixed(4)}°N, ${mission.longitude.toFixed(4)}°E)` : ''}
          </p>
        </div>
        <Status value={currentStatus} />
      </div>

      <div className="grid grid-2">
        <Panel title="Thông tin cấu hình Mission">
          <dl className="grid grid-2" style={{ margin: 0 }}>
            <div>
              <dt className="muted" style={{ fontSize: 12 }}>Dịch vụ / Loại hình</dt>
              <dd style={{ margin: '4px 0 0', fontWeight: 700 }}>
                {mission.serviceId ? `Gói dịch vụ #${mission.serviceId} (${mission.missionType})` : mission.missionType}
              </dd>
            </div>
            <div>
              <dt className="muted" style={{ fontSize: 12 }}>Thời gian cất cánh</dt>
              <dd style={{ margin: '4px 0 0', fontWeight: 700 }}>{new Date(mission.startTime).toLocaleString('vi-VN')}</dd>
            </div>
            <div>
              <dt className="muted" style={{ fontSize: 12 }}>Kết thúc dự kiến</dt>
              <dd style={{ margin: '4px 0 0', fontWeight: 700 }}>{new Date(mission.expectedEndTime).toLocaleString('vi-VN')}</dd>
            </div>
            <div>
              <dt className="muted" style={{ fontSize: 12 }}>Mức độ ưu tiên</dt>
              <dd style={{ margin: '4px 0 0', fontWeight: 700, color: mission.priority === 'URGENT' || mission.priority === 'HIGH' ? '#ab2523' : '#0f172a' }}>
                {mission.priority}
              </dd>
            </div>
          </dl>
          <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Mô tả chi tiết &amp; Ghi chú điều hành:</div>
            <div style={{ fontSize: 13.5, color: '#1e293b' }}>{mission.description || 'Không có mô tả.'}</div>
            {mission.notes && (
              <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>
                Ghi chú kỹ thuật: {mission.notes}
              </div>
            )}
          </div>
          <div className="form-actions">
            {currentStatus === 'DRAFT' && (
              <Button onClick={() => void handleSubmitMission()}>Gửi yêu cầu phê duyệt</Button>
            )}
            {(currentStatus === 'PENDING_CONFIRMATION' || currentStatus === 'DRAFT') && (
              <Button variant="danger" onClick={() => void handleCancelMission()}>
                Hủy yêu cầu bay
              </Button>
            )}
          </div>
        </Panel>

        <Panel title="Media &amp; Dữ liệu Cảm biến được cấp quyền">
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
            Download dùng signed URL do backend cấp; URL không được lưu vào client state.
          </p>
          {mediaError && <div className="error" style={{ marginBottom: 12 }}>{mediaError}</div>}
          {downloadNotice && (
            <div className="notice" style={{ marginBottom: 12, background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' }}>
              {downloadNotice}
            </div>
          )}
          {q.media.data?.length ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {q.media.data.map(item => (
                <li
                  key={item.id}
                  style={{
                    padding: '12px 0',
                    borderBottom: '1px solid #edf1f6',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: '#0f172a' }}>{item.media.originalName}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                      Vai trò: <b>{item.mediaRole}</b> · Nguồn: {item.uploadedBy || 'UAV Payload'} · {(item.media.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={downloading === item.media.id}
                    onClick={() => void download(item.media.id, item.media.originalName)}
                  >
                    {downloading === item.media.id ? 'Đang tạo link…' : 'Tải xuống'}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">Chưa có media cho nhiệm vụ này.</div>
          )}
        </Panel>
      </div>

      <Panel title="Lịch sử trạng thái &amp; Nhật ký Điều phối" action={<span className="muted">Backend timeline</span>}>
        <div className="timeline">
          {(q.timeline.data ?? []).map(event => (
            <div className="timeline-item" key={event.id}>
              <span className="timeline-dot" />
              <div>
                <b>{event.description || event.eventType}</b>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                  {event.createdAt ? new Date(event.createdAt).toLocaleString('vi-VN') : ''}
                  {event.actor ? ` · Thực hiện bởi: ${event.actor}` : ''}
                  {event.newStatus ? ` · Trạng thái: ${event.newStatus}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
        {q.timeline.isError && (
          <div className="notice" style={{ marginTop: 12 }}>
            Timeline chưa được cấp quyền cho tài khoản này.
          </div>
        )}
      </Panel>
    </>
  );
}
