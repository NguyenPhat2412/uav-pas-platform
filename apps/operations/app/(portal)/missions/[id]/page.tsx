'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Play } from 'lucide-react';
import { MissionTimeline } from '@uav/ui/timeline';
import { displayLabel, formatDate, missionHint, terminalStatuses } from '@uav/ui/presentation';
import { Alert, Button, Spinner } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { missionService } from '@/features/missions/services/mission.service';
import { ResourceRedispatch } from '@/features/missions/components/ResourceRedispatch';
import type { DispatchResources, Mission, MissionEvent, MissionMedia } from '@/features/missions/types/mission.types';
import { MissionStatusBadge } from '@/features/missions/components/MissionStatusBadge';
import { missionControls } from '@/features/missions/presentation';
import { MissionFormError, missionEventNoteLimit, reservationQuantity } from '@/features/missions/workflows';
import { collectPages } from '@/lib/collection';
import { ApiError } from '@/lib/api.client';
import { operationsService } from '@/features/operations/services/operations.service';
import type { Equipment, Operator, Station, Uav } from '@/features/operations/types/operations.types';
import { AppShell } from '@/components/layout/AppShell';

type Confirmation = 'reject' | 'conflict' | 'complete' | 'cancel' | 'fail';
const confirmations = { reject: 'Từ chối yêu cầu', conflict: 'Báo vướng mắc', complete: 'Hoàn tất nhiệm vụ', cancel: 'Hủy nhiệm vụ', fail: 'Ghi nhận nhiệm vụ không thành công' };
const errorLabels: Record<string, string> = {
  MISSION_DISPATCH_STALE: 'Phân công đã thay đổi ở màn hình khác. Dữ liệu đã được tải lại; hãy kiểm tra trước khi thử lại.',
  MISSION_RESERVATION_STALE: 'Khoản giữ đã được đổi hoặc hoàn trả. Hãy kiểm tra danh sách mới nhất.',
  MISSION_STATION_RESOURCES_CONFLICT: 'Tài nguyên không cùng trạm. Hãy gỡ UAV và hoàn trả thiết bị thuộc trạm cũ trước khi đổi trạm.',
  MISSION_RESERVATION_BALANCE_CONFLICT: 'Số lượng giữ trong kho không khớp với các nhiệm vụ. Chưa hoàn trả để tránh lấy nhầm phần của nhiệm vụ khác.',
  MISSION_DISPATCH_REQUIRED: 'Tài nguyên đã được phân công. Hãy dùng chức năng điều phối lại.',
  OPERATOR_NOT_AVAILABLE: 'Người vận hành phải có đúng vai trò, đang hoạt động và không bị khóa.',
  MISSION_RESOURCE_UNCHANGED: 'Tài nguyên và số lượng chưa thay đổi.',
  MISSION_UAV_ASSIGNMENT_STALE: 'UAV của nhiệm vụ đã thay đổi ở nơi khác. Thông tin đã được tải lại; hãy kiểm tra UAV hiện tại trước khi thao tác.',
  MISSION_INVALID_STATUS: 'Trạng thái nhiệm vụ đã thay đổi. Thông tin đã được tải lại, vui lòng kiểm tra trước khi thao tác.',
  MISSION_RESOURCE_MISSING: 'Chưa đủ tài nguyên hợp lệ. Hãy kiểm tra trạm, UAV, người vận hành và thiết bị.',
  UAV_NOT_AVAILABLE: 'UAV này hiện không sẵn sàng.', UAV_TIME_CONFLICT: 'UAV đã có lịch trong khung giờ này.',
  OPERATOR_TIME_CONFLICT: 'Người vận hành đã có lịch trong khung giờ này.', INVENTORY_NOT_AVAILABLE: 'Thiết bị không còn đủ số lượng.',
};
export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <MissionDetail key={id} id={id} />;
}
function MissionDetail({ id }: { id: string }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, can, permissionsReady } = useAuth();
  const [mission, setMission] = useState<Mission | null>(null);
  const [dispatch, setDispatch] = useState<DispatchResources | null>(null);
  const [events, setEvents] = useState<MissionEvent[]>([]); const [media, setMedia] = useState<MissionMedia[]>([]);
  const [stations, setStations] = useState<Station[]>([]); const [uavs, setUavs] = useState<Uav[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]); const [operators, setOperators] = useState<Operator[]>([]);
  const [busy, setBusy] = useState(false); const [uploading, setUploading] = useState(false);
  const actionLock = useRef(false);
  const loadGeneration = useRef(0);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState(''); const [sectionErrors, setSectionErrors] = useState<string[]>([]);
  const mutationError = useRef<HTMLDivElement>(null);
  const focusMutationError = useRef(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null); const [note, setNote] = useState('');
  const [extraNote, setExtraNote] = useState(''); const [quantity, setQuantity] = useState('1');
  const [redispatch, setRedispatch] = useState<{ kind: 'replaceUav' | 'unassignUav'; expectedCurrentUavId: number } | null>(null);
  const [redispatchReason, setRedispatchReason] = useState('');
  const [replacementUavId, setReplacementUavId] = useState('');
  const [resourceIds, setResourceIds] = useState({ station: '', uav: '', operator: '', equipment: '' });
  const readTimeline = permissionsReady && can('MISSION_TIMELINE_VIEW'); const readMedia = permissionsReady && can('MISSION_MEDIA_VIEW');
  const readStations = permissionsReady && can('STATION_READ'); const readUavs = permissionsReady && can('UAV_READ');
  const readEquipment = permissionsReady && can('INVENTORY_READ'); const readOperators = permissionsReady && can('USER_READ');
  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    const isCurrent = () => generation === loadGeneration.current;
    let result: Mission;
    try { const snapshot = await missionService.dispatchResources(Number(id)); result = snapshot.mission; if (isCurrent()) setDispatch(snapshot); }
    catch (err) { if (!isCurrent()) return; throw err; }
    if (!isCurrent()) return;
    setMission(result); setStale(false);
    const failures: string[] = [];
    const section = async <T,>(allowed: boolean, name: string, request: () => Promise<T>, save: (data: T) => void) => {
      if (!allowed) return;
      try { const data = await request(); if (isCurrent()) save(data); } catch { failures.push(name); }
    };
    await Promise.all([
      section(readTimeline, 'lịch sử', () => missionService.timeline(Number(id)), setEvents),
      section(readMedia, 'tệp', () => missionService.media(Number(id)), setMedia),
      section(readStations, 'trạm', () => collectPages(page => operationsService.listStations(page)), setStations),
      section(readUavs, 'UAV', () => collectPages(page => operationsService.listUavs(page)), setUavs),
      section(readEquipment, 'thiết bị', () => collectPages(page => operationsService.listEquipment(page)), setEquipment),
      section(readOperators, 'người vận hành', () => collectPages(page => operationsService.listOperators(page)), setOperators),
    ]);
    if (isCurrent()) setSectionErrors(failures);
  }, [id, readTimeline, readMedia, readStations, readUavs, readEquipment, readOperators]);
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
    else if (isAuthenticated && permissionsReady && id) {
      const timer = window.setTimeout(() => { void load().catch(() => setError('Không thể tải nhiệm vụ hoặc bạn chưa được cấp quyền truy cập.')); }, 0);
      return () => { window.clearTimeout(timer); loadGeneration.current += 1; };
    }
  }, [id, isAuthenticated, isLoading, permissionsReady, load, router]);
  useEffect(() => {
    if (!error || busy || uploading || !focusMutationError.current || !mutationError.current) return;
    focusMutationError.current = false;
    mutationError.current.focus({ preventScroll: true });
    mutationError.current.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, [error, busy, uploading]);
  if (isLoading || !isAuthenticated || !permissionsReady || !mission || mission.id !== Number(id)) return <div className="min-h-screen flex items-center justify-center">{error ? <p role="alert" className="text-error">{error}</p> : <Spinner size="lg" label="Đang tải nhiệm vụ" />}</div>;
  const controls = missionControls(mission, user?.id, can);
  const disabled = busy || uploading || stale;
  const action = async (run: () => Promise<Mission>) => {
    if (disabled || actionLock.current) return; actionLock.current = true; loadGeneration.current += 1; setBusy(true); setError('');
    try { setMission(await run()); setConfirmation(null); setRedispatch(null); setNote(''); setExtraNote(''); }
    catch (err) { focusMutationError.current = true; setRedispatch(null); setError(err instanceof MissionFormError ? err.message : err instanceof ApiError && err.status === 403 ? 'Bạn không còn quyền thực hiện thao tác này hoặc không phải người vận hành được phân công.' : errorLabels[err instanceof Error ? err.message : ''] || 'Chưa xác nhận được kết quả thao tác. Kiểm tra trạng thái đã tải lại trước khi thử lại.'); }
    finally { try { await load(); } catch { focusMutationError.current = true; setStale(true); setError('Chưa tải được trạng thái mới nhất. Hãy tải lại trạng thái trước khi tiếp tục để tránh gửi lặp thao tác.'); } actionLock.current = false; setBusy(false); }
  };
  const uploadMedia = async (file: File) => {
    if (disabled || actionLock.current || !controls.upload) return; actionLock.current = true; loadGeneration.current += 1; setUploading(true); setError('');
    try { const signed = await missionService.requestMediaUpload(Number(id), file); await missionService.uploadFile(signed.url, file); await missionService.confirmMedia(Number(id), signed.mediaId); await missionService.attachMedia(Number(id), signed.mediaId, file.type.startsWith('video/') ? 'FLIGHT_DATA' : 'OUTPUT'); await load(); }
    catch { focusMutationError.current = true; setError('Không thể tải tệp lên. Vui lòng thử lại.'); } finally { actionLock.current = false; setUploading(false); }
  };
  const openConfirmation = (value: Confirmation) => { setRedispatch(null); setNote(''); setExtraNote(''); setConfirmation(value); setError(''); };
  const confirmAction = () => {
    if (!confirmation || !controls[confirmation]) return;
    if (['reject', 'conflict', 'fail'].includes(confirmation) && !note.trim()) return;
    const run = { reject: () => missionService.reject(mission.id, note.trim()), conflict: () => missionService.reportConflict(mission.id, note.trim()), complete: () => missionService.complete(mission.id, note.trim() || 'Hoàn tất vận hành', extraNote.trim() || undefined), cancel: () => missionService.cancel(mission.id), fail: () => missionService.fail(mission.id, note, extraNote) }[confirmation];
    void action(run);
  };
  const assignedStation = stations.find(s => s.id === mission.stationId);
  const assignedUav = uavs.find(u => u.id === mission.uavId);
  const assignedOperator = operators.find(o => o.id === mission.operatorId);
  const replacementUavs = uavs.filter(uav => uav.id !== mission.uavId && uav.status === 'AVAILABLE' && (!mission.stationId || !uav.stationId || uav.stationId === mission.stationId));
  const openRedispatch = (kind: 'replaceUav' | 'unassignUav') => {
    if (!mission.uavId || !controls[kind] || disabled) return;
    setConfirmation(null); setRedispatch({ kind, expectedCurrentUavId: mission.uavId }); setRedispatchReason(''); setReplacementUavId(''); setError('');
  };
  const selectedEquipment = equipment.find(e => String(e.id) === resourceIds.equipment);
  const validQuantity = Number.isSafeInteger(Number(quantity)) && Number(quantity) > 0 && Number(quantity) <= (selectedEquipment?.availableQuantity ?? 0);
  const resources = [
    { key: 'station' as const, label: 'Trạm', options: stations.filter(s => s.status === 'ACTIVE').map(s => ({ id: s.id, label: `${s.name} · ${s.code}` })), run: () => missionService.assignStation(mission.id, Number(resourceIds.station)) },
    { key: 'uav' as const, label: 'UAV', options: uavs.filter(u => u.status === 'AVAILABLE' && (!mission.stationId || !u.stationId || u.stationId === mission.stationId)).map(u => ({ id: u.id, label: `${u.serialNumber} · ${u.model}` })), run: () => missionService.assignUav(mission.id, Number(resourceIds.uav)) },
    { key: 'operator' as const, label: 'Người vận hành', options: operators.filter(o => o.status === 'ACTIVE').map(o => ({ id: o.id, label: o.fullName || o.username })), run: () => missionService.assignOperator(mission.id, Number(resourceIds.operator)) },
    { key: 'equipment' as const, label: 'Thiết bị', options: equipment.filter(e => e.status === 'ACTIVE' && e.availableQuantity > 0 && (!mission.stationId || !e.stationId || e.stationId === mission.stationId)).map(e => ({ id: e.id, label: `${e.name} · Còn ${e.availableQuantity}` })), run: () => missionService.reserveEquipment(mission.id, Number(resourceIds.equipment), reservationQuantity(quantity, selectedEquipment?.availableQuantity ?? 0)) },
  ];
  return <AppShell><div className="mission-page">
    <Link href={can('MISSION_VIEW_ALL') ? '/dispatch/missions' : '/assigned-missions'} className="mission-back"><ArrowLeft size={16} aria-hidden="true" />Danh sách nhiệm vụ</Link>
    <section className="mission-hero" id="overview" aria-labelledby="mission-title"><div className="mission-hero-body">
      <div className="mission-title-row"><div><p className="mission-code">{mission.code}</p><h1 id="mission-title">{mission.title}</h1><p className="mission-muted">{mission.locationName}</p></div><MissionStatusBadge status={mission.status} /></div>
      <dl className="mission-facts"><Info label="Loại nhiệm vụ" value={displayLabel(mission.missionType)} /><Info label="Bắt đầu dự kiến" value={formatDate(mission.startTime)} /><Info label="Kết thúc dự kiến" value={formatDate(mission.expectedEndTime)} /><Info label="Mức ưu tiên" value={displayLabel(mission.priority)} /></dl>
      {mission.description && <p className="mission-muted" style={{ marginTop: 20 }}>{mission.description}</p>}
    </div><div className="mission-guidance"><p>{missionHint(mission.status)}</p><div className="mission-actions">
      {controls.submit && <Button disabled={disabled} onClick={() => void action(() => missionService.submit(mission.id))}>Gửi xác nhận</Button>}
      {controls.confirm && <Button disabled={disabled} onClick={() => void action(() => missionService.confirm(mission.id))}>Xác nhận</Button>}
      {controls.ready && <Button disabled={disabled} onClick={() => void action(() => missionService.ready(mission.id))}>Sẵn sàng</Button>}
      {controls.accept && <Button disabled={disabled} onClick={() => void action(() => missionService.accept(mission.id))}>Nhận nhiệm vụ</Button>}
      {controls.start && <Button disabled={disabled} onClick={() => void action(() => missionService.start(mission.id))} leftIcon={<Play size={16} />}>Bắt đầu</Button>}
      {controls.complete && <Button disabled={disabled} onClick={() => openConfirmation('complete')} leftIcon={<CheckCircle2 size={16} />}>Hoàn tất</Button>}
      {controls.fail && <Button disabled={disabled} variant="danger" onClick={() => openConfirmation('fail')}>Ghi nhận không thành công</Button>}
      {controls.conflict && <Button disabled={disabled} variant="outline" onClick={() => openConfirmation('conflict')}>Báo vướng mắc</Button>}
      {controls.reject && <Button disabled={disabled} variant="outline" onClick={() => openConfirmation('reject')}>Từ chối</Button>}
      {controls.cancel && <Button disabled={disabled} variant="outline" onClick={() => openConfirmation('cancel')}>Hủy nhiệm vụ</Button>}
      {busy && <span role="status">Đang xử lý…</span>}
    </div></div></section>
    {confirmation && controls[confirmation] && <form className="mission-note" aria-label={confirmations[confirmation]} onSubmit={e => { e.preventDefault(); confirmAction(); }}>
      <strong>{confirmations[confirmation]}</strong>
      {confirmation === 'cancel' ? <p className="mission-muted">Nhiệm vụ đã hủy sẽ không thể tiếp tục. Tài nguyên được hoàn trả theo quy trình.</p> : <>
        {confirmation === 'fail' && <p className="mission-muted">Thao tác này kết thúc nhiệm vụ và giải phóng tài nguyên đang giữ. Nhiệm vụ sẽ không thể tiếp tục; lý do được lưu trong lịch sử.</p>}
        <label>{confirmation === 'complete' ? 'Ghi chú kết quả (tùy chọn)' : confirmation === 'fail' ? 'Lý do không thành công' : 'Lý do / vướng mắc'}
          <textarea autoFocus required={confirmation !== 'complete'} disabled={disabled} maxLength={missionEventNoteLimit} value={note} onChange={e => setNote(e.target.value)} />
          <span className="mission-muted">Tối đa {missionEventNoteLimit} ký tự.</span>
        </label>
        {confirmation === 'fail' && <label>Ghi chú sự cố (tùy chọn)<textarea disabled={disabled} maxLength={2000} value={extraNote} onChange={e => setExtraNote(e.target.value)} /></label>}
        {confirmation === 'complete' && <label>Tình trạng thiết bị khi hoàn trả (tùy chọn)<textarea disabled={disabled} aria-label="Tình trạng thiết bị khi hoàn trả (tùy chọn)" maxLength={500} value={extraNote} onChange={e => setExtraNote(e.target.value)} /><span className="mission-muted">Ghi nhận này không tự thay đổi trạng thái hỏng hoặc bảo trì của thiết bị.</span></label>}
      </>}
      <div className="mission-actions"><Button type="button" variant="outline" disabled={disabled} onClick={() => setConfirmation(null)}>Quay lại</Button><Button type="submit" variant={confirmation === 'fail' ? 'danger' : 'primary'} disabled={disabled || (['reject','conflict','fail'].includes(confirmation) && !note.trim())}>{confirmation === 'fail' ? 'Xác nhận không thành công' : `Xác nhận ${confirmation === 'complete' ? 'hoàn tất' : confirmation === 'cancel' ? 'hủy' : confirmation === 'reject' ? 'từ chối' : 'báo vướng mắc'}`}</Button></div>
    </form>}
    {error && <div ref={mutationError} role="alert" tabIndex={-1}><Alert role="presentation" variant="error">{error}</Alert></div>}
    {stale && <Button variant="outline" disabled={busy || uploading} onClick={async () => { setBusy(true); try { await load(); setError(''); } catch { setError('Chưa thể tải lại trạng thái. Vui lòng kiểm tra kết nối và thử lại.'); } finally { setBusy(false); } }}>Tải lại trạng thái</Button>}
    {sectionErrors.length > 0 && <Alert variant="warning">Chưa tải được: {sectionErrors.join(', ')}. <button disabled={busy || uploading} onClick={() => { if (actionLock.current) return; void load().catch(() => setError('Không thể tải lại nhiệm vụ.')); }}>Thử lại</button></Alert>}
    <nav className="mission-sections" aria-label="Các mục của nhiệm vụ"><a href="#resources">Tài nguyên</a><a href="#media">Tệp và kết quả</a><a href="#timeline">Lịch sử</a></nav>
    {resources.some(r => controls[r.key]) && <section className="mission-panel"><header><h2>Bố trí tài nguyên</h2></header><div className="mission-panel-body mission-assignment">{resources.filter(r => controls[r.key]).map(r => <div key={r.key} className="grid gap-2">
      <label>{r.label}<span className="mission-assignment-row"><select disabled={disabled} aria-label={r.label} value={resourceIds[r.key]} onChange={e => { setResourceIds(v => ({ ...v, [r.key]: e.target.value })); if (r.key === 'equipment') setQuantity('1'); }}><option value="">Chọn {r.label.toLowerCase()}</option>{r.options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select><Button disabled={disabled || !r.options.some(o => String(o.id) === resourceIds[r.key]) || (r.key === 'equipment' && !validQuantity)} variant="outline" aria-label={r.key === 'equipment' ? 'Giữ thiết bị' : `Gán ${r.label.toLowerCase()}`} onClick={() => void action(r.run)}>{r.key === 'equipment' ? 'Giữ' : 'Gán'}</Button></span></label>
      {r.key === 'equipment' && <label>Số lượng giữ<input className="h-11 rounded-lg border border-slate-300 px-3" type="number" aria-label="Số lượng giữ" inputMode="numeric" min={1} max={selectedEquipment?.availableQuantity} step={1} disabled={disabled || !selectedEquipment} value={quantity} onChange={e => setQuantity(e.target.value)} /><span className="mission-muted">{selectedEquipment ? `Còn khả dụng: ${selectedEquipment.availableQuantity}` : 'Chọn thiết bị để nhập số lượng cần giữ.'}</span></label>}
    </div>)}</div></section>}
    {(controls.replaceUav || controls.unassignUav) && <section className="mission-panel" aria-labelledby="redispatch-title"><header><h2 id="redispatch-title">Điều phối lại UAV</h2></header><div className="mission-panel-body grid gap-4">
      <p className="mission-muted">Chỉ thay hoặc gỡ UAV trước khi nhiệm vụ bắt đầu. Trạm, người vận hành và thiết bị đang giữ được bảo toàn. Trạng thái tiếp nhận của người vận hành được đặt lại; nhiệm vụ cần được kiểm tra trước khi tiếp tục.</p>
      {!redispatch && <div className="mission-actions"><Button disabled={disabled} variant="outline" onClick={() => openRedispatch('replaceUav')}>Thay UAV</Button><Button disabled={disabled} variant="outline" onClick={() => openRedispatch('unassignUav')}>Gỡ UAV khỏi nhiệm vụ</Button></div>}
      {redispatch && controls[redispatch.kind] && <form className="mission-note" aria-label={redispatch.kind === 'replaceUav' ? 'Thay UAV của nhiệm vụ' : 'Gỡ UAV của nhiệm vụ'} onSubmit={event => {
        event.preventDefault(); if (!redispatchReason.trim() || (redispatch.kind === 'replaceUav' && !replacementUavs.some(uav => String(uav.id) === replacementUavId))) return;
        void action(() => redispatch.kind === 'replaceUav' ? missionService.replaceUav(mission.id, redispatch.expectedCurrentUavId, Number(replacementUavId), redispatchReason) : missionService.unassignUav(mission.id, redispatch.expectedCurrentUavId, redispatchReason));
      }}>
        <strong>{redispatch.kind === 'replaceUav' ? 'Xác nhận thay UAV' : 'Xác nhận gỡ UAV'}</strong>
        <p className="mission-muted">UAV hiện tại: {assignedUav?.serialNumber || `#${redispatch.expectedCurrentUavId}`}. {redispatch.kind === 'replaceUav' ? 'UAV cũ chỉ được giải phóng khi UAV thay thế hợp lệ. Nếu đang sẵn sàng, nhiệm vụ sẽ quay về bước bố trí tài nguyên để kiểm tra lại.' : 'Nhiệm vụ sẽ quay về trạng thái đã xác nhận. Cần gán UAV khác trước khi sẵn sàng.'}</p>
        {redispatch.kind === 'replaceUav' && <label>UAV thay thế<select className="mt-2 min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3" autoFocus required aria-label="UAV thay thế" disabled={disabled} value={replacementUavId} onChange={event => setReplacementUavId(event.target.value)}><option value="">Chọn UAV thay thế</option>{replacementUavs.map(uav => <option key={uav.id} value={uav.id}>{uav.serialNumber} · {uav.model}</option>)}</select>{!replacementUavs.length && <span className="mission-muted">Chưa có UAV sẵn có phù hợp với trạm. Hãy kiểm tra đội UAV hoặc hoàn tất bảo trì trước.</span>}</label>}
        <label>Lý do điều phối lại<textarea autoFocus={redispatch.kind === 'unassignUav'} required disabled={disabled} maxLength={missionEventNoteLimit} value={redispatchReason} onChange={event => setRedispatchReason(event.target.value)} /><span className="mission-muted">Tối đa {missionEventNoteLimit} ký tự. Lý do được lưu trong lịch sử nhiệm vụ.</span></label>
        <div className="mission-actions"><Button type="button" disabled={disabled} variant="outline" onClick={() => setRedispatch(null)}>Giữ nguyên UAV</Button><Button type="submit" disabled={disabled || !redispatchReason.trim() || (redispatch.kind === 'replaceUav' && !replacementUavs.some(uav => String(uav.id) === replacementUavId))}>{redispatch.kind === 'replaceUav' ? 'Xác nhận thay UAV' : 'Xác nhận gỡ UAV'}</Button></div>
      </form>}
    </div></section>}
    {dispatch && <ResourceRedispatch snapshot={dispatch} stations={stations} operators={operators} equipment={equipment} disabled={disabled}
      allowed={{ operator: controls.redispatchOperator, station: controls.redispatchStation, equipment: controls.redispatchEquipment }} action={action} />}
    <div className="mission-grid"><div className="grid gap-5">
      <section className="mission-panel" id="resources"><header><h2>Tài nguyên được phân công</h2></header><div className="mission-panel-body"><dl className="mission-resource-list"><Info label="Trạm" value={assignedStation?.name || (mission.stationId ? `Trạm #${mission.stationId}` : 'Chưa phân công')} /><Info label="UAV" value={assignedUav ? `${assignedUav.serialNumber} · ${assignedUav.model}` : mission.uavId ? `UAV #${mission.uavId}` : 'Chưa phân công'} /><Info label="Người vận hành" value={assignedOperator?.fullName || assignedOperator?.username || (mission.operatorId === user?.id ? user?.fullName || user?.username || 'Bạn' : mission.operatorId ? `Người vận hành #${mission.operatorId}` : 'Chưa phân công')} /></dl>{mission.operatorId && <p className="mission-muted" style={{marginTop:16}}>{mission.operatorAccepted ? 'Đã xác nhận nhận nhiệm vụ.' : 'Chưa xác nhận nhận nhiệm vụ.'}</p>}{mission.operatorConflictNote && <p className="mission-muted">Vướng mắc: {mission.operatorConflictNote}</p>}</div></section>
      {(mission.status === 'FAILED' || mission.status === 'COMPLETED') && <section className="mission-panel" aria-labelledby="mission-outcome-title"><header><h2 id="mission-outcome-title">Kết quả thực hiện</h2></header><div className="mission-panel-body"><dl className="mission-resource-list">
        {mission.status === 'FAILED' ? <><Info label="Lý do không thành công" value={mission.failureReason || 'Chưa có ghi nhận'} />{mission.failureNotes && <Info label="Ghi chú sự cố" value={mission.failureNotes} />}</> : <><Info label="Ghi chú kết quả" value={mission.completionNote || 'Chưa có ghi nhận'} />{mission.equipmentCondition && <Info label="Tình trạng thiết bị khi hoàn trả" value={mission.equipmentCondition} />}</>}
      </dl></div></section>}
      <section className="mission-panel" id="media"><header><h2>Tệp và kết quả</h2><span className="mission-count">{media.length} tệp</span></header><div className="mission-panel-body">
        {controls.upload && <label className="mission-upload" aria-disabled={disabled}><input type="file" className="sr-only" disabled={disabled} onChange={e => { const file=e.target.files?.[0]; if(file) void uploadMedia(file); e.target.value=''; }} />{uploading ? 'Đang tải tệp lên…' : 'Tải tệp kết quả lên'}</label>}
        {!readMedia ? <p className="mission-muted">Bạn chưa được cấp quyền xem tệp.</p> : media.length ? <ul className="mission-files">{media.map(item => <li className="mission-file" key={item.id}><div className="mission-file-info"><span className="mission-file-name">{item.media.originalName}</span><span className="mission-file-meta">{displayLabel(item.mediaRole)} · {Math.max(1, Math.ceil(item.media.size / 1024))} KB</span></div></li>)}</ul> : <p className="mission-empty">Chưa có tệp được đính kèm.</p>}
        {terminalStatuses.includes(mission.status) && <p className="mission-muted" style={{marginTop:16}}>Nhiệm vụ đã kết thúc. Tệp được giữ lại để tra cứu.</p>}
      </div></section>
    </div><section className="mission-panel" id="timeline"><header><h2>Lịch sử nhiệm vụ</h2></header><div className="mission-panel-body">{readTimeline ? <MissionTimeline events={events} showActor /> : <p className="mission-muted">Bạn chưa được cấp quyền xem lịch sử.</p>}</div></section></div>
  </div></AppShell>;
}
function Info({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
