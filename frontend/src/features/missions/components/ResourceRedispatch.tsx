'use client';
import {useEffect, useState} from 'react';
import {Button} from '@/components/ui';
import type {Equipment, Operator, Station} from "@/types/resources";
import type {DispatchResources, Mission} from "@/features/missions/types/mission.types";
import {missionService} from "@/features/missions/services/mission.service";
import {missionEventNoteLimit, reservationQuantity} from "@/features/missions/workflows";
import {RequiredMark} from "@/components/shared/RequiredMark";
import {useI18n} from '@/contexts/I18nContext';

type Kind = 'operator' | 'station' | 'equipment';
type Form = { kind: Kind; version: number; reservationId?: number; oldEquipmentId?: number; oldQuantity?: number };

interface Props {
    snapshot: DispatchResources;
    stations: Station[];
    operators: Operator[];
    equipment: Equipment[];
    allowed: { operator: boolean; station: boolean; equipment: boolean };
    disabled: boolean;
    action: (run: () => Promise<Mission>) => Promise<void>;
}

export function ResourceRedispatch({snapshot, stations, operators, equipment, allowed, disabled, action}: Props) {
    const {t} = useI18n();
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
            .then(result => {
                if (current) setSchedule(result.operatorAvailable ? 'available' : 'conflict');
            })
            .catch(() => {
                if (current) setSchedule('error');
            });
        return () => {
            current = false;
        };
    }, [operatorCandidate, mission.startTime, mission.expectedEndTime, retry]);
    const open = (kind: Kind, reservationId?: number) => {
        if (disabled || !allowed[kind]) return;
        const reservation = snapshot.reservations.find(r => r.id === reservationId);
        setForm({
            kind,
            version: snapshot.version,
            reservationId,
            oldEquipmentId: reservation?.equipmentId,
            oldQuantity: reservation?.quantity
        });
        setReplacement('');
        setReason('');
        setQuantity(String(reservation?.quantity ?? 1));
        setSchedule('idle');
    };
    const selectReplacement = (value: string) => {
        setReplacement(value);
        setSchedule(form?.kind === 'operator' && value ? 'checking' : 'idle');
    };
    const candidates = !form ? [] : form.kind === 'station'
        ? stations.filter(s => s.status === 'ACTIVE' && s.id !== snapshot.stationId).map(s => ({
            id: s.id,
            label: `${s.name} · ${s.code}`
        }))
        : form.kind === 'operator'
            ? operators.filter(o => o.id !== snapshot.operatorId && o.status === 'ACTIVE').map(o => ({
                id: o.id,
                label: o.fullName || o.username
            }))
            : equipment.filter(e => e.status === 'ACTIVE' && (!mission.stationId || !e.stationId || e.stationId === mission.stationId) && (e.availableQuantity > 0 || e.id === form.oldEquipmentId)).map(e => ({
                id: e.id,
                label: e.id === form.oldEquipmentId ? t('opsMissions.redispatch.equipmentOptionHeld', {name: e.name, count: e.availableQuantity, held: form.oldQuantity ?? 0}) : t('opsMissions.redispatch.equipmentOption', {name: e.name, count: e.availableQuantity})
            }));
    const item = equipment.find(e => String(e.id) === replacement);
    const available = (item?.availableQuantity ?? 0) + (item?.id === form?.oldEquipmentId ? form?.oldQuantity ?? 0 : 0);
    const validQuantity = Number.isSafeInteger(Number(quantity)) && Number(quantity) > 0 && Number(quantity) <= available;
    const validReplacement = !replacement || candidates.some(c => String(c.id) === replacement);
    const unchanged = form?.kind === 'equipment' && Number(replacement) === form.oldEquipmentId && Number(quantity) === form.oldQuantity;
    const formStale = !!form && form.version !== snapshot.version;
    const submitDisabled = disabled || formStale || !reason.trim() || !validReplacement || unchanged ||
        (form?.kind === 'equipment' && !!replacement && !validQuantity) || (form?.kind === 'operator' && !!replacement && schedule !== 'available');
    return <section className="mission-panel" aria-labelledby="resource-redispatch-title">
        <header><h2 id="resource-redispatch-title">{t('opsMissions.redispatch.title')}</h2></header>
        <div className="mission-panel-body grid gap-4">
            <p className="mission-muted">{t('opsMissions.redispatch.description')}</p>
            <div className="mission-actions">
                {allowed.operator &&
                    <Button disabled={disabled} variant="outline" onClick={() => open('operator')}>{t('opsMissions.redispatch.changeOperator')}</Button>}
                {allowed.station &&
                    <Button disabled={disabled} variant="outline" onClick={() => open('station')}>{t('opsMissions.redispatch.changeStation')}</Button>}
            </div>
            <h3 className="font-semibold">{t('opsMissions.redispatch.reserved')}</h3>
            {snapshot.reservations.some(r => !r.released) ?
                <ul className="grid gap-3">{snapshot.reservations.filter(r => !r.released).map(r => <li key={r.id}
                                                                                                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                    <div className="min-w-0 break-words"><strong>{r.equipmentName}</strong><p
                        className="mission-muted">{t('opsMissions.redispatch.reservationLine', {id: r.id, quantity: r.quantity})}</p></div>
                    {allowed.equipment &&
                        <Button disabled={disabled} variant="outline" aria-label={t('opsMissions.redispatch.changeReservationLabel', {id: r.id})}
                                onClick={() => open('equipment', r.id)}>{t('opsMissions.redispatch.changeReservation')}</Button>}
                </li>)}</ul> :
                <p className="mission-muted">{t('opsMissions.redispatch.noReservations')}</p>}
            {snapshot.reservations.some(r => r.released) && <details>
                <summary className="cursor-pointer font-medium">{t('opsMissions.redispatch.released', {count: snapshot.reservations.filter(r => r.released).length})}</summary>
                <ul className="mt-2 grid gap-2">{snapshot.reservations.filter(r => r.released).map(r => <li key={r.id}
                                                                                                            className="mission-muted">{t('opsMissions.redispatch.releasedLine', {name: r.equipmentName, quantity: r.quantity, id: r.id})}</li>)}</ul>
            </details>}
            {form && allowed[form.kind] &&
                <form className="mission-note" aria-label={t('opsMissions.redispatch.formTitle', {kind: t(`opsMissions.redispatch.kind.${form.kind}`)})}
                      onSubmit={async event => {
                          event.preventDefault();
                          if (submitDisabled) return;
                          await action(() => form.kind === 'equipment'
                              ? missionService.redispatchEquipment(mission.id, form.version, form.reservationId!, replacement ? Number(replacement) : null, replacement ? reservationQuantity(quantity, available, t) : null, reason)
                              : missionService.redispatchResource(mission.id, form.kind, form.version, replacement ? Number(replacement) : null, reason));
                          setForm(null);
                      }}>
                    <strong>{t('opsMissions.redispatch.formTitle', {kind: t(`opsMissions.redispatch.kind.${form.kind}`)})}</strong>
                    {form.kind === 'station' &&
                        <p className="mission-muted">{t('opsMissions.redispatch.stationHint')}</p>}
                    {form.kind === 'equipment' &&
                        <p className="mission-muted">{t('opsMissions.redispatch.equipmentHint', {id: form.reservationId ?? '', quantity: form.oldQuantity ?? 0})}</p>}
                    <label>{form.kind === 'equipment' ? t('opsMissions.redispatch.replacementEquipment') : form.kind === 'operator' ? t('opsMissions.redispatch.replacementOperator') : t('opsMissions.redispatch.replacementStation')}<select
                        autoFocus
                        className="mt-2 min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3"
                        disabled={disabled} value={replacement} onChange={e => selectReplacement(e.target.value)}>
                        <option
                            value="">{form.kind === 'equipment' ? t('opsMissions.redispatch.releaseReservation') : t(`opsMissions.redispatch.removeCurrent.${form.kind}`)}</option>
                        {candidates.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select></label>
                    {form.kind === 'operator' && !!replacement && <div role="status"
                                                                       className="mission-muted">{schedule === 'checking' ? t('opsMissions.redispatch.schedule.checking') : schedule === 'available' ? t('opsMissions.redispatch.schedule.available') : schedule === 'conflict' ? t('opsMissions.redispatch.schedule.conflict') : t('opsMissions.redispatch.schedule.error')}{schedule === 'error' &&
                        <Button type="button" disabled={disabled} variant="outline" onClick={() => {
                            setSchedule('checking');
                            setRetry(v => v + 1);
                        }}>{t('opsMissions.redispatch.schedule.retry')}</Button>}</div>}
                    {form.kind === 'equipment' && !!replacement && <label>{t('opsMissions.redispatch.newQuantity')}<input
                        className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3" type="number" min={1}
                        max={available} step={1} inputMode="numeric" disabled={disabled} value={quantity}
                        onChange={e => setQuantity(e.target.value)}/><span
                        className="mission-muted">{t('opsMissions.redispatch.maxQuantity', {count: available})}</span></label>}
                    <label>{t('opsMissions.redispatch.reason')}<RequiredMark/><textarea required disabled={disabled}
                                                              maxLength={missionEventNoteLimit} value={reason}
                                                              onChange={e => setReason(e.target.value)}/><span
                        className="mission-muted">{t('opsMissions.redispatch.reasonHint', {count: missionEventNoteLimit})}</span></label>
                    {formStale && <p role="alert">{t('opsMissions.redispatch.stale')}</p>}
                    <div className="mission-actions"><Button type="button" disabled={disabled} variant="outline"
                                                             onClick={() => setForm(null)}>{t('opsMissions.redispatch.keep')}</Button><Button type="submit"
                                               disabled={submitDisabled}>{replacement ? t('opsMissions.redispatch.confirmChange') : form.kind === 'equipment' ? t('opsMissions.redispatch.confirmRelease') : t('opsMissions.redispatch.confirmRemove')}</Button>
                    </div>
                </form>}
        </div>
    </section>;
}
