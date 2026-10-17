'use client';
import { useRef, useState } from 'react';
import { Alert, Button } from '@/components/ui';
import { ApiError } from '@/lib/api.client';
import { useOperationMutation } from '../hooks/useOperations';
import { operationsService } from '../services/operations.service';
import type { Station, Uav } from '../types/operations.types';
import { uavControls, uavReasonLimit } from '../uav-workflows';

const errors: Record<string, string> = {
  UAV_HAS_IN_PROGRESS_REPAIR_ORDER: 'UAV đang có phiếu sửa chữa đã bắt đầu. Hãy mở lịch bảo trì và phiếu sửa chữa để hoàn tất hoặc hủy phiếu trước khi cập nhật trạng thái hay trạm.',
  UAV_HAS_ACTIVE_MISSION: 'UAV đang được giữ cho một nhiệm vụ. Hãy đổi hoặc gỡ UAV trong nhiệm vụ trước khi bảo trì hay điều chuyển.',
  UAV_NOT_AVAILABLE: 'UAV không còn sẵn có. Trạng thái mới nhất đã được tải lại.',
  UAV_INVALID_STATUS: 'Không thể chuyển trạng thái UAV theo thao tác này. Hãy kiểm tra thông tin mới nhất.',
  UAV_STATUS_CHANGED: 'Trạng thái UAV đã thay đổi ở nơi khác. Hãy kiểm tra lại trước khi thao tác.',
  UAV_ALREADY_IN_MAINTENANCE: 'UAV đã được đưa vào bảo trì ở nơi khác. Hãy kiểm tra lịch sử mới nhất.',
  UAV_STATUS_REASON_REQUIRED: 'Vui lòng nhập lý do hoặc kết quả kiểm tra UAV.',
  UAV_STATUS_REASON_TOO_LONG: 'Nội dung không được vượt quá 255 ký tự.',
  UAV_STATUS_REQUIRES_MISSION_WORKFLOW: 'UAV đang được sử dụng cho nhiệm vụ. Hãy xử lý tại nhiệm vụ trước.',
  UAV_NOT_AVAILABLE_FOR_STATION_TRANSFER: 'Chỉ có thể điều chuyển trạm khi UAV sẵn có.',
  STATION_NOT_ACTIVE: 'Trạm đã ngừng hoạt động. Hãy chọn trạm khác.',
};

