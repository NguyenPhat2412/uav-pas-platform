'use client';
import { useEffect, useRef, useState } from 'react';
import { Alert, Button } from '@/components/ui';
import { ApiError } from '@/lib/api.client';

const errors: Record<string, string> = {
  MAINTENANCE_VERSION_CHANGED: 'Thông tin đã được người khác thay đổi. Dữ liệu mới nhất đã được tải lại; hãy kiểm tra trước khi thao tác tiếp.',
  MAINTENANCE_ACTIVE_ORDER_EXISTS: 'UAV đã có phiếu đang mở hoặc đang sửa chữa. Hãy xử lý phiếu hiện có trước.',
  MAINTENANCE_UAV_HAS_ACTIVE_ORDER: 'UAV đã có phiếu đang mở hoặc đang sửa chữa. Hãy xử lý phiếu hiện có trước.',
  MAINTENANCE_SCHEDULE_HAS_ACTIVE_ORDER: 'Lịch đang có phiếu chưa đóng. Hãy hoàn tất hoặc hủy phiếu trước khi sửa lịch.',
  MAINTENANCE_ORDER_INVALID_STATUS: 'Trạng thái phiếu không còn phù hợp với thao tác này. Hãy kiểm tra dữ liệu mới nhất.',
  MAINTENANCE_ORDER_INVALID_STATE: 'Trạng thái phiếu không còn phù hợp với thao tác này. Hãy kiểm tra dữ liệu mới nhất.',
  MAINTENANCE_UAV_STATE_CHANGED: 'Trạng thái UAV đã thay đổi. Cần kiểm tra UAV và nhiệm vụ trước khi tiếp tục sửa chữa.',
  MAINTENANCE_SCHEDULE_UAV_MISMATCH: 'UAV không thuộc lịch bảo trì đã chọn. Hãy đóng biểu mẫu và chọn lại lịch.',
  MAINTENANCE_ORDER_TERMINAL: 'Phiếu đã đóng, không thể thay đổi thông tin hoặc chi phí.',
  UAV_HAS_ACTIVE_MISSION: 'UAV đang được giữ cho nhiệm vụ. Cần gỡ hoặc thay UAV trong nhiệm vụ trước khi bắt đầu sửa chữa.',
  UAV_NOT_AVAILABLE: 'UAV không còn sẵn có để bắt đầu sửa chữa.',
  MAINTENANCE_UAV_BUSY: 'UAV đang được phân công hoặc đang bay. Phiếu có thể chờ, nhưng chưa thể bắt đầu sửa chữa.',
  MAINTENANCE_SCHEDULE_PAUSED: 'Lịch đang tạm dừng. Hãy kích hoạt lại lịch trước khi lập phiếu theo lịch.',
};
export function maintenanceError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Bạn không có quyền quản lý bảo trì hoặc quyền vừa thay đổi.';
    if (error.status === 404) return 'Không tìm thấy dữ liệu. Hãy tải lại danh sách.';
    if (errors[error.message]) return errors[error.message];
    if (error.status === 409) return 'Không thể thao tác ở trạng thái hiện tại. Hãy kiểm tra phiếu đang mở, lịch bảo trì và nhiệm vụ của UAV.';
    if (error.status === 400) return 'Thông tin chưa hợp lệ. Kiểm tra ngày, nội dung và giới hạn số lượng, đơn giá.';
    return 'Chưa xác nhận được kết quả. Hãy tải lại dữ liệu trước khi thử lại để tránh thao tác trùng.';
  }
  return error instanceof Error ? error.message : 'Không thể xử lý yêu cầu. Vui lòng thử lại.';
}
export function Feedback({ error, success }: { error?: string; success?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) { ref.current?.focus(); ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }, [error]);
  return <>{error && <div ref={ref} tabIndex={-1}><Alert variant="error">{error}</Alert></div>}{success && <Alert variant="success" role="status">{success}</Alert>}</>;
}
export function useMaintenanceAction(refresh: () => Promise<boolean>) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState(''), [stale, setStale] = useState(false);
  const lock = useRef(false);
  const run = async (request: () => Promise<unknown>, message: string, onSuccess?: () => void) => {
    if (lock.current || stale) return;
    lock.current = true; setBusy(true); setError(''); setSuccess('');
    let succeeded = false;
    try { await request(); succeeded = true; setSuccess(message); }
    catch (failure) { setError(maintenanceError(failure)); }
    finally {
      try { const fresh = await refresh(); setStale(!fresh); if (!fresh) setError('Chưa tải được dữ liệu mới nhất. Tải lại trước khi tiếp tục.'); }
      catch { setStale(true); setError('Chưa tải được dữ liệu mới nhất. Tải lại trước khi tiếp tục.'); }
      lock.current = false; setBusy(false);
    }
    if (succeeded) onSuccess?.();
  };
  const retry = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { const fresh = await refresh(); setStale(!fresh); if (fresh) setError(''); }
    catch { setStale(true); setError('Chưa tải được dữ liệu mới nhất. Vui lòng thử lại.'); }
    finally { setBusy(false); lock.current = false; }
  };
  return { busy, error, success, stale, blocked: busy || stale, run, setError, retry };
}
export function ActionFeedback({ action }: { action: ReturnType<typeof useMaintenanceAction> }) {
  return <><Feedback error={action.error} success={action.success} />{action.busy && <p role="status" className="text-sm text-slate-600">Đang lưu và kiểm tra trạng thái mới nhất…</p>}{action.stale && <Button type="button" disabled={action.busy} variant="outline" onClick={() => void action.retry()}>Tải lại dữ liệu bảo trì</Button>}</>;
}
