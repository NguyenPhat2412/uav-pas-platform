'use client';
import {MEDIA_ACCEPT, mediaUploadPolicy, mediaUploadRetention} from "@/features/media/utils/media-policy";
import {useCallback, useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {MissionRequestDetails} from '@/features/missions/components/MissionRequestDetails';
import {MissionMonitoring} from '@/features/missions/components/customer/MissionMonitoring';
import {useParams, useRouter} from 'next/navigation';
import {ArrowLeft, CheckCircle2, Play} from 'lucide-react';
import {MissionTimeline} from "@/components/shared/MissionTimeline";
import {displayLabel, formatDate, missionHint, terminalStatuses} from "@/components/shared/presentation";
import {Alert, Button, Spinner} from '@/components/ui';
import {useAuth} from '@/providers/AuthContext';
import {missionService} from '@/features/missions/api/missions.api';
import {stationsService} from '@/features/stations/api/stations.api';
import {uavsService} from '@/features/uavs/api/uavs.api';
import {inventoryService} from '@/features/inventory/api/inventory.api';
import {operatorsService} from '@/features/users/api/operators.api';
import {mediaService} from '@/features/media/api/media.api';
import {ResourceRedispatch} from '@/features/missions/components/ResourceRedispatch';
import type {
    DispatchResources,
    MediaRole,
    Mission,
    MissionConfirmationKind as Confirmation,
    MissionDetailSection as Section,
    MissionEvent,
    MissionMedia,
    MissionNoticeMessage as Message,
} from '@/features/missions/types/mission.types';
import {MissionStatusBadge} from '@/features/missions/components/MissionStatusBadge';
import {missionControls} from '@/features/missions/utils/presentation';
import {
    handoverEvidence,
    reservationQuantity
} from '@/features/missions/utils/workflows';
import {collectPages} from '@/lib/api/collection';
import {ApiError} from '@/lib/api';
import type {Equipment, Operator, Station, Uav} from "@/types/resources";
import {AppShell} from '@/components/layout/AppShell';
import {RequiredMark} from "@/components/shared/RequiredMark";
import {parseEntityId} from "@/lib/url-slugs";
import {useI18n} from '@/providers/I18nContext';
import {useMissionWeather} from '@/features/weather/hooks/useWeather';
import {PreflightWeatherCard} from '@/features/weather/components/PreflightWeatherCard';

// Backend error codes with a dedicated explanation under opsMissions.apiErrors.
const errorCodes = new Set([
    'MISSION_ACCEPTANCE_REQUIRED', 'MISSION_ACCEPTANCE_STALE', 'MISSION_HANDOVER_NOTES_REQUIRED',
    'MISSION_HANDOVER_RESULT_REQUIRED', 'MISSION_MEDIA_LOCKED', 'MISSION_DISPATCH_STALE', 'MISSION_RESERVATION_STALE',
    'MISSION_STATION_RESOURCES_CONFLICT', 'MISSION_RESERVATION_BALANCE_CONFLICT', 'MISSION_DISPATCH_REQUIRED',
    'OPERATOR_NOT_AVAILABLE', 'MISSION_RESOURCE_UNCHANGED', 'MISSION_UAV_ASSIGNMENT_STALE', 'MISSION_INVALID_STATUS',
    'MISSION_RESOURCE_MISSING', 'UAV_NOT_AVAILABLE', 'UAV_TIME_CONFLICT', 'OPERATOR_TIME_CONFLICT', 'INVENTORY_NOT_AVAILABLE',
    'MISSION_WEATHER_UNSAFE',
]);
const codeMessage = (err: unknown, fallbackKey: string): Message => {
    const code = err instanceof Error ? err.message : '';
    if (errorCodes.has(code)) return {key: `opsMissions.apiErrors.${code}`};
    // Rule errors now arrive as readable Vietnamese from the API; show them rather than a generic fallback.
    if (err instanceof ApiError && code && !/^[A-Z0-9_]+$/.test(code)) return {text: code};
    return {key: fallbackKey};
};
export default function MissionDetailPage() {
    const {id} = useParams<{ id: string }>();
    return <MissionDetail key={id} id={id}/>;
}

function MissionDetail({id}: { id: string }) {
    const missionId = parseEntityId(id);
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
    // Take-off weather matters until the flight is over; it follows the mission's site and start time.
    const weatherRelevant = !!mission && mission.latitude != null && mission.longitude != null
        && !['COMPLETED', 'CANCELLED', 'FAILED', 'REJECTED'].includes(mission.status);
    const weather = useMissionWeather(mission?.id, weatherRelevant);
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
            const snapshot = await missionService.dispatchResources(missionId);
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
            section(readTimeline, 'timeline', () => missionService.timeline(missionId), setEvents),
            section(readMedia, 'media', () => missionService.media(missionId), setMedia),
            section(readStations, 'stations', () => collectPages(page => stationsService.listStations(page)), setStations),
            section(readUavs, 'uavs', () => collectPages(page => uavsService.listUavs(page)), setUavs),
            section(readEquipment, 'equipment', () => collectPages(page => inventoryService.listEquipment(page)), setEquipment),
            section(readOperators, 'operators', () => collectPages(page => operatorsService.listOperators(page)), setOperators),
        ]);
        if (isCurrent()) setSectionErrors(failures);
    }, [missionId, readTimeline, readMedia, readStations, readUavs, readEquipment, readOperators]);
    useEffect(() => {
        if (!isLoading && !isAuthenticated) router.replace("/operations/login");
        else if (isAuthenticated && permissionsReady && Number.isSafeInteger(missionId) && missionId > 0) {
            const timer = window.setTimeout(() => {
                void load().catch(() => setError({key: 'opsMissions.detail.errors.loadFailed'}));
            }, 0);
            return () => {
                window.clearTimeout(timer);
                loadGeneration.current += 1;
            };
        }
    }, [missionId, isAuthenticated, isLoading, permissionsReady, load, router]);
    useEffect(() => {
        if (!error || busy || uploading || !focusMutationError.current || !mutationError.current) return;
        focusMutationError.current = false;
        mutationError.current.focus({preventScroll: true});
        mutationError.current.scrollIntoView({block: 'center', behavior: 'instant'});
    }, [error, busy, uploading]);
    if (isLoading || !isAuthenticated || !permissionsReady || !mission || mission.id !== missionId) return <div
        className="flex min-h-screen items-center justify-center">{error ?
        <p role="alert" className="text-danger">{errorText}</p> : <Spinner size="lg" label={t('opsMissions.detail.loading')}/>}</div>;
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
            setError(err instanceof ApiError && err.status === 403 ? {key: 'opsMissions.detail.errors.forbidden'} : codeMessage(err, 'opsMissions.detail.errors.actionUnconfirmed'));
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
            const signed = await missionService.requestMediaUpload(missionId, file);
            await missionService.uploadFile(signed.url, file);
            await missionService.confirmMedia(missionId, signed.mediaId);
            await missionService.attachMedia(missionId, signed.mediaId, mediaRole);
            await load();
        } catch (err) {
            focusMutationError.current = true;
            setError(codeMessage(err, 'opsMissions.detail.errors.uploadUnconfirmed'));
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
        if (['reject', 'conflict', 'fail', 'forceFail', 'complete'].includes(confirmation) && !note.trim()) return;
        if (confirmation === 'complete' && (!extraNote.trim() || !canFinish)) return;
        const run = {
            reject: () => missionService.reject(mission.id, note.trim()),
            conflict: () => missionService.reportConflict(mission.id, note.trim()),
            complete: () => missionService.complete(mission.id, note, extraNote),
            cancel: () => missionService.cancel(mission.id),
            fail: () => missionService.fail(mission.id, note, extraNote),
            forceFail: () => missionService.forceFail(mission.id, note, extraNote)
        }[confirmation];
        void action(run);
    };
    const download = async (mediaId: number) => {
        setDownloading(mediaId);
        setError(null);
        try {
            const signed = await mediaService.downloadUrl(mediaId);
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
            run: () => missionService.reserveEquipment(mission.id, Number(resourceIds.equipment), reservationQuantity(quantity))
        },
    ];
    const panelClass = 'min-w-0 overflow-hidden rounded-panel border border-border bg-card';
    const panelHeaderClass = 'flex items-center justify-between gap-3 border-b border-border px-5 py-4 md:px-6 md:py-5';
    const panelTitleClass = 'm-0 text-lg font-bold text-foreground';
    const panelBodyClass = 'p-5 md:p-6';
    const mutedClass = 'm-0 text-sm leading-relaxed text-muted';
    const noteCardClass = 'grid gap-3 rounded-panel border border-border bg-background p-4 md:p-5';
    const actionsClass = 'flex flex-wrap items-center gap-2.5';
    const selectClass = 'min-h-11 w-full min-w-0 rounded-control border border-border-input bg-card px-3 text-sm font-normal text-foreground';
    const textareaClass = 'min-h-22 w-full min-w-0 rounded-control border border-border-input bg-card p-2.5 text-sm font-normal text-foreground';
    const navPillClass = 'inline-flex min-h-11 items-center rounded-control border border-border bg-card px-4 py-2 text-xs font-semibold text-muted transition-colors hover:bg-uav-red-light hover:text-primary';
    return <AppShell>
        <div className="grid gap-4 leading-normal text-foreground md:gap-6 [&_[id]]:scroll-mt-6">
            <Link href={can('MISSION_VIEW_ALL') ? "/operations/dispatch/missions" : "/operations/assigned-missions"}
                  className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft size={16} aria-hidden="true"/>{t('opsMissions.detail.backToList')}</Link>
            <section className={panelClass} id="overview" aria-labelledby="mission-title">
                <div className="p-5 md:p-7">
                    <div className="flex flex-col-reverse items-start justify-between gap-3 md:flex-row md:gap-5">
                        <div className="min-w-0"><p className="m-0 text-xs font-bold tracking-wider text-primary">{mission.code}</p><h1 id="mission-title" className="my-2 break-words text-2xl font-extrabold leading-tight tracking-tight text-foreground md:text-3xl">{mission.title}</h1><p
                            className={mutedClass}>{mission.locationName}</p></div>
                        <MissionStatusBadge status={mission.status}/></div>
                    <dl className="m-0 mt-6 grid grid-cols-2 gap-4.5 md:grid-cols-4 md:gap-5"><Info label={t('opsMissions.detail.facts.type')}
                                                        value={displayLabel(mission.missionType)}/><Info
                        label={t('opsMissions.detail.facts.start')} value={formatDate(mission.startTime)}/><Info label={t('opsMissions.detail.facts.end')}
                                                                                             value={formatDate(mission.expectedEndTime)}/><Info
                        label={t('opsMissions.detail.facts.priority')} value={displayLabel(mission.priority)}/></dl>
                    {mission.description &&
                        <p className="m-0 mt-5 text-sm leading-relaxed text-muted">{mission.description}</p>}
                    <MissionRequestDetails mission={mission}/>
                    {weatherRelevant && <PreflightWeatherCard className="mt-5" assessment={weather.data}
                                                              isPending={weather.isPending} isError={weather.isError}/>}
                </div>
                <div className="flex flex-col items-stretch justify-between gap-4 border-t border-border bg-background px-5 py-4 md:flex-row md:items-center md:px-7"><p className="m-0 max-w-[70ch] text-sm text-muted">{missionHint(mission.status)}</p>
                    <div className="flex w-full flex-wrap items-center gap-2.5 md:w-auto">
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
                        {controls.forceFail &&
                            <Button disabled={disabled} variant="danger" onClick={() => openConfirmation('forceFail')}>{t('opsMissions.detail.actions.forceFail')}</Button>}
                        {controls.conflict &&
                            <Button disabled={disabled} variant="outline" onClick={() => openConfirmation('conflict')}>{t('opsMissions.detail.actions.conflict')}</Button>}
                        {controls.reject &&
                            <Button disabled={disabled} variant="outline" onClick={() => openConfirmation('reject')}>{t('opsMissions.detail.actions.reject')}</Button>}
                        {controls.cancel &&
                            <Button disabled={disabled} variant="outline" onClick={() => openConfirmation('cancel')}>{t('opsMissions.detail.actions.cancel')}</Button>}
                        {busy && <span role="status" className="text-sm text-muted">{t('opsMissions.detail.actions.processing')}</span>}
                    </div>
                </div>
            </section>
            {['CONFIRMED', 'RESOURCE_RESERVED', 'READY'].includes(mission.status) && !mission.operatorAccepted &&
                <div className={noteCardClass} role="status"><strong>{t('opsMissions.detail.awaitingAcceptance.title')}</strong><p className="m-0 text-sm text-muted">{t('opsMissions.detail.awaitingAcceptance.body')}</p></div>}
            {confirmation && controls[confirmation] &&
                <form className={noteCardClass} aria-label={t(`opsMissions.detail.confirm.${confirmation}.title`)} onSubmit={e => {
                    e.preventDefault();
                    confirmAction();
                }}>
                    <strong>{t(`opsMissions.detail.confirm.${confirmation}.title`)}</strong>
                    {confirmation === 'complete' && <div role="status" className="grid gap-1.5 text-sm text-foreground">
                        <p className="m-0">{evidence.required ? evidenceKnown ? t('opsMissions.detail.complete.evidenceCount', {count: evidence.count}) : t('opsMissions.detail.complete.evidenceUnknown') : t('opsMissions.detail.complete.evidenceOptional')}</p>{!canFinish &&
                        <a href="#media" className="font-semibold text-primary hover:underline">{t('opsMissions.detail.complete.goToMedia')}</a>}<p className={mutedClass}>{t('opsMissions.detail.complete.warning')}</p></div>}
                    {confirmation === 'cancel' ?
                        <p className={mutedClass}>{t('opsMissions.detail.cancelWarning')}</p> : <>
                            {confirmation === 'fail' &&
                                <p className={mutedClass}>{t('opsMissions.detail.failWarning')}</p>}
                            {confirmation === 'forceFail' &&
                                <p className={mutedClass}>{t('opsMissions.detail.forceFailWarning')}</p>}
                            <label className="grid gap-1.5 text-sm font-semibold text-foreground"><span>{confirmation === 'complete' ? t('opsMissions.detail.note.result') : confirmation === 'fail' || confirmation === 'forceFail' ? t('opsMissions.detail.note.failureReason') : t('opsMissions.detail.note.reason')}<RequiredMark/></span>
                                <textarea autoFocus aria-required disabled={disabled} className={textareaClass}
                                          value={note} onChange={e => setNote(e.target.value)}/>
                                <span className="text-sm font-normal leading-relaxed text-muted">{t('opsMissions.detail.note.maxLength', {count: 500})}</span>
                            </label>
                            {(confirmation === 'fail' || confirmation === 'forceFail') &&
                                <label className="grid gap-1.5 text-sm font-semibold text-foreground">{t('opsMissions.detail.note.incident')}<textarea disabled={disabled} className={textareaClass}
                                                                         value={extraNote}
                                                                         onChange={e => setExtraNote(e.target.value)}/></label>}
                            {confirmation === 'complete' &&
                                <label className="grid gap-1.5 text-sm font-semibold text-foreground"><span>{t('opsMissions.detail.note.equipmentCondition')}<RequiredMark/></span><textarea aria-required disabled={disabled}
                                                                                 className={textareaClass}
                                                                                 aria-label={t('opsMissions.detail.note.equipmentCondition')} value={extraNote}
                                                                                 onChange={e => setExtraNote(e.target.value)}/><span
                                    className="text-sm font-normal leading-relaxed text-muted">{t('opsMissions.detail.note.equipmentConditionHint')}</span></label>}
                        </>}
                    <div className={actionsClass}><Button type="button" variant="outline" disabled={disabled}
                                                             onClick={() => setConfirmation(null)}>{t('opsMissions.detail.backAction')}</Button><Button type="submit" variant={confirmation === 'fail' || confirmation === 'forceFail' ? 'danger' : 'primary'}
                                            disabled={disabled || (['reject', 'conflict', 'fail', 'forceFail', 'complete'].includes(confirmation) && !note.trim()) || (confirmation === 'complete' && (!extraNote.trim() || !canFinish))}>{t(`opsMissions.detail.confirm.${confirmation}.submit`)}</Button>
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
                <Alert variant="warning">{t('opsMissions.detail.sectionsFailed', {sections: sectionErrors.map(name => t(`opsMissions.detail.sections.${name}`)).join(', ')})} <button className="font-semibold underline" disabled={busy || uploading}
                                                                                            onClick={() => {
                                                                                                if (actionLock.current) return;
                                                                                                void load().catch(() => setError({key: 'opsMissions.detail.errors.reloadMissionFailed'}));
                                                                                            }}>{t('opsMissions.detail.retry')}</button></Alert>}
            <nav className="flex flex-wrap gap-2" aria-label={t('opsMissions.detail.nav.label')}>
                <a className={navPillClass} href="#flight-map">{t('missionMonitor.mapTitle')}</a>
                <a className={navPillClass} href="#resources">{t('opsMissions.detail.nav.resources')}</a>
                <a className={navPillClass} href="#media">{t('opsMissions.detail.nav.media')}</a>
                <a className={navPillClass} href="#timeline">{t('opsMissions.detail.nav.timeline')}</a>
            </nav>
            {(mission.flightPlan || (mission.latitude != null && mission.longitude != null)) && (
                <section className={panelClass} id="flight-map">
                    <header className={panelHeaderClass}><h2 className={panelTitleClass}>{t('missionMonitor.mapTitle')}</h2></header>
                    <div className="p-5 md:p-6">
                        <MissionMonitoring mission={mission}/>
                    </div>
                </section>
            )}
            {resources.some(r => controls[r.key]) && <section className={panelClass}>
                <header className={panelHeaderClass}><h2 className={panelTitleClass}>{t('opsMissions.detail.resources.title')}</h2></header>
                <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 md:p-6">{resources.filter(r => controls[r.key]).map(r =>
                    <div key={r.key} className="grid gap-2">
                        <label className="grid gap-2 text-xs font-semibold text-foreground">{r.label}<span className="flex gap-2"><select disabled={disabled}
                                                                                         className="min-h-11 min-w-0 flex-1 rounded-control border border-border-input bg-card px-3 text-sm font-normal text-foreground"
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
                            <label className="grid gap-2 text-xs font-semibold text-foreground">{t('opsMissions.detail.resources.quantity')}<input className="min-h-11 rounded-control border border-border-input bg-card px-3 text-sm font-normal text-foreground"
                                                      type="number" aria-label={t('opsMissions.detail.resources.quantity')} inputMode="numeric" step={1}
                                                      disabled={disabled || !selectedEquipment} value={quantity}
                                                      onChange={e => setQuantity(e.target.value)}/><span
                                className="text-sm font-normal leading-relaxed text-muted">{selectedEquipment ? t('opsMissions.detail.resources.available', {count: selectedEquipment.availableQuantity}) : t('opsMissions.detail.resources.selectEquipmentFirst')}</span></label>}
                    </div>)}</div>
            </section>}
            {(controls.replaceUav || controls.unassignUav) &&
                <section className={panelClass} aria-labelledby="redispatch-title">
                    <header className={panelHeaderClass}><h2 id="redispatch-title" className={panelTitleClass}>{t('opsMissions.detail.uav.title')}</h2></header>
                    <div className="grid gap-4 p-5 md:p-6">
                        <p className={mutedClass}>{t('opsMissions.detail.uav.description')}</p>
                        {!redispatch && <div className={actionsClass}><Button disabled={disabled} variant="outline"
                                                                                 onClick={() => openRedispatch('replaceUav')}>{t('opsMissions.detail.uav.replace')}</Button><Button disabled={disabled} variant="outline"
                                                onClick={() => openRedispatch('unassignUav')}>{t('opsMissions.detail.uav.unassign')}</Button></div>}
                        {redispatch && controls[redispatch.kind] && <form className={`${noteCardClass} mt-1`}
                                                                          aria-label={redispatch.kind === 'replaceUav' ? t('opsMissions.detail.uav.replaceForm') : t('opsMissions.detail.uav.unassignForm')}
                                                                          onSubmit={event => {
                                                                              event.preventDefault();
                                                                              if (!redispatchReason.trim() || (redispatch.kind === 'replaceUav' && !replacementUavs.some(uav => String(uav.id) === replacementUavId))) return;
                                                                              void action(() => redispatch.kind === 'replaceUav' ? missionService.replaceUav(mission.id, redispatch.expectedCurrentUavId, Number(replacementUavId), redispatchReason) : missionService.unassignUav(mission.id, redispatch.expectedCurrentUavId, redispatchReason));
                                                                          }}>
                            <strong>{redispatch.kind === 'replaceUav' ? t('opsMissions.detail.uav.confirmReplace') : t('opsMissions.detail.uav.confirmUnassign')}</strong>
                            <p className={mutedClass}>{t('opsMissions.detail.uav.current', {uav: assignedUav?.serialNumber || `#${redispatch.expectedCurrentUavId}`})} {redispatch.kind === 'replaceUav' ? t('opsMissions.detail.uav.replaceHint') : t('opsMissions.detail.uav.unassignHint')}</p>
                            {redispatch.kind === 'replaceUav' && <label className="grid gap-1.5 text-sm font-semibold text-foreground"><span>{t('opsMissions.detail.uav.replacement')}<RequiredMark/></span><select
                                className={`mt-1 ${selectClass}`}
                                autoFocus aria-required aria-label={t('opsMissions.detail.uav.replacement')} disabled={disabled}
                                value={replacementUavId} onChange={event => setReplacementUavId(event.target.value)}>
                                <option value="">{t('opsMissions.detail.uav.replacementPlaceholder')}</option>
                                {replacementUavs.map(uav => <option key={uav.id}
                                                                    value={uav.id}>{uav.serialNumber} · {uav.model}</option>)}
                            </select>{!replacementUavs.length &&
                                <span className="text-sm font-normal leading-relaxed text-muted">{t('opsMissions.detail.uav.noReplacement')}</span>}
                            </label>}
                            <label className="grid gap-1.5 text-sm font-semibold text-foreground"><span>{t('opsMissions.detail.uav.reason')}<RequiredMark/></span><textarea autoFocus={redispatch.kind === 'unassignUav'} aria-required
                                                                className={textareaClass}
                                                                disabled={disabled}
                                                                value={redispatchReason}
                                                                onChange={event => setRedispatchReason(event.target.value)}/><span
                                className="text-sm font-normal leading-relaxed text-muted">{t('opsMissions.detail.uav.reasonHint', {count: 500})}</span></label>
                            <div className={actionsClass}><Button type="button" disabled={disabled} variant="outline"
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
            <div className="grid grid-cols-1 gap-px border border-slate-200 bg-slate-200 [&>*]:border-0 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <div className="grid gap-5">
                    <section className={panelClass} id="resources">
                        <header className={panelHeaderClass}><h2 className={panelTitleClass}>{t('opsMissions.detail.assigned.title')}</h2></header>
                        <div className={panelBodyClass}>
                            <dl className="m-0 grid gap-4"><Info label={t('opsMissions.detail.resources.station')}
                                                                        value={assignedStation?.name || (mission.stationId ? t('opsMissions.detail.assigned.stationFallback', {id: mission.stationId}) : t('opsMissions.detail.assigned.unassigned'))}/><Info
                                label="UAV"
                                value={assignedUav ? `${assignedUav.serialNumber} · ${assignedUav.model}` : mission.uavId ? t('opsMissions.detail.assigned.uavFallback', {id: mission.uavId}) : t('opsMissions.detail.assigned.unassigned')}/><Info
                                label={t('opsMissions.detail.resources.operator')}
                                value={assignedOperator?.fullName || assignedOperator?.username || (mission.operatorId === user?.id ? user?.fullName || user?.username || t('opsMissions.detail.assigned.you') : mission.operatorId ? t('opsMissions.detail.assigned.operatorFallback', {id: mission.operatorId}) : t('opsMissions.detail.assigned.unassigned'))}/>
                            </dl>
                            {mission.operatorId && <p className="m-0 mt-4 text-sm leading-relaxed text-muted">{mission.operatorAccepted ? t('opsMissions.detail.assigned.accepted') : t('opsMissions.detail.assigned.notAccepted')}</p>}{mission.operatorConflictNote &&
                            <p className="m-0 mt-2 text-sm leading-relaxed text-muted">{t('opsMissions.detail.assigned.conflict', {note: mission.operatorConflictNote})}</p>}</div>
                    </section>
                    {(mission.status === 'FAILED' || mission.status === 'COMPLETED') &&
                        <section className={panelClass} aria-labelledby="mission-outcome-title">
                            <header className={panelHeaderClass}><h2 id="mission-outcome-title" className={panelTitleClass}>{t('opsMissions.detail.outcome.title')}</h2></header>
                            <div className={panelBodyClass}>
                                <dl className="m-0 grid gap-4">
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
                    <section className={panelClass} id="media">
                        <header className={panelHeaderClass}><h2 className={panelTitleClass}>{t('opsMissions.detail.media.title')}</h2><span className="rounded-panel bg-background px-2.5 py-1 text-xs font-semibold text-muted">{t('opsMissions.detail.media.count', {count: media.length})}</span>
                        </header>
                        <div className={panelBodyClass}>
                            {controls.upload && <><label className="grid gap-1.5 text-sm font-semibold text-foreground">{t('opsMissions.detail.media.role')}<select
                                className={`mt-1 mb-3 ${selectClass}`}
                                aria-label={t('opsMissions.detail.media.role')} disabled={disabled} value={mediaRole}
                                onChange={e => setMediaRole(e.target.value as MediaRole)}>
                                <option value="OUTPUT">{t('opsMissions.detail.media.roleOutput')}</option>
                                <option value="DOCUMENT">{t('opsMissions.detail.media.roleDocument')}</option>
                                <option value="FLIGHT_DATA">{t('opsMissions.detail.media.roleFlightData')}</option>
                            </select></label><label className="mb-4 flex min-h-13 cursor-pointer items-center justify-center rounded-control border border-dashed border-border-input p-3 text-sm font-semibold text-primary focus-within:outline-3 focus-within:outline-offset-3 focus-within:outline-primary aria-disabled:cursor-wait aria-disabled:opacity-60" aria-disabled={disabled}><input
                                type="file" accept={MEDIA_ACCEPT} className="sr-only" disabled={disabled}
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) void uploadMedia(file);
                                    e.target.value = '';
                                }}/>{uploading ? t('opsMissions.detail.media.uploading') : t('opsMissions.detail.media.upload')}</label><p
                                className="m-0 mb-4 text-sm leading-relaxed text-muted">{mediaUploadPolicy(t)} {mediaUploadRetention(t)} {t('opsMissions.detail.media.uploadHint')}</p></>}
                            {!readMedia ?
                                <p className={mutedClass}>{t('opsMissions.detail.media.noPermission')}</p> : media.length ?
                                    <ul className="m-0 grid list-none gap-3 p-0">{media.map(item => <li className="mission-file flex items-center justify-between gap-3 rounded-panel border border-border p-3 md:gap-4 md:p-4"
                                                                                         key={item.id}>
                                        <div className="grid min-w-0 gap-1.5"><span
                                            className="break-words text-sm font-semibold text-foreground">{item.media.originalName}</span><span
                                            className="text-xs text-muted">{displayLabel(item.mediaRole)} · {Math.max(1, Math.ceil(item.media.size / 1000))} KB</span>
                                        </div>
                                        {can('MEDIA_READ') && <Button variant="outline" disabled={downloading !== null}
                                                                      onClick={() => void download(item.media.id)}>{downloading === item.media.id ? t('opsMissions.detail.media.downloading') : t('opsMissions.detail.media.download')}</Button>}
                                    </li>)}</ul> : <p className="m-0 px-2 py-6 text-center text-sm text-muted">{t('opsMissions.detail.media.empty')}</p>}
                            {terminalStatuses.includes(mission.status) &&
                                <p className="m-0 mt-4 text-sm leading-relaxed text-muted">{t('opsMissions.detail.media.locked')}</p>}
                        </div>
                    </section>
                </div>
                <section className={panelClass} id="timeline">
                    <header className={panelHeaderClass}><h2 className={panelTitleClass}>{t('opsMissions.detail.timeline.title')}</h2></header>
                    <div className={panelBodyClass}>{readTimeline ? <MissionTimeline events={events} showActor/> :
                        <p className={mutedClass}>{t('opsMissions.detail.timeline.noPermission')}</p>}</div>
                </section>
            </div>
        </div>
    </AppShell>;
}

function Info({label, value}: { label: string; value: string }) {
    return <div>
        <dt className="mb-1 text-xs text-muted">{label}</dt>
        <dd className="m-0 break-words text-sm font-semibold text-foreground">{value}</dd>
    </div>;
}
