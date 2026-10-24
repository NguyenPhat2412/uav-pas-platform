'use client';
import {useRef, useState} from 'react';
import {Alert, Button} from '@/components/ui';
import {ApiError} from '@/lib/api.client';
import {useOperationMutation} from "@/hooks/useOperations";
import {operationsService} from "@/lib/api/resources";
import type {Station, Uav} from "@/types/resources";
import {uavControls, uavReasonLimit} from "@/features/uavs/workflows";
import {RequiredMark} from "@/components/shared/RequiredMark";
import {useI18n} from '@/contexts/I18nContext';

const errorCodes = new Set([
    'UAV_HAS_IN_PROGRESS_REPAIR_ORDER',
    'UAV_HAS_ACTIVE_MISSION',
    'UAV_NOT_AVAILABLE',
    'UAV_INVALID_STATUS',
    'UAV_STATUS_CHANGED',
    'UAV_ALREADY_IN_MAINTENANCE',
    'UAV_STATUS_REASON_REQUIRED',
    'UAV_STATUS_REASON_TOO_LONG',
    'UAV_STATUS_REQUIRES_MISSION_WORKFLOW',
    'UAV_NOT_AVAILABLE_FOR_STATION_TRANSFER',
    'STATION_NOT_ACTIVE',
]);

