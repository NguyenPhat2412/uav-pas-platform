'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {AppShell} from '@/components/layout/AppShell';
import {MissionHandoverReviewCard} from '@/components/mission/customer/MissionHandoverReviewCard';
import {MissionPermitCard} from '@/components/mission/MissionPermitCard';
import {MissionPreflightCard} from '@/components/mission/operations/MissionPreflightCard';
import {OperationsMissionConfirmSection} from '@/components/mission/operations/OperationsMissionConfirmSection';
import {OperationsMissionDispatchSection} from '@/components/mission/operations/OperationsMissionDispatchSection';
import {OperationsMissionHandoverSection} from '@/components/mission/operations/OperationsMissionHandoverSection';
import {OperationsMissionMediaSection} from '@/components/mission/operations/OperationsMissionMediaSection';
import {OperationsMissionOverviewSection} from '@/components/mission/operations/OperationsMissionOverviewSection';
import {SmartDispatchCard} from '@/components/mission/operations/SmartDispatchCard';
import {UavLoader} from '@/components/ui';
import {PreflightWeatherCard} from '@/components/weather/PreflightWeatherCard';
import {operationsMissionNotice} from '@/forms/mission/operations-mission-form';
import {useMissionDispatchSources, useMissionWorkflow} from '@/hooks/mission/useMissionWorkflow';
import {useInvalidateOperationsMissionQueries, useOperationsMissionReview} from '@/hooks/mission/useOperationsMissions';
import {useSimulationMutations} from '@/hooks/simulation/useSimulation';
import {useMissionWeather} from '@/hooks/weather/useWeather';
import {collectPages} from '@/lib/api/collection';
import {parseEntityId} from '@/lib/url-slugs';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import type {DispatchResources, MediaRole, Mission, MissionConfirmationKind as Confirmation, MissionDetailSection as Section, MissionEvent, MissionMedia, MissionNoticeMessage as Message} from '@/types/mission/mission.types';
import type {Equipment, Operator, Station, Uav} from '@/types/resources';
import {missionControls} from '@/utils/mission/presentation';
import {handoverEvidence} from '@/utils/mission/workflows';

interface DetailSnapshot {
    dispatch: DispatchResources | null; events: MissionEvent[]; media: MissionMedia[];
    stations: Station[]; uavs: Uav[]; equipment: Equipment[]; operators: Operator[]; sectionErrors: Section[];
}

const INITIAL_SNAPSHOT: DetailSnapshot = {
    dispatch: null, events: [], media: [], stations: [], uavs: [], equipment: [], operators: [], sectionErrors: [],
};

// Backend error codes (including 'MISSION_WEATHER_UNSAFE') are mapped via operationsMissionNotice.
export default function MissionDetailPage() {
    const {id} = useParams<{id: string}>();
    return <MissionDetail key={id} id={id} />;
}

