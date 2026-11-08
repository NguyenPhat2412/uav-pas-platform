import React, {useMemo, useState} from 'react';
import {Linking, Platform} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import {ErrorState, LoadingState, Screen} from '@/components/ui';
import {MissionPermitCard} from '@/components/mission/MissionPermitCard';
import {MobileMission3DReplayCard} from '@/components/mission/MobileMission3DReplayCard';
import {MobileMissionInspectionReportCard} from '@/components/mission/MobileMissionInspectionReportCard';
import {OperationsDispatchResourceCard} from '@/components/operations/OperationsDispatchResourceCard';
import {OperationsLifecycleActionsCard} from '@/components/operations/OperationsMissionExecutionCard';
import {OperationsMissionMapCard, OperationsMissionMediaAndTimelineCards, type UploadRoleOption} from '@/components/operations/OperationsMissionMapAndMediaCards';
import {OperationsCustomerReviewSummaryCard, OperationsMissionOverviewCards} from '@/components/operations/OperationsMissionOverviewAndReviewCards';
import {opsErrorMessage, PreflightSafetyCard} from '@/components/operations/OperationsMissionPreflightCard';
import {OperationsRehearsalSimulationCard} from '@/components/operations/OperationsRehearsalSimulationCard';
import {useAirspaceZones, useMissionAirspaceCheck} from '@/hooks/airspace/useAirspace';
import {useMediaDownload, useMissionUpload} from '@/hooks/media/useMissionUpload';
import {
    useOperationsDispatchCandidates, useOperationsMissionActions, useOperationsMissionDetail,
    useOperationsMissionPreflight, useOperationsMissionReview, useOperatorsList,
} from '@/hooks/operations/useOperationsMissions';
import {useFleetOverview} from '@/hooks/uav/useFleetAndMaintenance';
import {useSimulationActions, useSimulationRuns, useSimulations} from '@/hooks/simulation/useSimulation';
import {useMissionWeather} from '@/hooks/weather/useWeather';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {canTakeoffMission, INITIAL_PREFLIGHT_CHECKLIST, togglePreflightItem, type PreflightChecklistState} from '@/forms/operations/preflight-checklist';
import {terminalStatuses} from '@/shared/lib/presentation';
import {missionControls} from '@/shared/utils/mission/presentation';
import {handoverEvidence} from '@/shared/utils/mission/workflows';
import type {MediaRole} from '@/shared/types/mission/mission.types';
import {isFinitePoint, verticesToMapCoordinates} from '@/utils/operations/map-shapes';

export function OperationsMissionDetailScreen() {
    const {id} = useLocalSearchParams<{ id: string }>();
    const missionId = Number(id);
    return <OperationsMissionDetailContent key={missionId} missionId={missionId}/>;
}

