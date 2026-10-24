'use client';
import {MEDIA_ACCEPT, MediaFileError, mediaUploadPolicy, mediaUploadRetention, validateMediaFile} from "@/lib/api/media-policy";
import {useCallback, useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {MissionRequestDetails} from '@/features/missions/components/MissionRequestDetails';
import {useParams, useRouter} from 'next/navigation';
import {ArrowLeft, CheckCircle2, Play} from 'lucide-react';
import {MissionTimeline} from "@/components/shared/MissionTimeline";
import {displayLabel, formatDate, missionHint, terminalStatuses} from "@/components/shared/presentation";
import {Alert, Button, Spinner} from '@/components/ui';
import {useAuth} from '@/contexts/AuthContext';
import {missionService} from '@/features/missions/services/mission.service';
import {ResourceRedispatch} from '@/features/missions/components/ResourceRedispatch';
import type {
    DispatchResources,
    MediaRole,
    Mission,
    MissionEvent,
    MissionMedia
} from '@/features/missions/types/mission.types';
import {MissionStatusBadge} from '@/features/missions/components/MissionStatusBadge';
import {missionControls} from '@/features/missions/presentation';
import {
    handoverEvidence,
    missionEventNoteLimit,
    MissionFormError,
    missionFormErrorKey,
    reservationQuantity
} from '@/features/missions/workflows';
import {collectPages} from '@/lib/collection';
import {ApiError} from '@/lib/api.client';
import {operationsService} from "@/lib/api/resources";
import type {Equipment, Operator, Station, Uav} from "@/types/resources";
import {AppShell} from '@/components/layout/AppShell';
import {RequiredMark} from "@/components/shared/RequiredMark";
import {useI18n} from '@/contexts/I18nContext';

type Confirmation = 'reject' | 'conflict' | 'complete' | 'cancel' | 'fail';
type Message = { key: string; params?: Record<string, string | number> } | { text: string };
type Section = 'timeline' | 'media' | 'stations' | 'uavs' | 'equipment' | 'operators';
// Backend error codes with a dedicated explanation under opsMissions.apiErrors.
const errorCodes = new Set([
    'MISSION_ACCEPTANCE_REQUIRED', 'MISSION_ACCEPTANCE_STALE', 'MISSION_HANDOVER_NOTES_REQUIRED',
    'MISSION_HANDOVER_RESULT_REQUIRED', 'MISSION_MEDIA_LOCKED', 'MISSION_DISPATCH_STALE', 'MISSION_RESERVATION_STALE',
    'MISSION_STATION_RESOURCES_CONFLICT', 'MISSION_RESERVATION_BALANCE_CONFLICT', 'MISSION_DISPATCH_REQUIRED',
    'OPERATOR_NOT_AVAILABLE', 'MISSION_RESOURCE_UNCHANGED', 'MISSION_UAV_ASSIGNMENT_STALE', 'MISSION_INVALID_STATUS',
    'MISSION_RESOURCE_MISSING', 'UAV_NOT_AVAILABLE', 'UAV_TIME_CONFLICT', 'OPERATOR_TIME_CONFLICT', 'INVENTORY_NOT_AVAILABLE',
]);
const codeMessage = (err: unknown, fallbackKey: string): Message => {
    const code = err instanceof Error ? err.message : '';
    return {key: errorCodes.has(code) ? `opsMissions.apiErrors.${code}` : fallbackKey};
};
export default function MissionDetailPage() {
    const {id} = useParams<{ id: string }>();
    return <MissionDetail key={id} id={id}/>;
}

function MissionDetail({id}: { id: string }) {
    const router = useRouter();
    const {user, isAuthenticated, isLoading, can, permissionsReady} = useAuth();
    const {t} = useI18n();
    const [mission, setMission] = useState<Mission | null>(null);
    const [dispatch, setDispatch] = useState<DispatchResources | null>(null);
    const [events, setEvents] = useState<MissionEvent[]>([]);
    const [media, setMedia] = useState<MissionMedia[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [uavs, setUavs] = useState<Uav[]>([]);
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [operators, setOperators] = useState<Operator[]>([]);
    const [busy, setBusy] = useState(false);
    const [uploading, setUploading] = useState(false);
    const actionLock = useRef(false);
    const loadGeneration = useRef(0);
    const [stale, setStale] = useState(false);
    const [error, setError] = useState<Message | null>(null);
    const [sectionErrors, setSectionErrors] = useState<Section[]>([]);
    const errorText = !error ? '' : 'text' in error ? error.text : t(error.key, error.params);
    const mutationError = useRef<HTMLDivElement>(null);
    const focusMutationError = useRef(false);
    const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
    const [note, setNote] = useState('');
    const [mediaRole, setMediaRole] = useState<MediaRole>('OUTPUT');
    const [downloading, setDownloading] = useState<number | null>(null);
    const [extraNote, setExtraNote] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [redispatch, setRedispatch] = useState<{
        kind: 'replaceUav' | 'unassignUav';
        expectedCurrentUavId: number
    } | null>(null);
    const [redispatchReason, setRedispatchReason] = useState('');
    const [replacementUavId, setReplacementUavId] = useState('');
    const [resourceIds, setResourceIds] = useState({station: '', uav: '', operator: '', equipment: ''});
    const readTimeline = permissionsReady && can('MISSION_TIMELINE_VIEW');
    const readMedia = permissionsReady && can('MISSION_MEDIA_VIEW');
    const readStations = permissionsReady && can('STATION_READ');
    const readUavs = permissionsReady && can('UAV_READ');
    const readEquipment = permissionsReady && can('INVENTORY_READ');
    const readOperators = permissionsReady && can('USER_READ');
    const load = useCallback(async () => {
        const generation = ++loadGeneration.current;
        const isCurrent = () => generation === loadGeneration.current;
        let result: Mission;
        try {
            const snapshot = await missionService.dispatchResources(Number(id));
            result = snapshot.mission;
            if (isCurrent()) setDispatch(snapshot);
        } catch (err) {
            if (!isCurrent()) return;
            throw err;
        }
        if (!isCurrent()) return;
        setMission(result);
        setStale(false);
        const failures: Section[] = [];
        const section = async <T, >(allowed: boolean, name: Section, request: () => Promise<T>, save: (data: T) => void) => {
            if (!allowed) return;
            try {
                const data = await request();
                if (isCurrent()) save(data);
            } catch {
                failures.push(name);
            }
        };
        await Promise.all([
            section(readTimeline, 'timeline', () => missionService.timeline(Number(id)), setEvents),
            section(readMedia, 'media', () => missionService.media(Number(id)), setMedia),
            section(readStations, 'stations', () => collectPages(page => operationsService.listStations(page)), setStations),
            section(readUavs, 'uavs', () => collectPages(page => operationsService.listUavs(page)), setUavs),
            section(readEquipment, 'equipment', () => collectPages(page => operationsService.listEquipment(page)), setEquipment),
            section(readOperators, 'operators', () => collectPages(page => operationsService.listOperators(page)), setOperators),
        ]);
        if (isCurrent()) setSectionErrors(failures);
    }, [id, readTimeline, readMedia, readStations, readUavs, readEquipment, readOperators]);
    useEffect(() => {
        if (!isLoading && !isAuthenticated) router.replace("/operations/login");
        else if (isAuthenticated && permissionsReady && id) {
            const timer = window.setTimeout(() => {
                void load().catch(() => setError({key: 'opsMissions.detail.errors.loadFailed'}));
            }, 0);
            return () => {
                window.clearTimeout(timer);
                loadGeneration.current += 1;
            };
        }
    }, [id, isAuthenticated, isLoading, permissionsReady, load, router]);
    useEffect(() => {
        if (!error || busy || uploading || !focusMutationError.current || !mutationError.current) return;
        focusMutationError.current = false;
        mutationError.current.focus({preventScroll: true});
        mutationError.current.scrollIntoView({block: 'center', behavior: 'instant'});
    }, [error, busy, uploading]);
    if (isLoading || !isAuthenticated || !permissionsReady || !mission || mission.id !== Number(id)) return <div
        className="min-h-screen flex items-center justify-center">{error ?
        <p role="alert" className="text-error">{errorText}</p> : <Spinner size="lg" label={t('opsMissions.detail.loading')}/>}</div>;
    const controls = missionControls(mission, user?.id, can);
    const disabled = busy || uploading || stale;
    const evidence = handoverEvidence(mission.missionType, media);
    const evidenceKnown = readMedia && !sectionErrors.includes('media');
    const canFinish = !evidence.required || (evidenceKnown && evidence.satisfied);
    const action = async (run: () => Promise<Mission>) => {
        if (disabled || actionLock.current) return;
        actionLock.current = true;
        loadGeneration.current += 1;
        setBusy(true);
        setError(null);
        try {
            setMission(await run());
            setConfirmation(null);
            setRedispatch(null);
            setNote('');
            setExtraNote('');
        } catch (err) {
            focusMutationError.current = true;
            setRedispatch(null);
            setError(err instanceof MissionFormError ? err.key ? {key: missionFormErrorKey(err.key), params: err.params} : {text: err.message} : err instanceof ApiError && err.status === 403 ? {key: 'opsMissions.detail.errors.forbidden'} : codeMessage(err, 'opsMissions.detail.errors.actionUnconfirmed'));
        } finally {
            try {
                await load();
            } catch {
                focusMutationError.current = true;
                setStale(true);
                setError({key: 'opsMissions.detail.errors.reloadStale'});
            }
            actionLock.current = false;
            setBusy(false);
        }
    };
    const uploadMedia = async (file: File) => {
        if (disabled || actionLock.current || !controls.upload) return;
        actionLock.current = true;
        loadGeneration.current += 1;
        setUploading(true);
        setError(null);
        try {
            // Validate here with the translator so a rejected file reports in the portal language.
            validateMediaFile(file, t);
            const signed = await missionService.requestMediaUpload(Number(id), file);
            await missionService.uploadFile(signed.url, file);
            await missionService.confirmMedia(Number(id), signed.mediaId);
            await missionService.attachMedia(Number(id), signed.mediaId, mediaRole);
            await load();
        } catch (err) {
            focusMutationError.current = true;
            setError(err instanceof MediaFileError ? {text: err.message} : codeMessage(err, 'opsMissions.detail.errors.uploadUnconfirmed'));
            try {
                await load();
            } catch {
                setStale(true);
            }
        } finally {
            actionLock.current = false;
            setUploading(false);
        }
    };
    const openConfirmation = (value: Confirmation) => {
        setRedispatch(null);
        setNote('');
        setExtraNote('');
        setConfirmation(value);
        setError(null);
    };
    const confirmAction = () => {
        if (!confirmation || !controls[confirmation]) return;
        if (['reject', 'conflict', 'fail', 'complete'].includes(confirmation) && !note.trim()) return;
        if (confirmation === 'complete' && (!extraNote.trim() || !canFinish)) return;
        const run = {
            reject: () => missionService.reject(mission.id, note.trim()),
            conflict: () => missionService.reportConflict(mission.id, note.trim()),
            complete: () => missionService.complete(mission.id, note, extraNote),
            cancel: () => missionService.cancel(mission.id),
            fail: () => missionService.fail(mission.id, note, extraNote)
        }[confirmation];
        void action(run);
    };
    const download = async (mediaId: number) => {
        setDownloading(mediaId);
        setError(null);
        try {
            const signed = await operationsService.downloadUrl(mediaId);
            window.open(signed.url, '_blank', 'noopener,noreferrer');
        } catch {
            focusMutationError.current = true;
            setError({key: 'opsMissions.detail.errors.downloadFailed'});
        } finally {
            setDownloading(null);
        }
    };
    const assignedStation = stations.find(s => s.id === mission.stationId);
    const assignedUav = uavs.find(u => u.id === mission.uavId);
    const assignedOperator = operators.find(o => o.id === mission.operatorId);
    const replacementUavs = uavs.filter(uav => uav.id !== mission.uavId && uav.status === 'AVAILABLE' && (!mission.stationId || !uav.stationId || uav.stationId === mission.stationId));
    const openRedispatch = (kind: 'replaceUav' | 'unassignUav') => {
        if (!mission.uavId || !controls[kind] || disabled) return;
        setConfirmation(null);
        setRedispatch({kind, expectedCurrentUavId: mission.uavId});
        setRedispatchReason('');
        setReplacementUavId('');
        setError(null);
    };
    const selectedEquipment = equipment.find(e => String(e.id) === resourceIds.equipment);
    const validQuantity = Number.isSafeInteger(Number(quantity)) && Number(quantity) > 0 && Number(quantity) <= (selectedEquipment?.availableQuantity ?? 0);
    const resources = [
        {
            key: 'station' as const,
            label: t('opsMissions.detail.resources.station'),
            placeholder: t('opsMissions.detail.resources.stationPlaceholder'),
            submitLabel: t('opsMissions.detail.resources.assignStation'),
            options: stations.filter(s => s.status === 'ACTIVE').map(s => ({id: s.id, label: `${s.name} · ${s.code}`})),
            run: () => missionService.assignStation(mission.id, Number(resourceIds.station))
        },
        {
            key: 'uav' as const,
            label: t('opsMissions.detail.resources.uav'),
            placeholder: t('opsMissions.detail.resources.uavPlaceholder'),
            submitLabel: t('opsMissions.detail.resources.assignUav'),
            options: uavs.filter(u => u.status === 'AVAILABLE' && (!mission.stationId || !u.stationId || u.stationId === mission.stationId)).map(u => ({
                id: u.id,
                label: `${u.serialNumber} · ${u.model}`
            })),
            run: () => missionService.assignUav(mission.id, Number(resourceIds.uav))
        },
        {
            key: 'operator' as const,
            label: t('opsMissions.detail.resources.operator'),
            placeholder: t('opsMissions.detail.resources.operatorPlaceholder'),
            submitLabel: t('opsMissions.detail.resources.assignOperator'),
            options: operators.filter(o => o.status === 'ACTIVE').map(o => ({
                id: o.id,
                label: o.fullName || o.username
            })),
            run: () => missionService.assignOperator(mission.id, Number(resourceIds.operator))
        },
        {
            key: 'equipment' as const,
            label: t('opsMissions.detail.resources.equipment'),
            placeholder: t('opsMissions.detail.resources.equipmentPlaceholder'),
            submitLabel: t('opsMissions.detail.resources.reserveEquipment'),
            options: equipment.filter(e => e.status === 'ACTIVE' && e.availableQuantity > 0 && (!mission.stationId || !e.stationId || e.stationId === mission.stationId)).map(e => ({
                id: e.id,
                label: t('opsMissions.detail.resources.equipmentOption', {name: e.name, count: e.availableQuantity})
            })),
            run: () => missionService.reserveEquipment(mission.id, Number(resourceIds.equipment), reservationQuantity(quantity, selectedEquipment?.availableQuantity ?? 0, t))
        },
    ];
    return <AppShell>
        <div className="mission-page">
            <Link href={can('MISSION_VIEW_ALL') ? "/operations/dispatch/missions" : "/operations/assigned-missions"}
                  className="mission-back"><ArrowLeft size={16} aria-hidden="true"/>{t('opsMissions.detail.backToList')}</Link>
            <section className="mission-hero" id="overview" aria-labelledby="mission-title">
                <div className="mission-hero-body">
                    <div className="mission-title-row">
                        <div><p className="mission-code">{mission.code}</p><h1 id="mission-title">{mission.title}</h1><p
                            className="mission-muted">{mission.locationName}</p></div>
                        <MissionStatusBadge status={mission.status}/></div>
                    <dl className="mission-facts"><Info label={t('opsMissions.detail.facts.type')}
                                                        value={displayLabel(mission.missionType)}/><Info
                        label={t('opsMissions.detail.facts.start')} value={formatDate(mission.startTime)}/><Info label={t('opsMissions.detail.facts.end')}
                                                                                             value={formatDate(mission.expectedEndTime)}/><Info
                        label={t('opsMissions.detail.facts.priority')} value={displayLabel(mission.priority)}/></dl>
                    {mission.description &&
                        <p className="mission-muted" style={{marginTop: 20}}>{mission.description}</p>}
                    <MissionRequestDetails mission={mission}/>
                </div>
                <div className="mission-guidance"><p>{missionHint(mission.status)}</p>
                    <div className="mission-actions">
                        {controls.submit && <Button disabled={disabled}
                                                    onClick={() => void action(() => missionService.submit(mission.id))}>{t('opsMissions.detail.actions.submit')}</Button>}
                        {controls.confirm && <Button disabled={disabled}
                                                     onClick={() => void action(() => missionService.confirm(mission.id))}>{t('opsMissions.detail.actions.confirm')}</Button>}
                        {controls.ready && <Button disabled={disabled}
                                                   onClick={() => void action(() => missionService.ready(mission.id))}>{t('opsMissions.detail.actions.ready')}</Button>}
                        {controls.accept && <Button disabled={disabled}
                                                    onClick={() => void action(() => missionService.accept(mission.id, mission.version))}>{t('opsMissions.detail.actions.accept')}</Button>}
                        {controls.start && <Button disabled={disabled}
                                                   onClick={() => void action(() => missionService.start(mission.id))}
                                                   leftIcon={<Play size={16}/>}>{t('opsMissions.detail.actions.start')}</Button>}
                        {controls.complete && <Button disabled={disabled} onClick={() => openConfirmation('complete')}
                                                      leftIcon={<CheckCircle2 size={16}/>}>{t('opsMissions.detail.actions.complete')}</Button>}
                        {controls.fail &&
                            <Button disabled={disabled} variant="danger" onClick={() => openConfirmation('fail')}>{t('opsMissions.detail.actions.fail')}</Button>}
                        {controls.conflict &&
                            <Button disabled={disabled} variant="outline" onClick={() => openConfirmation('conflict')}>{t('opsMissions.detail.actions.conflict')}</Button>}
                        {controls.reject &&
                            <Button disabled={disabled} variant="outline" onClick={() => openConfirmation('reject')}>{t('opsMissions.detail.actions.reject')}</Button>}
                        {controls.cancel &&
                            <Button disabled={disabled} variant="outline" onClick={() => openConfirmation('cancel')}>{t('opsMissions.detail.actions.cancel')}</Button>}
                        {busy && <span role="status">{t('opsMissions.detail.actions.processing')}</span>}
                    </div>
                </div>
            </section>
            {['CONFIRMED', 'RESOURCE_RESERVED', 'READY'].includes(mission.status) && !mission.operatorAccepted &&
                <div className="mission-note" role="status"><strong>{t('opsMissions.detail.awaitingAcceptance.title')}</strong><p>{t('opsMissions.detail.awaitingAcceptance.body')}</p></div>}
            {confirmation && controls[confirmation] &&
                <form className="mission-note" aria-label={t(`opsMissions.detail.confirm.${confirmation}.title`)} onSubmit={e => {
                    e.preventDefault();
                    confirmAction();
                }}>
                    <strong>{t(`opsMissions.detail.confirm.${confirmation}.title`)}</strong>
                    {confirmation === 'complete' && <div role="status">
                        <p>{evidence.required ? evidenceKnown ? t('opsMissions.detail.complete.evidenceCount', {count: evidence.count}) : t('opsMissions.detail.complete.evidenceUnknown') : t('opsMissions.detail.complete.evidenceOptional')}</p>{!canFinish &&
                        <a href="#media">{t('opsMissions.detail.complete.goToMedia')}</a>}<p>{t('opsMissions.detail.complete.warning')}</p></div>}
                    {confirmation === 'cancel' ?
                        <p className="mission-muted">{t('opsMissions.detail.cancelWarning')}</p> : <>
                            {confirmation === 'fail' &&
                                <p className="mission-muted">{t('opsMissions.detail.failWarning')}</p>}
                            <label>{confirmation === 'complete' ? t('opsMissions.detail.note.result') : confirmation === 'fail' ? t('opsMissions.detail.note.failureReason') : t('opsMissions.detail.note.reason')}<RequiredMark/>
                                <textarea autoFocus required disabled={disabled} maxLength={missionEventNoteLimit}
                                          value={note} onChange={e => setNote(e.target.value)}/>
                                <span className="mission-muted">{t('opsMissions.detail.note.maxLength', {count: missionEventNoteLimit})}</span>
                            </label>
                            {confirmation === 'fail' &&
                                <label>{t('opsMissions.detail.note.incident')}<textarea disabled={disabled} maxLength={2000}
                                                                         value={extraNote}
                                                                         onChange={e => setExtraNote(e.target.value)}/></label>}
                            {confirmation === 'complete' &&
                                <label>{t('opsMissions.detail.note.equipmentCondition')}<RequiredMark/><textarea required disabled={disabled}
                                                                                 aria-label={t('opsMissions.detail.note.equipmentCondition')}
                                                                                 maxLength={500} value={extraNote}
                                                                                 onChange={e => setExtraNote(e.target.value)}/><span
                                    className="mission-muted">{t('opsMissions.detail.note.equipmentConditionHint')}</span></label>}
                        </>}
                    <div className="mission-actions"><Button type="button" variant="outline" disabled={disabled}
                                                             onClick={() => setConfirmation(null)}>{t('opsMissions.detail.backAction')}</Button><Button type="submit" variant={confirmation === 'fail' ? 'danger' : 'primary'}
                                            disabled={disabled || (['reject', 'conflict', 'fail', 'complete'].includes(confirmation) && !note.trim()) || (confirmation === 'complete' && (!extraNote.trim() || !canFinish))}>{t(`opsMissions.detail.confirm.${confirmation}.submit`)}</Button>
                    </div>
                </form>}
            {error && <div ref={mutationError} role="alert" tabIndex={-1}><Alert role="presentation"
                                                                                 variant="error">{errorText}</Alert></div>}
            {stale && <Button variant="outline" disabled={busy || uploading} onClick={async () => {
                setBusy(true);
                try {
                    await load();
                    setError(null);
                } catch {
                    setError({key: 'opsMissions.detail.errors.reloadFailed'});
                } finally {
                    setBusy(false);
                }
            }}>{t('opsMissions.detail.reloadStatus')}</Button>}
            {sectionErrors.length > 0 &&
                <Alert variant="warning">{t('opsMissions.detail.sectionsFailed', {sections: sectionErrors.map(name => t(`opsMissions.detail.sections.${name}`)).join(', ')})} <button disabled={busy || uploading}
                                                                                            onClick={() => {
                                                                                                if (actionLock.current) return;
                                                                                                void load().catch(() => setError({key: 'opsMissions.detail.errors.reloadMissionFailed'}));
                                                                                            }}>{t('opsMissions.detail.retry')}</button></Alert>}
            <nav className="mission-sections" aria-label={t('opsMissions.detail.nav.label')}><a href="#resources">{t('opsMissions.detail.nav.resources')}</a><a
                href="#media">{t('opsMissions.detail.nav.media')}</a><a href="#timeline">{t('opsMissions.detail.nav.timeline')}</a></nav>
            {resources.some(r => controls[r.key]) && <section className="mission-panel">
                <header><h2>{t('opsMissions.detail.resources.title')}</h2></header>
                <div className="mission-panel-body mission-assignment">{resources.filter(r => controls[r.key]).map(r =>
                    <div key={r.key} className="grid gap-2">
                        <label>{r.label}<span className="mission-assignment-row"><select disabled={disabled}
                                                                                         aria-label={r.label}
                                                                                         value={resourceIds[r.key]}
                                                                                         onChange={e => {
                                                                                             setResourceIds(v => ({
                                                                                                 ...v,
                                                                                                 [r.key]: e.target.value
                                                                                             }));
                                                                                             if (r.key === 'equipment') setQuantity('1');
                                                                                         }}><option
                            value="">{r.placeholder}</option>
                            {r.options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select><Button
                            disabled={disabled || !r.options.some(o => String(o.id) === resourceIds[r.key]) || (r.key === 'equipment' && !validQuantity)}
                            variant="outline"
                            aria-label={r.submitLabel}
                            onClick={() => void action(r.run)}>{r.key === 'equipment' ? t('opsMissions.detail.resources.reserve') : t('opsMissions.detail.resources.assign')}</Button></span></label>
                        {r.key === 'equipment' &&
                            <label>{t('opsMissions.detail.resources.quantity')}<input className="h-11 rounded-lg border border-slate-300 px-3"
                                                      type="number" aria-label={t('opsMissions.detail.resources.quantity')} inputMode="numeric"
                                                      min={1} max={selectedEquipment?.availableQuantity} step={1}
                                                      disabled={disabled || !selectedEquipment} value={quantity}
                                                      onChange={e => setQuantity(e.target.value)}/><span
                                className="mission-muted">{selectedEquipment ? t('opsMissions.detail.resources.available', {count: selectedEquipment.availableQuantity}) : t('opsMissions.detail.resources.selectEquipmentFirst')}</span></label>}
                    </div>)}</div>
            </section>}
            {(controls.replaceUav || controls.unassignUav) &&
                <section className="mission-panel" aria-labelledby="redispatch-title">
                    <header><h2 id="redispatch-title">{t('opsMissions.detail.uav.title')}</h2></header>
                    <div className="mission-panel-body grid gap-4">
                        <p className="mission-muted">{t('opsMissions.detail.uav.description')}</p>
                        {!redispatch && <div className="mission-actions"><Button disabled={disabled} variant="outline"
                                                                                 onClick={() => openRedispatch('replaceUav')}>{t('opsMissions.detail.uav.replace')}</Button><Button disabled={disabled} variant="outline"
                                                onClick={() => openRedispatch('unassignUav')}>{t('opsMissions.detail.uav.unassign')}</Button></div>}
                        {redispatch && controls[redispatch.kind] && <form className="mission-note"
                                                                          aria-label={redispatch.kind === 'replaceUav' ? t('opsMissions.detail.uav.replaceForm') : t('opsMissions.detail.uav.unassignForm')}
                                                                          onSubmit={event => {
                                                                              event.preventDefault();
                                                                              if (!redispatchReason.trim() || (redispatch.kind === 'replaceUav' && !replacementUavs.some(uav => String(uav.id) === replacementUavId))) return;
                                                                              void action(() => redispatch.kind === 'replaceUav' ? missionService.replaceUav(mission.id, redispatch.expectedCurrentUavId, Number(replacementUavId), redispatchReason) : missionService.unassignUav(mission.id, redispatch.expectedCurrentUavId, redispatchReason));
                                                                          }}>
                            <strong>{redispatch.kind === 'replaceUav' ? t('opsMissions.detail.uav.confirmReplace') : t('opsMissions.detail.uav.confirmUnassign')}</strong>
                            <p className="mission-muted">{t('opsMissions.detail.uav.current', {uav: assignedUav?.serialNumber || `#${redispatch.expectedCurrentUavId}`})} {redispatch.kind === 'replaceUav' ? t('opsMissions.detail.uav.replaceHint') : t('opsMissions.detail.uav.unassignHint')}</p>
                            {redispatch.kind === 'replaceUav' && <label>{t('opsMissions.detail.uav.replacement')}<RequiredMark/><select
                                className="mt-2 min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3"
                                autoFocus required aria-label={t('opsMissions.detail.uav.replacement')} disabled={disabled}
                                value={replacementUavId} onChange={event => setReplacementUavId(event.target.value)}>
                                <option value="">{t('opsMissions.detail.uav.replacementPlaceholder')}</option>
                                {replacementUavs.map(uav => <option key={uav.id}
                                                                    value={uav.id}>{uav.serialNumber} · {uav.model}</option>)}
                            </select>{!replacementUavs.length &&
                                <span className="mission-muted">{t('opsMissions.detail.uav.noReplacement')}</span>}
                            </label>}
                            <label>{t('opsMissions.detail.uav.reason')}<RequiredMark/><textarea autoFocus={redispatch.kind === 'unassignUav'} required
                                                                disabled={disabled} maxLength={missionEventNoteLimit}
                                                                value={redispatchReason}
                                                                onChange={event => setRedispatchReason(event.target.value)}/><span
                                className="mission-muted">{t('opsMissions.detail.uav.reasonHint', {count: missionEventNoteLimit})}</span></label>
                            <div className="mission-actions"><Button type="button" disabled={disabled} variant="outline"
                                                                     onClick={() => setRedispatch(null)}>{t('opsMissions.detail.uav.keep')}</Button><Button type="submit"
                                                    disabled={disabled || !redispatchReason.trim() || (redispatch.kind === 'replaceUav' && !replacementUavs.some(uav => String(uav.id) === replacementUavId))}>{redispatch.kind === 'replaceUav' ? t('opsMissions.detail.uav.confirmReplace') : t('opsMissions.detail.uav.confirmUnassign')}</Button>
                            </div>
                        </form>}
                    </div>
                </section>}
            {dispatch &&
                <ResourceRedispatch snapshot={dispatch} stations={stations} operators={operators} equipment={equipment}
                                    disabled={disabled}
                                    allowed={{
                                        operator: controls.redispatchOperator,
                                        station: controls.redispatchStation,
                                        equipment: controls.redispatchEquipment
                                    }} action={action}/>}
            <div className="mission-grid">
                <div className="grid gap-5">
                    <section className="mission-panel" id="resources">
                        <header><h2>{t('opsMissions.detail.assigned.title')}</h2></header>
                        <div className="mission-panel-body">
                            <dl className="mission-resource-list"><Info label={t('opsMissions.detail.resources.station')}
                                                                        value={assignedStation?.name || (mission.stationId ? t('opsMissions.detail.assigned.stationFallback', {id: mission.stationId}) : t('opsMissions.detail.assigned.unassigned'))}/><Info
                                label="UAV"
                                value={assignedUav ? `${assignedUav.serialNumber} · ${assignedUav.model}` : mission.uavId ? t('opsMissions.detail.assigned.uavFallback', {id: mission.uavId}) : t('opsMissions.detail.assigned.unassigned')}/><Info
                                label={t('opsMissions.detail.resources.operator')}
                                value={assignedOperator?.fullName || assignedOperator?.username || (mission.operatorId === user?.id ? user?.fullName || user?.username || t('opsMissions.detail.assigned.you') : mission.operatorId ? t('opsMissions.detail.assigned.operatorFallback', {id: mission.operatorId}) : t('opsMissions.detail.assigned.unassigned'))}/>
                            </dl>
                            {mission.operatorId && <p className="mission-muted"
                                                      style={{marginTop: 16}}>{mission.operatorAccepted ? t('opsMissions.detail.assigned.accepted') : t('opsMissions.detail.assigned.notAccepted')}</p>}{mission.operatorConflictNote &&
                            <p className="mission-muted">{t('opsMissions.detail.assigned.conflict', {note: mission.operatorConflictNote})}</p>}</div>
                    </section>
                    {(mission.status === 'FAILED' || mission.status === 'COMPLETED') &&
                        <section className="mission-panel" aria-labelledby="mission-outcome-title">
                            <header><h2 id="mission-outcome-title">{t('opsMissions.detail.outcome.title')}</h2></header>
                            <div className="mission-panel-body">
                                <dl className="mission-resource-list">
                                    {mission.status === 'FAILED' ? <><Info label={t('opsMissions.detail.outcome.failureReason')}
                                                                           value={mission.failureReason || t('opsMissions.detail.outcome.none')}/>{mission.failureNotes &&
                                        <Info label={t('opsMissions.detail.outcome.incident')} value={mission.failureNotes}/>}</> : <><Info
                                        label={t('opsMissions.detail.outcome.billing')}
                                        value={mission.billingStatus === 'PENDING' ? t('opsMissions.detail.outcome.billingPending') : mission.billingStatus === 'ERROR' ? t('opsMissions.detail.outcome.billingError') : mission.billingStatus === 'ISSUED' ? t('opsMissions.detail.outcome.billingIssued') : t('opsMissions.detail.outcome.billingNone')}/><Info
                                        label={t('opsMissions.detail.outcome.result')}
                                        value={mission.completionNote || t('opsMissions.detail.outcome.none')}/>{mission.equipmentCondition &&
                                        <Info label={t('opsMissions.detail.outcome.equipmentCondition')}
                                              value={mission.equipmentCondition}/>}</>}
                                </dl>
                            </div>
                        </section>}
                    <section className="mission-panel" id="media">
                        <header><h2>{t('opsMissions.detail.media.title')}</h2><span className="mission-count">{t('opsMissions.detail.media.count', {count: media.length})}</span>
                        </header>
                        <div className="mission-panel-body">
                            {controls.upload && <><label>{t('opsMissions.detail.media.role')}<select
                                className="mt-2 mb-3 min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3"
                                aria-label={t('opsMissions.detail.media.role')} disabled={disabled} value={mediaRole}
                                onChange={e => setMediaRole(e.target.value as MediaRole)}>
                                <option value="OUTPUT">{t('opsMissions.detail.media.roleOutput')}</option>
                                <option value="DOCUMENT">{t('opsMissions.detail.media.roleDocument')}</option>
                                <option value="FLIGHT_DATA">{t('opsMissions.detail.media.roleFlightData')}</option>
                            </select></label><label className="mission-upload" aria-disabled={disabled}><input
                                type="file" accept={MEDIA_ACCEPT} className="sr-only" disabled={disabled}
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) void uploadMedia(file);
                                    e.target.value = '';
                                }}/>{uploading ? t('opsMissions.detail.media.uploading') : t('opsMissions.detail.media.upload')}</label><p
                                className="mission-muted">{mediaUploadPolicy(t)} {mediaUploadRetention(t)} {t('opsMissions.detail.media.uploadHint')}</p></>}
                            {!readMedia ?
                                <p className="mission-muted">{t('opsMissions.detail.media.noPermission')}</p> : media.length ?
                                    <ul className="mission-files">{media.map(item => <li className="mission-file"
                                                                                         key={item.id}>
                                        <div className="mission-file-info"><span
                                            className="mission-file-name">{item.media.originalName}</span><span
                                            className="mission-file-meta">{displayLabel(item.mediaRole)} · {Math.max(1, Math.ceil(item.media.size / 1000))} KB</span>
                                        </div>
                                        {can('MEDIA_READ') && <Button variant="outline" disabled={downloading !== null}
                                                                      onClick={() => void download(item.media.id)}>{downloading === item.media.id ? t('opsMissions.detail.media.downloading') : t('opsMissions.detail.media.download')}</Button>}
                                    </li>)}</ul> : <p className="mission-empty">{t('opsMissions.detail.media.empty')}</p>}
                            {terminalStatuses.includes(mission.status) &&
                                <p className="mission-muted" style={{marginTop: 16}}>{t('opsMissions.detail.media.locked')}</p>}
                        </div>
                    </section>
                </div>
                <section className="mission-panel" id="timeline">
                    <header><h2>{t('opsMissions.detail.timeline.title')}</h2></header>
                    <div className="mission-panel-body">{readTimeline ? <MissionTimeline events={events} showActor/> :
                        <p className="mission-muted">{t('opsMissions.detail.timeline.noPermission')}</p>}</div>
                </section>
            </div>
        </div>
    </AppShell>;
}

function Info({label, value}: { label: string; value: string }) {
    return <div>
        <dt>{label}</dt>
        <dd>{value}</dd>
    </div>;
}