export function UavLifecyclePanel({ uav, mode, stations, canReadStations, onRefresh, onBusy }: {
  uav: Uav; mode: 'maintenance' | 'assignment'; stations: Station[]; canReadStations: boolean;
  onRefresh: () => Promise<boolean>; onBusy: (value: boolean) => void;
}) {
  const controls = uavControls(uav.status, true);
  const [confirmation, setConfirmation] = useState<{ action: 'maintenance' | 'recover'; expectedStatus: string } | null>(null);
  const [reason, setReason] = useState('');
  const [stationId, setStationId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const maintenance = useOperationMutation(operationsService.maintenanceUav, ['uavs', 'dashboard', 'audit']);
  const recover = useOperationMutation(operationsService.completeUavMaintenance, ['uavs', 'dashboard', 'audit']);
  const assign = useOperationMutation(({ id, stationId }: { id: number; stationId: number }) => operationsService.assignUav(id, stationId), ['uavs', 'audit']);
  const run = async (request: () => Promise<Uav>, message: string) => {
    if (lock.current || stale) return;
    lock.current = true; setBusy(true); onBusy(true); setError(''); setSuccess('');
    try { await request(); setConfirmation(null); setReason(''); setStationId(''); setSuccess(message); }
    catch (err) {
      setConfirmation(null);
      setError(err instanceof ApiError && err.status === 403 ? 'Bạn không còn quyền cập nhật UAV.' : errors[err instanceof Error ? err.message : ''] || (err instanceof ApiError && err.status === 409 ? 'UAV hoặc trạm đã thay đổi. Hãy kiểm tra thông tin mới nhất trước khi thử lại.' : 'Chưa xác nhận được kết quả thao tác. Hãy kiểm tra trạng thái trước khi thử lại.'));
    } finally {
      try { const fresh = await onRefresh(); setStale(!fresh); if (!fresh) setError('Chưa tải được trạng thái mới nhất. Hãy tải lại trước khi tiếp tục.'); }
      catch { setStale(true); setError('Chưa tải được trạng thái mới nhất. Hãy tải lại trước khi tiếp tục.'); }
      lock.current = false; setBusy(false); onBusy(false);
    }
  };
  const open = (action: 'maintenance' | 'recover') => { setConfirmation({ action, expectedStatus: uav.status }); setReason(''); setError(''); setSuccess(''); };
  const blocked = busy || stale;
  const legacyRecovery = (confirmation?.expectedStatus || uav.status) === 'ASSIGNED';
  return <div className="space-y-4">
    {error && <Alert variant="error">{error}</Alert>}
    {success && <Alert variant="success" role="status">{success}</Alert>}
    {busy && <p role="status" className="text-sm text-slate-600">Đang cập nhật UAV…</p>}
    {stale && <Button disabled={busy} variant="outline" onClick={async () => { if (lock.current) return; lock.current = true; setBusy(true); onBusy(true); try { const fresh = await onRefresh(); setStale(!fresh); if (fresh) setError(''); } catch { setError('Chưa tải được trạng thái mới nhất. Vui lòng thử lại.'); } finally { lock.current = false; setBusy(false); onBusy(false); } }}>Tải lại trạng thái UAV</Button>}
    {controls.busy && <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-slate-700">UAV đang được phân công hoặc đang sử dụng. Cần đổi hoặc gỡ UAV trong nhiệm vụ trước khi bảo trì hay điều chuyển trạm. Không thể điều phối lại khi nhiệm vụ đang bay.</p>}
    {mode === 'maintenance' && <>
      <p className="text-sm text-slate-600">UAV đang bảo trì không được bố trí vào nhiệm vụ. Chỉ hoàn tất bảo trì sau khi đã kiểm tra đủ điều kiện hoạt động.</p>
      {!confirmation && <div className="flex flex-wrap gap-3">
        {controls.maintenance && <Button className="min-h-11" disabled={blocked} variant="outline" onClick={() => open('maintenance')}>Đưa vào bảo trì</Button>}
        {controls.recover && <Button className="min-h-11" disabled={blocked} variant={legacyRecovery ? 'outline' : 'primary'} onClick={() => open('recover')}>{legacyRecovery ? 'Khôi phục UAV không có nhiệm vụ' : 'Hoàn tất bảo trì'}</Button>}
      </div>}
      {confirmation && <form aria-label={confirmation.action === 'maintenance' ? 'Xác nhận bảo trì UAV' : legacyRecovery ? 'Xác nhận khôi phục UAV' : 'Xác nhận hoàn tất bảo trì UAV'} className="schema-form grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4" onSubmit={event => {
        event.preventDefault(); if (!reason.trim() || reason.trim().length > uavReasonLimit) return;
        const input = { id: uav.id, reason, expectedStatus: confirmation.expectedStatus };
        void run(() => confirmation.action === 'maintenance' ? maintenance.mutateAsync(input) : recover.mutateAsync(input), confirmation.action === 'maintenance' ? 'Đã đưa UAV vào bảo trì.' : legacyRecovery ? 'Đã khôi phục UAV sẵn có sau khi kiểm tra không còn nhiệm vụ đang giữ.' : 'Đã hoàn tất bảo trì. UAV sẵn có để phân công.');
      }}>
        <strong>{confirmation.action === 'maintenance' ? 'Đưa UAV vào bảo trì' : legacyRecovery ? 'Xác nhận UAV không thuộc nhiệm vụ' : 'Xác nhận UAV đủ điều kiện hoạt động'}</strong>
        <p className="text-sm text-slate-600">{uav.serialNumber} · {confirmation.action === 'maintenance' ? 'UAV sẽ tạm ngừng nhận nhiệm vụ mới.' : legacyRecovery ? 'Chỉ dùng cho dữ liệu cũ bị giữ trạng thái phân công. Hệ thống kiểm tra và từ chối nếu UAV vẫn thuộc một nhiệm vụ đang hoạt động; không thể dùng để giải phóng UAV của nhiệm vụ.' : 'UAV sẽ chuyển sang sẵn có. Kết quả kiểm tra được lưu trong lịch sử.'}</p>
        <div className="form-field"><label htmlFor="uav-change-reason">{confirmation.action === 'maintenance' ? 'Lý do bảo trì' : legacyRecovery ? 'Lý do khôi phục UAV' : 'Kết quả kiểm tra sau bảo trì'}</label><textarea id="uav-change-reason" autoFocus required disabled={blocked} maxLength={uavReasonLimit} value={reason} onChange={event => setReason(event.target.value)} className="min-h-24 w-full rounded-lg border border-slate-300 p-3" /><span className="text-xs text-slate-600">Tối đa {uavReasonLimit} ký tự.</span></div>
        <div className="flex flex-wrap gap-3"><Button type="button" className="min-h-11" disabled={blocked} variant="outline" onClick={() => setConfirmation(null)}>Quay lại</Button><Button type="submit" className="min-h-11" disabled={blocked || !reason.trim()}>{confirmation.action === 'maintenance' ? 'Xác nhận bảo trì' : legacyRecovery ? 'Xác nhận khôi phục UAV' : 'Xác nhận hoàn tất bảo trì'}</Button></div>
      </form>}
    </>}
    {mode === 'assignment' && (!canReadStations ? <p className="text-sm text-slate-600">Bạn cần quyền đọc trạm để chọn trạm điều phối.</p> : controls.station ? <form className="schema-form grid gap-4" aria-label="Điều chuyển UAV đến trạm" onSubmit={event => { event.preventDefault(); if (!stations.some(station => station.id === Number(stationId) && station.status === 'ACTIVE') || Number(stationId) === uav.stationId) return; void run(() => assign.mutateAsync({ id: uav.id, stationId: Number(stationId) }), 'Đã cập nhật trạm. UAV vẫn sẵn có để phân công.'); }}>
      <p className="text-sm text-slate-600">Chỉ điều chuyển UAV sẵn có, không thuộc nhiệm vụ đang hoạt động. Gán trạm không giữ UAV cho một nhiệm vụ.</p>
      <div className="form-field"><label htmlFor="uav-station">Trạm điều chuyển</label><select id="uav-station" required className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm" disabled={blocked} value={stationId} onChange={event => setStationId(event.target.value)}><option value="">Chọn trạm mới</option>{stations.filter(station => station.status === 'ACTIVE' && station.id !== uav.stationId).map(station => <option key={station.id} value={station.id}>{station.name} · {station.code}</option>)}</select></div>
      <Button type="submit" className="min-h-11" disabled={blocked || !stationId}>Xác nhận gán trạm</Button>
    </form> : !controls.busy ? <p className="text-sm text-slate-600">UAV phải ở trạng thái sẵn có trước khi điều chuyển trạm.</p> : null)}
  </div>;
}