function OperationsMissionDetailContent({missionId}: { missionId: number }) {
    const {t} = useI18n();
    const {user, can} = useAuth();
    const toast = useToast();

    const {detail, timeline, media, telemetry} = useOperationsMissionDetail(missionId);
    const actions = useOperationsMissionActions();
    const fleet = useFleetOverview();
    const operatorsQuery = useOperatorsList();
    const mission = detail.data;

    const zonesQuery = useAirspaceZones(true);
    const airspaceCheck = useMissionAirspaceCheck(mission);
    const hasPoint = isFinitePoint(mission?.latitude, mission?.longitude);
    const weather = useMissionWeather(missionId, hasPoint && !terminalStatuses.includes(mission?.status ?? 'DRAFT'));
    const isAssignedOrSupervisor = (user?.id !== undefined && user.id === mission?.operatorId) || can('MISSION_CONFIRM') || can('MISSION_VIEW_ALL');
    const preflightQuery = useOperationsMissionPreflight(
        missionId,
        !!mission && isAssignedOrSupervisor && !['DRAFT', 'PENDING_CONFIRMATION', 'CANCELLED', 'REJECTED'].includes(mission.status),
    );
    const dispatchCandidatesQuery = useOperationsDispatchCandidates(
        missionId,
        !!mission && ['CONFIRMED', 'RESOURCE_RESERVED'].includes(mission.status),
    );
    const reviewQuery = useOperationsMissionReview(missionId, mission?.status === 'COMPLETED');
    const simulationsQuery = useSimulations(Boolean(mission));
    const missionRunsQuery = useSimulationRuns({missionId}, Boolean(mission));
    const simActions = useSimulationActions();

    const [checklistOverrides, setChecklistOverrides] = useState<Partial<PreflightChecklistState>>({});
    const preflightData = preflightQuery.data;
    const checklist: PreflightChecklistState = {
        batteryAndPropellersSafe: checklistOverrides.batteryAndPropellersSafe ?? (preflightData?.recorded ? preflightData.airframeAndPropellersSafe && preflightData.batteryHealthy : INITIAL_PREFLIGHT_CHECKLIST.batteryAndPropellersSafe),
        gnssRtkLocked: checklistOverrides.gnssRtkLocked ?? (preflightData?.recorded ? preflightData.gnssRtkLocked : INITIAL_PREFLIGHT_CHECKLIST.gnssRtkLocked),
        weatherCleared: checklistOverrides.weatherCleared ?? (preflightData?.recorded ? preflightData.weatherWithinLimits : INITIAL_PREFLIGHT_CHECKLIST.weatherCleared),
        airspaceAndPermitCleared: checklistOverrides.airspaceAndPermitCleared ?? (preflightData?.recorded ? preflightData.airspaceAndPermitCleared : INITIAL_PREFLIGHT_CHECKLIST.airspaceAndPermitCleared),
    };
    const [uploadRole, setUploadRole] = useState<UploadRoleOption>('OUTPUT');
    const upload = useMissionUpload(missionId, uploadRole);
    const download = useMediaDownload();

    const corridorPolygon = useMemo(
        () => (mission?.flightPlan?.areaType === 'POLYGON' ? verticesToMapCoordinates(mission.flightPlan.vertices) : []),
        [mission],
    );

    if (detail.isPending) return <Screen><LoadingState label={t('opsMissions.detail.loading')}/></Screen>;
    if (detail.isError || !mission) {
        return <Screen><ErrorState message={t('opsMissions.detail.errors.loadFailed')} retryLabel={t('common.retry')} onRetry={() => void detail.refetch()}/></Screen>;
    }

    const finished = terminalStatuses.includes(mission.status);
    const assigned = user?.id !== undefined && user.id === mission.operatorId;
    const controls = missionControls(mission, user?.id, can);
    const hasQuickActions =
        controls.confirm || controls.reject || controls.accept || controls.ready ||
        controls.start || controls.complete || controls.fail || controls.forceFail || controls.conflict;
    const preflightApplicable =
        (assigned || can('MISSION_CONFIRM') || can('MISSION_VIEW_ALL')) &&
        ['CONFIRMED', 'RESOURCE_RESERVED', 'READY', 'IN_PROGRESS'].includes(mission.status);
    const takeoffGate = canTakeoffMission(mission, checklist, airspaceCheck.data?.clearance);
    const evidence = handoverEvidence(mission.missionType, media.data ?? []);
    const liveTelemetry = telemetry.data;
    const hasLiveTelemetryPoint = !!liveTelemetry && isFinitePoint(liveTelemetry.latitude, liveTelemetry.longitude);
    const hasCenterPoint = isFinitePoint(mission.flightPlan?.centerLatitude, mission.flightPlan?.centerLongitude);
    const firstVertex = mission.flightPlan?.vertices?.[0];
    const flightCircle =
        mission.flightPlan?.areaType === 'CIRCLE' && Array.isArray(firstVertex) && firstVertex.length >= 2 &&
        isFinitePoint(firstVertex[0], firstVertex[1]) && typeof mission.flightPlan.radiusMeters === 'number' &&
        Number.isFinite(mission.flightPlan.radiusMeters) && mission.flightPlan.radiusMeters > 0
            ? {center: {latitude: firstVertex[0], longitude: firstVertex[1]}, radius: mission.flightPlan.radiusMeters}
            : null;

    const showError = (error: unknown) => toast.show(opsErrorMessage(error, t), 'error');
    const stations = fleet.overview.data?.stations ?? [];
    const uavs = fleet.overview.data?.uavs ?? [];
    const operators = operatorsQuery.data?.content ?? [];
    const assignedStationObj = mission.stationId != null ? stations.find(item => item.id === mission.stationId) : undefined;
    const assignedUavObj = mission.uavId != null ? uavs.find(item => item.id === mission.uavId) : undefined;
    const assignedOperatorObj = mission.operatorId != null ? operators.find(item => item.id === mission.operatorId) : undefined;

    const assignedStationLabel = mission.stationId != null ? (assignedStationObj ? `${assignedStationObj.code} · ${assignedStationObj.name}` : `#${mission.stationId}`) : null;
    const assignedUavLabel = mission.uavId != null ? (assignedUavObj ? `${assignedUavObj.serialNumber} · ${assignedUavObj.model}` : t('opsMissions.detail.assigned.uavFallback', {id: mission.uavId})) : null;
    const assignedOperatorLabel =
        mission.operatorId != null
            ? mission.operatorId === user?.id
                ? t('opsMissions.detail.assigned.you')
                : assignedOperatorObj
                  ? `${assignedOperatorObj.fullName || assignedOperatorObj.username} (@${assignedOperatorObj.username})`
                  : t('opsMissions.detail.assigned.operatorFallback', {id: mission.operatorId})
            : null;

    const canDispatchResources =
        !finished &&
        (can('MISSION_ASSIGN_STATION') || can('MISSION_ASSIGN_UAV') || can('MISSION_ASSIGN_OPERATOR') || can('MISSION_RESERVE_EQUIPMENT')) &&
        ['CONFIRMED', 'RESOURCE_RESERVED', 'READY'].includes(mission.status);

    const pickMedia = async (source: 'camera' | 'library', roleOverride?: MediaRole, onUploaded?: (mediaId: number) => void) => {
        const permission = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return toast.show(t('mobile.files.permissionDenied'), 'error');
        const targetRole = roleOverride ?? (uploadRole as MediaRole);
        const allowVideos = source === 'library' && roleOverride !== 'DOCUMENT';
        const result = source === 'camera'
            ? await ImagePicker.launchCameraAsync({mediaTypes: ['images'], quality: 0.85})
            : await ImagePicker.launchImageLibraryAsync({mediaTypes: allowVideos ? ['images', 'videos'] : ['images'], quality: 0.85});
        const asset = result.canceled ? null : result.assets[0];
        if (!asset) return;
        const contentType = asset.mimeType ?? (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
        const ext = contentType.split('/')[1]?.replace(/[^a-zA-Z0-9]/g, '') || (asset.type === 'video' ? 'mp4' : 'jpg');
        upload.mutate(
            {
                file: {uri: asset.uri, name: asset.fileName ?? `${mission.code}-${targetRole.toLowerCase()}-${Date.now()}.${ext}`, contentType, size: asset.fileSize ?? 0},
                mediaRole: targetRole,
            },
            {onSuccess: created => { onUploaded?.(created.media.id); toast.show(t('mobile.files.uploadedMedia'), 'success'); }, onError: showError},
        );
    };

    const openMaps = () => {
        if (!hasPoint) return;
        const label = encodeURIComponent(mission.locationName || mission.code);
        const url = Platform.OS === 'ios' ? `maps:?q=${label}&ll=${mission.latitude},${mission.longitude}` : `geo:${mission.latitude},${mission.longitude}?q=${mission.latitude},${mission.longitude}(${label})`;
        void Linking.openURL(url);
    };

    const openFile = (mediaId: number) =>
        download.mutate(mediaId, {
            onSuccess: signed => void WebBrowser.openBrowserAsync(signed.url),
            onError: () => toast.show(t('opsMissions.detail.errors.downloadFailed'), 'error'),
        });

    const mapCenter = hasLiveTelemetryPoint
        ? {latitude: liveTelemetry.latitude, longitude: liveTelemetry.longitude}
        : hasPoint
          ? {latitude: mission.latitude!, longitude: mission.longitude!}
          : hasCenterPoint
            ? {latitude: mission.flightPlan!.centerLatitude!, longitude: mission.flightPlan!.centerLongitude!}
            : corridorPolygon.length >= 3 ? corridorPolygon[0] : flightCircle ? flightCircle.center : {latitude: 21.0285, longitude: 105.8542};
    const showMap = hasPoint || corridorPolygon.length >= 3 || flightCircle != null || hasLiveTelemetryPoint;
    const activeSim = (simulationsQuery.data ?? []).find(
        s => s.missionId === mission.id || s.missionCode === mission.code || (mission.uavId != null && s.uavId === mission.uavId),
    );
    const latestRun = missionRunsQuery.data?.[0];
    const simBusy = simActions.rehearseMission.isPending || simActions.command.isPending || simActions.stop.isPending;

    return (
        <Screen
            onRefresh={() => void Promise.all([
                detail.refetch(), timeline.refetch(), media.refetch(), airspaceCheck.refetch(),
                zonesQuery.refetch(), fleet.overview.refetch(), operatorsQuery.refetch(),
            ])}
            refreshing={detail.isRefetching}>
            <OperationsMissionOverviewCards
                mission={mission} assignedStationLabel={assignedStationLabel} assignedUavLabel={assignedUavLabel}
                assignedOperatorLabel={assignedOperatorLabel} liveTelemetry={liveTelemetry} finished={finished}
                hasPoint={hasPoint} weather={weather.data} airspaceCheck={airspaceCheck.data}
            />

            {showMap && (
                <OperationsMissionMapCard
                    mission={mission} zones={zonesQuery.data ?? []} corridorPolygon={corridorPolygon}
                    flightCircle={flightCircle} hasPoint={hasPoint} hasLiveTelemetryPoint={hasLiveTelemetryPoint}
                    liveTelemetry={liveTelemetry} assignedUavLabel={assignedUavLabel} mapCenter={mapCenter} onOpenMaps={openMaps}
                />
            )}

            <MissionPermitCard
                mission={mission} allowVerify mediaItems={media.data} onOpenScan={openFile} uploadScanLoading={upload.isPending}
                onUploadScan={!finished && can('MISSION_MEDIA_UPLOAD') ? onUploaded => void pickMedia('library', 'DOCUMENT', onUploaded) : undefined}
                upsertLoading={actions.upsertPermit.isPending} verifyLoading={actions.verifyPermit.isPending}
                onUpsert={(data, onDone) => actions.upsertPermit.mutate({id: mission.id, data}, {onSuccess: () => { onDone(); toast.show(t('mobile.permit.savedToast'), 'success'); }, onError: showError})}
                onVerify={(data, onDone) => actions.verifyPermit.mutate({id: mission.id, data}, {onSuccess: () => { onDone(); toast.show(data.approved ? t('mobile.permit.approvedToast') : t('mobile.permit.rejectedToast'), data.approved ? 'success' : 'info'); }, onError: showError})}
            />

            {canDispatchResources && (
                <OperationsDispatchResourceCard
                    mission={mission} stations={stations} uavs={uavs} operators={operators}
                    assignedStationLabel={assignedStationLabel} assignedUavLabel={assignedUavLabel} assignedOperatorLabel={assignedOperatorLabel}
                    dispatchCandidates={dispatchCandidatesQuery.data}
                    canAssignStation={can('MISSION_ASSIGN_STATION')} canAssignUav={can('MISSION_ASSIGN_UAV')}
                    canAssignOperator={can('MISSION_ASSIGN_OPERATOR')} canReserveEquipment={can('MISSION_RESERVE_EQUIPMENT')}
                    autoAssignLoading={actions.autoAssign.isPending} assignStationLoading={actions.assignStation.isPending}
                    assignUavLoading={actions.assignUav.isPending} assignOperatorLoading={actions.assignOperator.isPending}
                    onAutoAssign={() => actions.autoAssign.mutate(mission.id, {onSuccess: () => toast.show(t('capabilities.smartDispatch.autoAssignedToast'), 'success'), onError: showError})}
                    onAssignStation={(resourceId, onDone) => actions.assignStation.mutate({id: mission.id, resourceId}, {onSuccess: () => { onDone(); toast.show(t('mobile.ops.dispatch.assignedToast'), 'success'); }, onError: showError})}
                    onAssignUav={(resourceId, onDone) => actions.assignUav.mutate({id: mission.id, resourceId}, {onSuccess: () => { onDone(); toast.show(t('mobile.ops.dispatch.assignedToast'), 'success'); }, onError: showError})}
                    onAssignOperator={(resourceId, onDone) => actions.assignOperator.mutate({id: mission.id, resourceId}, {onSuccess: () => { onDone(); toast.show(t('mobile.ops.dispatch.assignedToast'), 'success'); }, onError: showError})}
                />
            )}

            {preflightApplicable && (
                <PreflightSafetyCard
                    mission={mission} checklist={checklist}
                    onToggle={key => setChecklistOverrides(prev => togglePreflightItem({...checklist, ...prev}, key))}
                    airspaceClearance={airspaceCheck.data?.clearance} preflightRecord={preflightData}
                    canSign={(assigned && can('MISSION_STATUS_UPDATE')) || can('MISSION_CONFIRM')}
                    signing={actions.upsertPreflight.isPending}
                    onSign={() => actions.upsertPreflight.mutate({
                        id: mission.id,
                        data: {
                            airframeAndPropellersSafe: checklist.batteryAndPropellersSafe,
                            batteryHealthy: checklist.batteryAndPropellersSafe,
                            gnssRtkLocked: checklist.gnssRtkLocked,
                            weatherWithinLimits: checklist.weatherCleared,
                            airspaceAndPermitCleared: checklist.airspaceAndPermitCleared,
                            measuredBatteryPct: liveTelemetry?.batteryPct != null ? Math.round(liveTelemetry.batteryPct) : (preflightData?.measuredBatteryPct ?? null),
                            satelliteCount: preflightData?.satelliteCount ?? null,
                            measuredWindMs: preflightData?.measuredWindMs ?? null,
                        },
                    }, {onSuccess: () => toast.show(t('capabilities.preflight.savedToast'), 'success'), onError: showError})}
                />
            )}

            <MobileMission3DReplayCard missionId={mission.id} portal="operations"/>
            <MobileMissionInspectionReportCard missionId={mission.id} portal="operations" onOpenMedia={openFile}/>
            {mission.status === 'COMPLETED' && <OperationsCustomerReviewSummaryCard review={reviewQuery.data}/>}

            {can('UAV_VIEW') && (hasPoint || mission.flightPlan != null) && (
                <OperationsRehearsalSimulationCard
                    mission={mission} activeSim={activeSim} latestRun={latestRun}
                    canFlySim={can('UAV_UPDATE')} simBusy={simBusy} rehearsing={simActions.rehearseMission.isPending}
                    onCommand={(uavId, command) => simActions.command.mutate({uavId, command}, {onError: showError})}
                    onStop={uavId => simActions.stop.mutate(uavId, {onError: showError})}
                    onRehearse={() => simActions.rehearseMission.mutate({missionId: mission.id}, {onSuccess: started => toast.show(t('simulation.rehearseStarted', {code: started.missionCode ?? mission.code}), 'success'), onError: showError})}
                />
            )}

            {!finished && hasQuickActions && (
                <OperationsLifecycleActionsCard
                    controls={controls} takeoffAllowed={takeoffGate.allowed} evidence={evidence}
                    confirmLoading={actions.confirm.isPending} acceptLoading={actions.accept.isPending}
                    readyLoading={actions.ready.isPending} startLoading={actions.start.isPending}
                    rejectLoading={actions.reject.isPending} conflictLoading={actions.reportConflict.isPending}
                    completeLoading={actions.complete.isPending} failLoading={actions.fail.isPending} forceFailLoading={actions.forceFail.isPending}
                    onConfirm={() => actions.confirm.mutate(mission.id, {onSuccess: () => toast.show(t('mobile.ops.actions.confirmedToast'), 'success'), onError: showError})}
                    onAccept={() => actions.accept.mutate({id: mission.id, expectedVersion: mission.version}, {onSuccess: () => toast.show(t('mobile.ops.actions.acceptedToast'), 'success'), onError: showError})}
                    onReady={() => actions.ready.mutate(mission.id, {onSuccess: () => toast.show(t('mobile.ops.actions.readyToast'), 'success'), onError: showError})}
                    onStart={() => actions.start.mutate(mission.id, {onSuccess: () => toast.show(t('mobile.ops.actions.startedToast'), 'success'), onError: showError})}
                    onReject={(reason, onDone) => actions.reject.mutate({id: mission.id, reason}, {onSuccess: () => { onDone(); toast.show(t('mobile.ops.actions.rejectedToast'), 'info'); }, onError: showError})}
                    onConflict={(note, onDone) => actions.reportConflict.mutate({id: mission.id, note}, {onSuccess: () => { onDone(); toast.show(t('mobile.ops.actions.conflictToast'), 'info'); }, onError: showError})}
                    onComplete={(completionNote, equipmentCondition, onDone) => actions.complete.mutate({id: mission.id, completionNote, equipmentCondition}, {onSuccess: () => { onDone(); toast.show(t('mobile.ops.actions.completedToast'), 'success'); }, onError: showError})}
                    onFail={(failureReason, failureNotes, onDone) => actions.fail.mutate({id: mission.id, failureReason, notes: failureNotes}, {onSuccess: () => { onDone(); toast.show(t('mobile.ops.actions.failedToast'), 'info'); }, onError: showError})}
                    onForceFail={(failureReason, failureNotes, onDone) => actions.forceFail.mutate({id: mission.id, reason: failureReason, notes: failureNotes}, {onSuccess: () => { onDone(); toast.show(t('mobile.ops.actions.failedToast'), 'info'); }, onError: showError})}
                />
            )}

            <OperationsMissionMediaAndTimelineCards
                canViewMedia={can('MISSION_MEDIA_VIEW')} canUploadMedia={can('MISSION_MEDIA_UPLOAD')} canViewTimeline={can('MISSION_TIMELINE_VIEW')}
                finished={finished} uploadRole={uploadRole} onUploadRoleChange={setUploadRole}
                uploadPending={upload.isPending} mediaPending={media.isPending} mediaItems={media.data}
                timelinePending={timeline.isPending} timelineEvents={timeline.data}
                onPickCamera={() => void pickMedia('camera')} onPickLibrary={() => void pickMedia('library')} onOpenFile={openFile}
            />
        </Screen>
    );
}