export function UavLifecyclePanel({uav, mode, stations, canReadStations, onRefresh, onBusy}: {
    uav: Uav; mode: 'maintenance' | 'assignment'; stations: Station[]; canReadStations: boolean;
    onRefresh: () => Promise<boolean>; onBusy: (value: boolean) => void;
}) {
    const {t} = useI18n();
    const controls = uavControls(uav.status, true);
    const [confirmation, setConfirmation] = useState<{
        action: 'maintenance' | 'recover';
        expectedStatus: string
    } | null>(null);
    const [reason, setReason] = useState('');
    const [stationId, setStationId] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [stale, setStale] = useState(false);
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);
    const maintenance = useOperationMutation(operationsService.maintenanceUav, ['uavs', 'dashboard', 'audit']);
    const recover = useOperationMutation(operationsService.completeUavMaintenance, ['uavs', 'dashboard', 'audit']);
    const assign = useOperationMutation(({id, stationId}: {
        id: number;
        stationId: number
    }) => operationsService.assignUav(id, stationId), ['uavs', 'audit']);
    const run = async (request: () => Promise<Uav>, message: string) => {
        if (lock.current || stale) return;
        lock.current = true;
        setBusy(true);
        onBusy(true);
        setError('');
        setSuccess('');
        try {
            await request();
            setConfirmation(null);
            setReason('');
            setStationId('');
            setSuccess(message);
        } catch (err) {
            setConfirmation(null);
            const code = err instanceof Error ? err.message : '';
            setError(err instanceof ApiError && err.status === 403 ? 'opsAssets.uavLifecycle.errors.forbidden' : errorCodes.has(code) ? `opsAssets.uavLifecycle.errors.${code}` : err instanceof ApiError && err.status === 409 ? 'opsAssets.uavLifecycle.errors.conflict' : 'opsAssets.uavLifecycle.errors.unknown');
        } finally {
            try {
                const fresh = await onRefresh();
                setStale(!fresh);
                if (!fresh) setError('opsAssets.uavLifecycle.errors.staleReload');
            } catch {
                setStale(true);
                setError('opsAssets.uavLifecycle.errors.staleReload');
            }
            lock.current = false;
            setBusy(false);
            onBusy(false);
        }
    };
    const open = (action: 'maintenance' | 'recover') => {
        setConfirmation({action, expectedStatus: uav.status});
        setReason('');
        setError('');
        setSuccess('');
    };
    const blocked = busy || stale;
    const legacyRecovery = (confirmation?.expectedStatus || uav.status) === 'ASSIGNED';
    const variant = confirmation?.action === 'maintenance' ? 'maintenance' : legacyRecovery ? 'recover' : 'complete';
    const text = (group: string) => t(`opsAssets.uavLifecycle.${group}.${variant}`);
    return <div className="space-y-4">
        {error && <Alert variant="error">{t(error)}</Alert>}
        {success && <Alert variant="success" role="status">{t(success)}</Alert>}
        {busy && <p role="status" className="text-sm text-slate-600">{t('opsAssets.uavLifecycle.updating')}</p>}
        {stale && <Button disabled={busy} variant="outline" onClick={async () => {
            if (lock.current) return;
            lock.current = true;
            setBusy(true);
            onBusy(true);
            try {
                const fresh = await onRefresh();
                setStale(!fresh);
                if (fresh) setError('');
            } catch {
                setError('opsAssets.uavLifecycle.errors.staleRetry');
            } finally {
                lock.current = false;
                setBusy(false);
                onBusy(false);
            }
        }}>{t('opsAssets.uavLifecycle.reloadStatus')}</Button>}
        {controls.busy &&
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-slate-700">{t('opsAssets.uavLifecycle.busyNote')}</p>}
        {mode === 'maintenance' && <>
            <p className="text-sm text-slate-600">{t('opsAssets.uavLifecycle.maintenanceNote')}</p>
            {!confirmation && <div className="flex flex-wrap gap-3">
                {controls.maintenance && <Button className="min-h-11" disabled={blocked} variant="outline"
                                                 onClick={() => open('maintenance')}>{t('opsAssets.uavLifecycle.enterMaintenance')}</Button>}
                {controls.recover &&
                    <Button className="min-h-11" disabled={blocked} variant={legacyRecovery ? 'outline' : 'primary'}
                            onClick={() => open('recover')}>{legacyRecovery ? t('opsAssets.uavLifecycle.recoverLegacy') : t('opsAssets.uavLifecycle.completeMaintenance')}</Button>}
            </div>}
            {confirmation && <form
                aria-label={text('form')}
                className="schema-form grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
                onSubmit={event => {
                    event.preventDefault();
                    if (!reason.trim() || reason.trim().length > uavReasonLimit) return;
                    const input = {id: uav.id, reason, expectedStatus: confirmation.expectedStatus};
                    void run(() => confirmation.action === 'maintenance' ? maintenance.mutateAsync(input) : recover.mutateAsync(input), `opsAssets.uavLifecycle.success.${variant}`);
                }}>
                <strong>{text('heading')}</strong>
                <p className="text-sm text-slate-600">{uav.serialNumber} · {text('desc')}</p>
                <div className="form-field"><label
                    htmlFor="uav-change-reason">{text('label')}<RequiredMark/></label><textarea
                    id="uav-change-reason" autoFocus required disabled={blocked} maxLength={uavReasonLimit}
                    value={reason} onChange={event => setReason(event.target.value)}
                    className="min-h-24 w-full rounded-lg border border-slate-300 p-3"/><span
                    className="text-xs text-slate-600">{t('opsAssets.uavLifecycle.maxChars', {max: uavReasonLimit})}</span></div>
                <div className="flex flex-wrap gap-3"><Button type="button" className="min-h-11" disabled={blocked}
                                                              variant="outline" onClick={() => setConfirmation(null)}>{t('opsAssets.uavLifecycle.back')}</Button><Button type="submit" className="min-h-11"
                                        disabled={blocked || !reason.trim()}>{text('submit')}</Button>
                </div>
            </form>}
        </>}
        {mode === 'assignment' && (!canReadStations ?
            <p className="text-sm text-slate-600">{t('opsAssets.uavLifecycle.needStationRead')}</p> : controls.station ?
                <form className="schema-form grid gap-4" aria-label={t('opsAssets.uavLifecycle.transferForm')} onSubmit={event => {
                    event.preventDefault();
                    if (!stations.some(station => station.id === Number(stationId) && station.status === 'ACTIVE') || Number(stationId) === uav.stationId) return;
                    void run(() => assign.mutateAsync({
                        id: uav.id,
                        stationId: Number(stationId)
                    }), 'opsAssets.uavLifecycle.success.station');
                }}>
                    <p className="text-sm text-slate-600">{t('opsAssets.uavLifecycle.transferNote')}</p>
                    <div className="form-field"><label htmlFor="uav-station">{t('opsAssets.uavLifecycle.targetStation')}<RequiredMark/></label><select
                        id="uav-station" required
                        className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm" disabled={blocked}
                        value={stationId} onChange={event => setStationId(event.target.value)}>
                        <option value="">{t('opsAssets.uavLifecycle.selectStation')}</option>
                        {stations.filter(station => station.status === 'ACTIVE' && station.id !== uav.stationId).map(station =>
                            <option key={station.id} value={station.id}>{station.name} · {station.code}</option>)}
                    </select></div>
                    <Button type="submit" className="min-h-11" disabled={blocked || !stationId}>{t('opsAssets.uavLifecycle.confirmStation')}</Button>
                </form> : !controls.busy ?
                    <p className="text-sm text-slate-600">{t('opsAssets.uavLifecycle.mustBeAvailable')}</p> : null)}
    </div>;
}