function MissionDetail({id}: {id: string}) {
    const missions = useMissionWorkflow();
    const sources = useMissionDispatchSources();
    const invalidateMissionQueries = useInvalidateOperationsMissionQueries();
    const {rehearseMission} = useSimulationMutations();
    const missionId = parseEntityId(id);
    const router = useRouter();
    const {user, isAuthenticated, isLoading, can, permissionsReady} = useAuth();
    const {t} = useI18n();
    const [mission, setMission] = useState<Mission | null>(null);
    const [data, setData] = useState<DetailSnapshot>(INITIAL_SNAPSHOT);
    const [busy, setBusy] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [stale, setStale] = useState(false);
    const [error, setError] = useState<Message | null>(null);
    const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
    const [confirmSession, setConfirmSession] = useState(0);
    const [downloading, setDownloading] = useState<number | null>(null);
    const actionLock = useRef(false);
    const loadGeneration = useRef(0);
    const mutationError = useRef<HTMLDivElement>(null);
    const focusMutationError = useRef(false);

    const weatherRelevant = !!mission && mission.latitude != null && mission.longitude != null
        && !['COMPLETED', 'CANCELLED', 'FAILED', 'REJECTED'].includes(mission.status);
    const weather = useMissionWeather(mission?.id, weatherRelevant);
    const reviewQuery = useOperationsMissionReview(mission?.id ?? 0, mission?.status === 'COMPLETED');
    const errorText = !error ? '' : 'text' in error ? error.text : t(error.key, error.params);

    const readTimeline = permissionsReady && can('MISSION_TIMELINE_VIEW');
    const readMedia = permissionsReady && can('MISSION_MEDIA_VIEW');
    const readStations = permissionsReady && can('STATION_VIEW');
    const readUavs = permissionsReady && can('UAV_VIEW');
    const readEquipment = permissionsReady && can('INVENTORY_VIEW');
    const readOperators = permissionsReady && can('USER_VIEW');

    const load = useCallback(async () => {
        const generation = ++loadGeneration.current;
        const isCurrent = () => generation === loadGeneration.current;
        const snapshot = await missions.dispatchResources(missionId);
        if (!isCurrent()) return;
        setMission(snapshot.mission);
        setStale(false);
        setData(prev => ({...prev, dispatch: snapshot}));
        const failures: Section[] = [];
        const patch: Partial<DetailSnapshot> = {};
        const section = async <K extends keyof DetailSnapshot>(allowed: boolean, name: Section, request: () => Promise<DetailSnapshot[K]>, key: K) => {
            if (!allowed) return;
            try { patch[key] = await request(); } catch { failures.push(name); }
        };
        await Promise.all([
            section(readTimeline, 'timeline', () => missions.timeline(missionId), 'events'),
            section(readMedia, 'media', () => missions.media(missionId), 'media'),
            section(readStations, 'stations', () => collectPages(p => sources.listStations(p)), 'stations'),
            section(readUavs, 'uavs', () => collectPages(p => sources.listUavs(p)), 'uavs'),
            section(readEquipment, 'equipment', () => collectPages(p => sources.listEquipment(p)), 'equipment'),
            section(readOperators, 'operators', () => collectPages(p => sources.listOperators(p)), 'operators'),
        ]);
        if (isCurrent()) setData(prev => ({...prev, ...patch, sectionErrors: failures}));
    }, [missions, sources, missionId, readTimeline, readMedia, readStations, readUavs, readEquipment, readOperators]);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) router.replace('/operations/login');
        else if (isAuthenticated && permissionsReady && Number.isSafeInteger(missionId) && missionId > 0) {
            const timer = window.setTimeout(() => { void load().catch(() => setError({key: 'opsMissions.detail.errors.loadFailed'})); }, 0);
            return () => { window.clearTimeout(timer); loadGeneration.current += 1; };
        }
    }, [missionId, isAuthenticated, isLoading, permissionsReady, load, router]);

    useEffect(() => {
        if (!error || busy || uploading || !focusMutationError.current || !mutationError.current) return;
        focusMutationError.current = false;
        mutationError.current.focus({preventScroll: true});
        mutationError.current.scrollIntoView({block: 'center', behavior: 'instant'});
    }, [error, busy, uploading]);

    if (isLoading || !isAuthenticated || !permissionsReady || !mission || mission.id !== missionId) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                {error ? <p role="alert" className="text-danger">{errorText}</p> : <UavLoader label={t('opsMissions.detail.loading')} />}
            </div>
        );
    }

    const controls = missionControls(mission, user?.id, can);
    const disabled = busy || uploading || stale;
    const evidence = handoverEvidence(mission.missionType, data.media);
    const evidenceKnown = readMedia && !data.sectionErrors.includes('media');
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
        } catch (err) {
            focusMutationError.current = true;
            setError(operationsMissionNotice(err, 'opsMissions.detail.errors.actionUnconfirmed'));
        } finally {
            try {
                await load();
                void invalidateMissionQueries();
            } catch {
                focusMutationError.current = true;
                setStale(true);
                setError({key: 'opsMissions.detail.errors.reloadStale'});
            }
            actionLock.current = false;
            setBusy(false);
        }
    };

    const uploadMedia = async (file: File, role: MediaRole) => {
        if (disabled || actionLock.current || !controls.upload) return;
        actionLock.current = true;
        loadGeneration.current += 1;
        setUploading(true);
        setError(null);
        try {
            const signed = await missions.requestMediaUpload(missionId, file);
            await missions.uploadFile(signed.url, file);
            await missions.confirmMedia(missionId, signed.mediaId);
            await missions.attachMedia(missionId, signed.mediaId, role);
            await load();
        } catch (err) {
            focusMutationError.current = true;
            setError(operationsMissionNotice(err, 'opsMissions.detail.errors.uploadUnconfirmed'));
            await load().catch(() => setStale(true));
        } finally {
            actionLock.current = false;
            setUploading(false);
        }
    };

    const download = async (mediaId: number) => {
        setDownloading(mediaId);
        setError(null);
        try {
            const signed = await sources.mediaDownloadUrl(mediaId);
            window.open(signed.url, '_blank', 'noopener,noreferrer');
        } catch {
            focusMutationError.current = true;
            setError({key: 'opsMissions.detail.errors.downloadFailed'});
        } finally {
            setDownloading(null);
        }
    };

    return (
        <AppShell>
            <div className="grid gap-4 leading-normal text-foreground md:gap-6 [&_[id]]:scroll-mt-6">
                <OperationsMissionOverviewSection
                    mission={mission} missions={missions}
                    backHref={can('MISSION_VIEW_ALL') ? '/operations/dispatch/missions' : '/operations/assigned-missions'}
                    controls={controls} disabled={disabled} busy={busy} uploading={uploading} stale={stale}
                    errorText={errorText} mutationErrorRef={mutationError} sectionErrors={data.sectionErrors}
                    canRehearse={permissionsReady && can('UAV_UPDATE') && (mission.latitude != null || mission.flightPlan != null)}
                    rehearsing={rehearseMission.isPending}
                    weatherSlot={weatherRelevant ? <PreflightWeatherCard className="mt-5" assessment={weather.data} isPending={weather.isPending} isError={weather.isError} /> : null}
                    confirmSlot={confirmation && controls[confirmation] ? (
                        <OperationsMissionConfirmSection
                            key={`${confirmation}-${confirmSession}`} missionId={mission.id} missions={missions}
                            confirmation={confirmation} disabled={disabled} evidence={evidence} evidenceKnown={evidenceKnown}
                            canFinish={canFinish} onCancel={() => setConfirmation(null)} onAction={action}
                        />
                    ) : null}
                    onAction={action}
                    onOpenConfirmation={value => { setConfirmSession(s => s + 1); setConfirmation(value); setError(null); }}
                    onRehearse={() => rehearseMission.mutate(
                        {missionId: mission.id},
                        {
                            onSuccess: started => {
                                toast.success(t('simulation.rehearseStarted', {code: started.missionCode ?? mission.code}));
                                router.push(`/operations/simulation?uavId=${started.uavId}`);
                            },
                            onError: e => toast.error(e instanceof Error && e.message ? e.message : t('simulation.failed')),
                        },
                    )}
                    onReloadStale={() => {
                        setBusy(true);
                        void load().then(() => setError(null)).catch(() => setError({key: 'opsMissions.detail.errors.reloadFailed'})).finally(() => setBusy(false));
                    }}
                    onRetrySections={() => {
                        if (!actionLock.current) void load().catch(() => setError({key: 'opsMissions.detail.errors.reloadMissionFailed'}));
                    }}
                />

                <SmartDispatchCard
                    key={`dispatch-${mission.id}`} mission={mission} disabled={disabled}
                    canWriteDispatch={can('MISSION_ASSIGN_STATION') || can('MISSION_ASSIGN_UAV') || can('MISSION_ASSIGN_OPERATOR') || can('MISSION_RESERVE_EQUIPMENT')}
                    onAutoAssign={async () => { await action(() => missions.autoAssign(mission.id)); }}
                />

                <MissionPreflightCard
                    key={`preflight-${mission.id}`} mission={mission}
                    canSign={(mission.operatorId === user?.id && can('MISSION_STATUS_UPDATE')) || can('MISSION_CONFIRM')}
                    disabled={disabled}
                    onSigned={() => { if (readTimeline) void missions.timeline(missionId).then(events => setData(s => ({...s, events}))).catch(() => undefined); }}
                />

                {mission.status === 'COMPLETED' && <MissionHandoverReviewCard key={`review-${mission.id}`} missionId={mission.id} readOnly externalReview={reviewQuery.data} />}

                <OperationsMissionDispatchSection
                    mission={mission} dispatch={data.dispatch} stations={data.stations} uavs={data.uavs} equipment={data.equipment} operators={data.operators}
                    controls={controls} missions={missions} disabled={disabled} activeConfirmation={confirmation !== null}
                    onOpenRedispatch={() => { setConfirmation(null); setError(null); }} onAction={action}
                />

                <MissionPermitCard
                    id="permit" mission={mission} mediaItems={data.media} disabled={disabled} downloadingMediaId={downloading}
                    onUpsertPermit={async payload => { setMission(await missions.upsertPermit(mission.id, payload)); await load().catch(() => setStale(true)); }}
                    onVerifyPermit={async payload => { setMission(await missions.verifyPermit(mission.id, payload)); await load().catch(() => setStale(true)); }}
                    onUploadScan={async file => {
                        const signed = await missions.requestMediaUpload(mission.id, file);
                        await missions.uploadFile(signed.url, file);
                        await missions.confirmMedia(mission.id, signed.mediaId);
                        const attached = await missions.attachMedia(mission.id, signed.mediaId, 'DOCUMENT');
                        await load().catch(() => setStale(true));
                        return attached;
                    }}
                    onDownloadMedia={mediaId => void download(mediaId)}
                />

                <OperationsMissionHandoverSection
                    mission={mission} stations={data.stations} uavs={data.uavs} operators={data.operators} events={data.events} readTimeline={readTimeline} currentUser={user}
                    mediaSlot={
                        <OperationsMissionMediaSection
                            mission={mission} media={data.media} readMedia={readMedia} canUpload={controls.upload} canViewMedia={can('MEDIA_VIEW')}
                            disabled={disabled} uploading={uploading} downloading={downloading}
                            onUploadMedia={(file, role) => void uploadMedia(file, role)} onDownloadMedia={mediaId => void download(mediaId)}
                        />
                    }
                />
            </div>
        </AppShell>
    );
}
