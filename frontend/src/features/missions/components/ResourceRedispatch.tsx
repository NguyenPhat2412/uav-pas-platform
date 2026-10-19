'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import type { Equipment, Operator, Station } from "@/types/resources";
import type { DispatchResources, Mission } from "@/features/missions/types/mission.types";
import { missionService } from "@/features/missions/services/mission.service";
import { missionEventNoteLimit, reservationQuantity } from "@/features/missions/workflows";

type Kind = 'operator' | 'station' | 'equipment';
type Form = { kind: Kind; version: number; reservationId?: number; oldEquipmentId?: number; oldQuantity?: number };
const names = { operator: 'người vận hành', station: 'trạm', equipment: 'thiết bị' };
interface Props {
  snapshot: DispatchResources; stations: Station[]; operators: Operator[]; equipment: Equipment[];
  allowed: { operator: boolean; station: boolean; equipment: boolean };
  disabled: boolean; action: (run: () => Promise<Mission>) => Promise<void>;
}
export function ResourceRedispatch({ snapshot, stations, operators, equipment, allowed, disabled, action }: Props) {
  const [form, setForm] = useState<Form | null>(null);
  const [replacement, setReplacement] = useState('');
  const [reason, setReason] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [schedule, setSchedule] = useState<'idle' | 'checking' | 'available' | 'conflict' | 'error'>('idle');
  const [retry, setRetry] = useState(0);
  const mission = snapshot.mission;
  const operatorCandidate = form?.kind === 'operator' && replacement ? Number(replacement) : null;
  useEffect(() => {
    if (!operatorCandidate) return;
    let current = true;
    missionService.operatorAvailability(mission.startTime, mission.expectedEndTime, operatorCandidate)
      .then(result => { if (current) setSchedule(result.operatorAvailable ? 'available' : 'conflict'); })
      .catch(() => { if (current) setSchedule('error'); });
    return () => { current = false; };
  }, [operatorCandidate, mission.startTime, mission.expectedEndTime, retry]);
  const open = (kind: Kind, reservationId?: number) => {
    if (disabled || !allowed[kind]) return;
    const reservation = snapshot.reservations.find(r => r.id === reservationId);
    setForm({ kind, version: snapshot.version, reservationId, oldEquipmentId: reservation?.equipmentId, oldQuantity: reservation?.quantity });
    setReplacement(''); setReason(''); setQuantity(String(reservation?.quantity ?? 1)); setSchedule('idle');
  };
  const selectReplacement = (value: string) => { setReplacement(value); setSchedule(form?.kind === 'operator' && value ? 'checking' : 'idle'); };
  const candidates = !form ? [] : form.kind === 'station'
    ? stations.filter(s => s.status === 'ACTIVE' && s.id !== snapshot.stationId).map(s => ({ id: s.id, label: `${s.name} · ${s.code}` }))
    : form.kind === 'operator'
      ? operators.filter(o => o.id !== snapshot.operatorId && o.status === 'ACTIVE').map(o => ({ id: o.id, label: o.fullName || o.username }))
      : equipment.filter(e => e.status === 'ACTIVE' && (!mission.stationId || !e.stationId || e.stationId === mission.stationId) && (e.availableQuantity > 0 || e.id === form.oldEquipmentId)).map(e => ({ id: e.id, label: `${e.name} · Khả dụng ${e.availableQuantity}${e.id === form.oldEquipmentId ? ` + ${form.oldQuantity} đang giữ` : ''}` }));
  const item = equipment.find(e => String(e.id) === replacement);
  const available = (item?.availableQuantity ?? 0) + (item?.id === form?.oldEquipmentId ? form?.oldQuantity ?? 0 : 0);
  const validQuantity = Number.isSafeInteger(Number(quantity)) && Number(quantity) > 0 && Number(quantity) <= available;
  const validReplacement = !replacement || candidates.some(c => String(c.id) === replacement);
  const unchanged = form?.kind === 'equipment' && Number(replacement) === form.oldEquipmentId && Number(quantity) === form.oldQuantity;
  const formStale = !!form && form.version !== snapshot.version;
  const submitDisabled = disabled || formStale || !reason.trim() || !validReplacement || unchanged ||
    (form?.kind === 'equipment' && !!replacement && !validQuantity) || (form?.kind === 'operator' && !!replacement && schedule !== 'available');
  return <section className="mission-panel" aria-labelledby="resource-redispatch-title">
    <header><h2 id="resource-redispatch-title">Điều phối người vận hành, trạm và thiết bị</h2></header>
    <div className="mission-panel-body grid gap-4">
      <p className="mission-muted">Thay đổi trước khi bay cần lý do và kiểm tra lại tài nguyên. Nhiệm vụ đang sẵn sàng sẽ quay về bước bố trí; người vận hành cần xem lại phân công mới.</p>
      <div className="mission-actions">
        {allowed.operator && <Button disabled={disabled} variant="outline" onClick={() => open('operator')}>Đổi hoặc gỡ người vận hành</Button>}
        {allowed.station && <Button disabled={disabled} variant="outline" onClick={() => open('station')}>Đổi hoặc gỡ trạm</Button>}
      </div>
      <h3 className="font-semibold">Thiết bị đang giữ</h3>
      {snapshot.reservations.some(r => !r.released) ? <ul className="grid gap-3">{snapshot.reservations.filter(r => !r.released).map(r => <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
        <div className="min-w-0 break-words"><strong>{r.equipmentName}</strong><p className="mission-muted">Khoản giữ #{r.id} · Số lượng: {r.quantity}</p></div>
        {allowed.equipment && <Button disabled={disabled} variant="outline" aria-label={`Đổi hoặc hoàn trả khoản giữ ${r.id}`} onClick={() => open('equipment', r.id)}>Đổi / hoàn trả</Button>}
      </li>)}</ul> : <p className="mission-muted">Chưa giữ thiết bị nào. Cần giữ ít nhất một thiết bị hợp lệ trước khi sẵn sàng.</p>}
      {snapshot.reservations.some(r => r.released) && <details><summary className="cursor-pointer font-medium">Các khoản đã hoàn trả ({snapshot.reservations.filter(r => r.released).length})</summary><ul className="mt-2 grid gap-2">{snapshot.reservations.filter(r => r.released).map(r => <li key={r.id} className="mission-muted">{r.equipmentName} · {r.quantity} · Khoản #{r.id} đã hoàn trả</li>)}</ul></details>}
      {form && allowed[form.kind] && <form className="mission-note" aria-label={`Điều phối lại ${names[form.kind]}`} onSubmit={async event => {
        event.preventDefault(); if (submitDisabled) return;
        await action(() => form.kind === 'equipment'
          ? missionService.redispatchEquipment(mission.id, form.version, form.reservationId!, replacement ? Number(replacement) : null, replacement ? reservationQuantity(quantity, available) : null, reason)
          : missionService.redispatchResource(mission.id, form.kind, form.version, replacement ? Number(replacement) : null, reason));
        setForm(null);
      }}>
        <strong>Điều phối lại {names[form.kind]}</strong>
        {form.kind === 'station' && <p className="mission-muted">Trước khi đổi trạm, hãy gỡ UAV và hoàn trả thiết bị thuộc trạm khác. Gỡ trạm yêu cầu gỡ UAV và hoàn trả toàn bộ thiết bị. Người vận hành được giữ lại.</p>}
        {form.kind === 'equipment' && <p className="mission-muted">Khoản #{form.reservationId} đang giữ {form.oldQuantity}. Chọn lại cùng thiết bị để đổi số lượng; hệ thống trả khoản cũ và giữ khoản mới trong cùng một lần xử lý. Bỏ trống lựa chọn để hoàn trả toàn bộ khoản này.</p>}
        <label>{form.kind === 'equipment' ? 'Thiết bị thay thế' : form.kind === 'operator' ? 'Người vận hành thay thế' : 'Trạm thay thế'}<select autoFocus className="mt-2 min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3" disabled={disabled} value={replacement} onChange={e => selectReplacement(e.target.value)}>
          <option value="">{form.kind === 'equipment' ? 'Hoàn trả khoản giữ này' : `Gỡ ${names[form.kind]} hiện tại`}</option>{candidates.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select></label>
        {form.kind === 'operator' && !!replacement && <div role="status" className="mission-muted">{schedule === 'checking' ? 'Đang kiểm tra lịch…' : schedule === 'available' ? 'Chưa có lịch trùng. Hệ thống sẽ kiểm tra lại khi xác nhận.' : schedule === 'conflict' ? 'Người vận hành không khả dụng hoặc đã có lịch trùng. Hãy chọn người khác.' : 'Chưa kiểm tra được lịch.'}{schedule === 'error' && <Button type="button" disabled={disabled} variant="outline" onClick={() => { setSchedule('checking'); setRetry(v => v + 1); }}>Kiểm tra lịch lại</Button>}</div>}
        {form.kind === 'equipment' && !!replacement && <label>Số lượng mới<input className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3" type="number" min={1} max={available} step={1} inputMode="numeric" disabled={disabled} value={quantity} onChange={e => setQuantity(e.target.value)} /><span className="mission-muted">Tối đa có thể giữ: {available}. Đây là tổng số lượng mới của khoản đang đổi.</span></label>}
        <label>Lý do thay đổi tài nguyên<textarea required disabled={disabled} maxLength={missionEventNoteLimit} value={reason} onChange={e => setReason(e.target.value)} /><span className="mission-muted">Tối đa 500 ký tự. Lưu vào lịch sử nhiệm vụ.</span></label>
        {formStale && <p role="alert">Dữ liệu đã thay đổi. Hãy đóng biểu mẫu và mở lại để dùng phân công mới nhất.</p>}
        <div className="mission-actions"><Button type="button" disabled={disabled} variant="outline" onClick={() => setForm(null)}>Giữ nguyên tài nguyên</Button><Button type="submit" disabled={submitDisabled}>{replacement ? 'Xác nhận thay đổi tài nguyên' : form.kind === 'equipment' ? 'Xác nhận hoàn trả thiết bị' : 'Xác nhận gỡ tài nguyên'}</Button></div>
      </form>}
    </div>
  </section>;
}
