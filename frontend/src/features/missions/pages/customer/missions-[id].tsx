'use client';
import Link from 'next/link';
import { MissionRequestDetails } from '@/features/missions/components/MissionRequestDetails';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { MissionTimeline } from "@/components/shared/MissionTimeline";
import { displayLabel, formatDate, missionHint, serviceName } from "@/components/shared/presentation";
import { PageGuard } from "@/components/customer/layout";
import { Button, Status } from "@/components/customer/ui";
import { useAuth } from '@/contexts/AuthContext';
import { useMissionActions, useMissionDetail, useServices } from "@/lib/query/customer";
import { customerService } from "@/lib/api/customer";
import { canEditMission } from "@/features/missions/forms/mission-form";
export default function MissionDetailPage() { return <PageGuard><MissionDetail /></PageGuard>; }
function MissionDetail() {
  const { id } = useParams<{ id: string }>();
  const q = useMissionDetail(Number(id));
  const services = useServices();
  const actions = useMissionActions();
  const { can, user } = useAuth();
  const [mediaError, setMediaError] = useState('');
  const [downloading, setDownloading] = useState<number | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const mission = q.detail.data;
  const actionError = actions.submit.error || actions.cancel.error;
  if (q.detail.isLoading) return <div className="center-state" role="status">Đang tải nhiệm vụ…</div>;
  if (q.detail.isError || !mission || mission.customerId !== user?.id) return <div className="error" role="alert">Không thể tải nhiệm vụ hoặc nhiệm vụ không thuộc tài khoản này. <Button variant="secondary" onClick={() => void q.detail.refetch()}>Thử lại</Button> <Link href="/customer/missions">Về danh sách</Link></div>;
  const canSubmit = canEditMission(mission, user?.id, can('MISSION_UPDATE'));
  const canCancel = ['DRAFT', 'PENDING_CONFIRMATION'].includes(mission.status) && can('MISSION_CANCEL');
  const download = async (mediaId: number) => {
    setDownloading(mediaId); setMediaError('');
    try { const signed = await customerService.download(mediaId); window.open(signed.url, '_blank', 'noopener,noreferrer'); }
    catch { setMediaError('Không thể tải tệp lúc này. Vui lòng thử lại.'); }
    finally { setDownloading(null); }
  };
  return <div className="mission-page">
    <Link href="/customer/missions" className="mission-back">← Nhiệm vụ của tôi</Link>
    <section className="mission-hero" aria-labelledby="mission-title">
      <div className="mission-hero-body">
        <div className="mission-title-row"><div><p className="mission-code">{mission.code}</p><h1 id="mission-title">{mission.title}</h1><p className="mission-muted">{mission.locationName}</p></div><Status value={mission.status} /></div>
        <dl className="mission-facts">
          <div><dt>Dịch vụ</dt><dd>{services.data?.find(s => s.id === mission.serviceId) ? serviceName(services.data.find(s => s.id === mission.serviceId)!) : displayLabel(mission.missionType)}</dd></div>
          <div><dt>Bắt đầu dự kiến</dt><dd>{formatDate(mission.startTime)}</dd></div>
          <div><dt>Kết thúc dự kiến</dt><dd>{formatDate(mission.expectedEndTime)}</dd></div>
          <div><dt>Mức ưu tiên</dt><dd>{displayLabel(mission.priority)}</dd></div>
        </dl>
        {mission.description && <p className="mission-muted" style={{ marginTop: 20 }}>{mission.description}</p>}
        <MissionRequestDetails mission={mission} />
      </div>
      <div className="mission-guidance"><p>{missionHint(mission.status)}</p>{(canSubmit || canCancel) && <div className="mission-actions">
        {canSubmit && !actions.submit.isPending && !actions.cancel.isPending && <Link className="button button-secondary" href={`/customer/missions/${mission.id}/edit`}>Chỉnh sửa bản nháp</Link>}
        {canSubmit && <Button disabled={actions.submit.isPending || actions.cancel.isPending} onClick={() => { actions.cancel.reset(); actions.submit.mutate(mission.id); }}>{actions.submit.isPending ? 'Đang gửi…' : 'Gửi xác nhận'}</Button>}
        {canCancel && <Button variant="danger" disabled={actions.cancel.isPending || actions.submit.isPending} onClick={() => setConfirmCancel(true)}>Hủy yêu cầu</Button>}
      </div>}</div>
    </section>
    {confirmCancel && canCancel && <div className="mission-note" role="group" aria-label="Xác nhận hủy yêu cầu"><strong>Bạn muốn hủy yêu cầu này?</strong><p className="mission-muted">Yêu cầu đã hủy sẽ không thể tiếp tục. Bạn vẫn có thể xem lại thông tin.</p><div className="mission-actions"><Button variant="secondary" disabled={actions.cancel.isPending || actions.submit.isPending} onClick={() => setConfirmCancel(false)}>Giữ yêu cầu</Button><Button variant="danger" disabled={actions.cancel.isPending || actions.submit.isPending} onClick={() => { actions.submit.reset(); actions.cancel.mutate(mission.id, { onSuccess: () => setConfirmCancel(false) }); }}>{actions.cancel.isPending ? 'Đang hủy…' : 'Xác nhận hủy'}</Button></div></div>}
    {actionError && <div className="error" role="alert">{actionError.message === 'MISSION_INVALID_STATUS' ? 'Trạng thái nhiệm vụ đã thay đổi. Vui lòng kiểm tra lại trước khi thao tác.' : 'Chưa thể thực hiện thao tác. Vui lòng kiểm tra trạng thái và thử lại.'}</div>}
    {mission.status === 'COMPLETED' && <section className="mission-panel" aria-labelledby="handover-title"><header><h2 id="handover-title">Kết quả bàn giao</h2></header><div className="mission-panel-body"><dl className="mission-resource-list"><div><dt>Hóa đơn nhiệm vụ</dt><dd>{mission.billingStatus === 'PENDING' ? 'Đang chờ lập hóa đơn' : mission.billingStatus === 'ERROR' ? 'Chưa lập được hóa đơn; hệ thống sẽ thử lại' : mission.billingStatus === 'ISSUED' ? 'Đã lập hóa đơn' : 'Không yêu cầu tự động lập hóa đơn'}</dd></div><div><dt>Ghi chú kết quả</dt><dd>{mission.completionNote || 'Nhiệm vụ cũ chưa có ghi chú bàn giao.'}</dd></div><div><dt>Tình trạng thiết bị khi hoàn trả</dt><dd>{mission.equipmentCondition || 'Nhiệm vụ cũ chưa có ghi nhận.'}</dd></div></dl><p className="mission-muted" style={{marginTop:16}}>Nhiệm vụ đã hoàn tất. Tệp bàn giao được giữ để xem và tải xuống.</p></div></section>}
    {mission.status === 'FAILED' && <section className="mission-panel"><header><h2>Kết quả thực hiện</h2></header><div className="mission-panel-body"><p>{mission.failureReason || 'Nhiệm vụ không thành công.'}</p>{mission.failureNotes && <p className="mission-muted">{mission.failureNotes}</p>}</div></section>}
    <div className="mission-grid">
      <section className="mission-panel" aria-labelledby="files-title"><header><h2 id="files-title">Tệp và kết quả</h2><span className="mission-count">{q.media.data?.length ?? 0} tệp</span></header><div className="mission-panel-body">
        <p className="mission-muted">Tệp đã xác nhận và kết quả bàn giao được giữ lại.</p>
        {mediaError && <div className="error" role="alert">{mediaError}</div>}
        {!can('MISSION_MEDIA_VIEW') ? <p className="mission-muted">Bạn chưa được cấp quyền xem tệp.</p> : q.media.isLoading ? <p role="status">Đang tải danh sách tệp…</p> : q.media.isError ? <div className="error" role="alert">Không thể tải danh sách tệp. <button onClick={() => void q.media.refetch()}>Thử lại</button></div> : q.media.data?.length ? <ul className="mission-files">{q.media.data.map(item => <li className="mission-file" key={item.id}><div className="mission-file-info"><span className="mission-file-name">{item.media.originalName}</span><span className="mission-file-meta">{displayLabel(item.mediaRole)} · {Math.max(1, Math.ceil(item.media.size / 1000))} KB</span></div><Button variant="secondary" disabled={downloading !== null} onClick={() => void download(item.media.id)}>{downloading === item.media.id ? 'Đang tải…' : 'Tải xuống'}</Button></li>)}</ul> : <div className="mission-empty">Chưa có tệp. Kết quả sẽ xuất hiện khi đội vận hành cập nhật.</div>}
      </div></section>
      <section className="mission-panel" aria-labelledby="history-title"><header><h2 id="history-title">Lịch sử nhiệm vụ</h2></header><div className="mission-panel-body">
        {!can('MISSION_TIMELINE_VIEW') ? <p className="mission-muted">Bạn chưa được cấp quyền xem lịch sử.</p> : q.timeline.isLoading ? <p role="status">Đang tải lịch sử…</p> : q.timeline.isError ? <div className="error" role="alert">Không thể tải lịch sử. <button onClick={() => void q.timeline.refetch()}>Thử lại</button></div> : <MissionTimeline events={q.timeline.data ?? []} />}
      </div></section>
    </div>
  </div>;
}
