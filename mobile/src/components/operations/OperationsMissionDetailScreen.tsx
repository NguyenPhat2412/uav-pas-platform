import React, {useMemo, useState} from 'react';
import {Linking, Platform, Pressable, StyleSheet, View} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import MapView, {Circle, Marker, Polygon} from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import {
    AlertOctagon,
    AlertTriangle,
    CalendarClock,
    Camera,
    CheckCircle2,
    CheckSquare,
    Cpu,
    Download,
    ExternalLink,
    FileText,
    Home,
    ImagePlus,
    MapPin,
    Navigation,
    Pause,
    Play,
    Radio,
    RadioTower,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Square,
    Star,
    UserCheck,
    XCircle,
} from 'lucide-react-native';
import {AppText, Badge, Button, Card, ChipGroup, EmptyState, ErrorState, LoadingState, Screen, SectionTitle, TextField} from '@/components/ui';
import {MissionStatusBadge} from '@/components/mission/MissionBits';
import {MissionPermitCard} from '@/components/mission/MissionPermitCard';
import {Verdict} from '@/components/weather/WeatherCard';
import {useAirspaceZones, useMissionAirspaceCheck} from '@/hooks/airspace/useAirspace';
import {useMediaDownload, useMissionUpload} from '@/hooks/media/useMissionUpload';
import {
    useOperationsDispatchCandidates,
    useOperationsMissionActions,
    useOperationsMissionDetail,
    useOperationsMissionPreflight,
    useOperationsMissionReview,
    useOperatorsList,
} from '@/hooks/operations/useOperationsMissions';
import {useFleetOverview} from '@/hooks/uav/useFleetAndMaintenance';
import {useSimulationActions, useSimulationRuns, useSimulations} from '@/hooks/simulation/useSimulation';
import {useMissionWeather} from '@/hooks/weather/useWeather';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {
    canSubmitCompletion,
    canSubmitFailure,
    canSubmitReasonNote,
} from '@/forms/operations/field-report-form';
import {
    canTakeoffMission,
    INITIAL_PREFLIGHT_CHECKLIST,
    PREFLIGHT_CHECKLIST_KEYS,
    preflightProgressCount,
    togglePreflightItem,
    type PreflightChecklistKey,
    type PreflightChecklistState,
} from '@/forms/operations/preflight-checklist';
import {missionFormError} from '@/shared/forms/mission/mission-form';
import {formatFileSize} from '@/shared/lib/format';
import {displayLabel, eventNote, eventTitle, terminalStatuses} from '@/shared/lib/presentation';
import {missionControls} from '@/shared/utils/mission/presentation';
import {handoverEvidence} from '@/shared/utils/mission/workflows';
import type {AirspaceClearance} from '@/shared/types/airspace/airspace.types';
import type {MediaRole, Mission, MissionPreflight} from '@/shared/types/mission/mission.types';
import {isFinitePoint, verticesToMapCoordinates} from '@/utils/operations/map-shapes';
import {airspaceMapTone, colors, radius, sarMapTone, spacing} from '@/styles/tokens';

type UploadRoleOption = 'OUTPUT' | 'DOCUMENT' | 'FLIGHT_DATA';

function opsErrorMessage(error: unknown, t: (key: string) => string): string {
    const code = (error as { code?: string } | null)?.code;
    if (code) {
        const key = `opsMissions.apiErrors.${code}`;
        const translated = t(key);
        if (translated !== key) return translated;
    }
    return missionFormError(error, t);
}

function AirspaceBadge({clearance}: { clearance: AirspaceClearance }) {
    const {t} = useI18n();
    const labelMap: Record<AirspaceClearance, string> = {
        CLEAR: t('mobile.airspace.clearance.CLEAR'),
        CAUTION: t('mobile.airspace.clearance.CAUTION'),
        PERMIT_REQUIRED: t('mobile.airspace.clearance.PERMIT_REQUIRED'),
        BLOCKED: t('mobile.airspace.clearance.BLOCKED'),
    };
    const isDanger = clearance === 'BLOCKED';
    const isWarn = clearance === 'CAUTION' || clearance === 'PERMIT_REQUIRED';
    return (
        <Badge
            icon={isDanger || isWarn ? ShieldAlert : ShieldCheck}
            label={labelMap[clearance]}
            background={isDanger ? colors.dangerLight : isWarn ? colors.warningLight : colors.slateLight}
            color={isDanger ? colors.danger : isWarn ? colors.warning : colors.slateDark}
        />
    );
}

function PreflightSafetyCard({
    mission,
    checklist,
    onToggle,
    airspaceClearance,
    preflightRecord,
    canSign,
    signing,
    onSign,
}: {
    mission: Mission;
    checklist: PreflightChecklistState;
    onToggle: (key: PreflightChecklistKey) => void;
    airspaceClearance?: AirspaceClearance | null;
    preflightRecord?: MissionPreflight | null;
    canSign: boolean;
    signing: boolean;
    onSign: () => void;
}) {
    const {t, formatDate} = useI18n();
    const progress = preflightProgressCount(checklist);
    const gate = canTakeoffMission(mission, checklist, airspaceClearance);

    const itemLabels: Record<PreflightChecklistKey, string> = {
        batteryAndPropellersSafe: t('mobile.ops.preflight.items.batteryAndPropellersSafe'),
        gnssRtkLocked: t('mobile.ops.preflight.items.gnssRtkLocked'),
        weatherCleared: t('mobile.ops.preflight.items.weatherCleared'),
        airspaceAndPermitCleared: t('mobile.ops.preflight.items.airspaceAndPermitCleared'),
    };

    const blockerLabels: Record<string, string> = {
        'mobile.ops.preflight.blockers.notReady': t('mobile.ops.preflight.blockers.notReady'),
        'mobile.ops.preflight.blockers.acceptanceRequired': t('mobile.ops.preflight.blockers.acceptanceRequired'),
        'mobile.ops.preflight.blockers.airspaceBlocked': t('mobile.ops.preflight.blockers.airspaceBlocked'),
        'mobile.ops.preflight.blockers.permitUnverified': t('mobile.ops.preflight.blockers.permitUnverified'),
        'mobile.ops.preflight.blockers.checklistIncomplete': t('mobile.ops.preflight.blockers.checklistIncomplete'),
    };

    return (
        <Card>
            <SectionTitle
                title={t('mobile.ops.preflight.title')}
                action={<Badge label={`${progress.checked}/${progress.total}`} background={colors.slateLight} color={colors.slateDark}/>}
            />
            <AppText variant="small">{t('mobile.ops.preflight.subtitle')}</AppText>

            {preflightRecord?.recorded && preflightRecord.signedByUsername && (
                <AppText variant="caption">
                    {t('capabilities.preflight.signedMeta', {
                        user: preflightRecord.signedByUsername,
                        time: preflightRecord.signedAt ? formatDate(preflightRecord.signedAt) : '—',
                    })}
                </AppText>
            )}

            {PREFLIGHT_CHECKLIST_KEYS.map(key => {
                const checked = checklist[key];
                const Icon = checked ? CheckSquare : Square;
                return (
                    <Pressable
                        key={key}
                        onPress={() => onToggle(key)}
                        accessibilityRole="checkbox"
                        accessibilityState={{checked}}
                        style={({pressed}) => [styles.checkRow, pressed && styles.pressed]}>
                        <Icon size={20} color={checked ? colors.primary : colors.slate}/>
                        <AppText style={[styles.flex, checked && styles.checkDone]}>{itemLabels[key]}</AppText>
                    </Pressable>
                );
            })}

            {canSign && (
                <Button
                    label={signing ? t('capabilities.preflight.signing') : t('capabilities.preflight.signButton')}
                    icon={ShieldCheck}
                    tone="secondary"
                    loading={signing}
                    onPress={onSign}
                />
            )}

            <View style={[styles.gateBanner, gate.allowed ? styles.gateReady : styles.gateBlocked]}>
                {gate.allowed ? (
                    <CheckCircle2 size={18} color={colors.slateDark}/>
                ) : (
                    <AlertTriangle size={18} color={colors.warning}/>
                )}
                <AppText variant="small" style={styles.flex}>
                    {gate.allowed
                        ? t('mobile.ops.preflight.readyForTakeoff')
                        : (gate.blockerKey && blockerLabels[gate.blockerKey]) || t('mobile.ops.preflight.blockers.checklistIncomplete')}
                </AppText>
            </View>
        </Card>
    );
}

export function OperationsMissionDetailScreen() {
    const {id} = useLocalSearchParams<{ id: string }>();
    const missionId = Number(id);
    return <OperationsMissionDetailContent key={missionId} missionId={missionId}/>;
}

function OperationsMissionDetailContent({missionId}: { missionId: number }) {
    const {t, formatDate, formatNumber} = useI18n();
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
    const isAssignedOrSupervisor =
        (user?.id !== undefined && user.id === mission?.operatorId) ||
        can('MISSION_CONFIRM') ||
        can('MISSION_VIEW_ALL');
    const preflightQuery = useOperationsMissionPreflight(
        missionId,
        !!mission &&
            isAssignedOrSupervisor &&
            !['DRAFT', 'PENDING_CONFIRMATION', 'CANCELLED', 'REJECTED'].includes(mission.status),
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
        batteryAndPropellersSafe:
            checklistOverrides.batteryAndPropellersSafe ??
            (preflightData?.recorded
                ? preflightData.airframeAndPropellersSafe && preflightData.batteryHealthy
                : INITIAL_PREFLIGHT_CHECKLIST.batteryAndPropellersSafe),
        gnssRtkLocked:
            checklistOverrides.gnssRtkLocked ??
            (preflightData?.recorded ? preflightData.gnssRtkLocked : INITIAL_PREFLIGHT_CHECKLIST.gnssRtkLocked),
        weatherCleared:
            checklistOverrides.weatherCleared ??
            (preflightData?.recorded ? preflightData.weatherWithinLimits : INITIAL_PREFLIGHT_CHECKLIST.weatherCleared),
        airspaceAndPermitCleared:
            checklistOverrides.airspaceAndPermitCleared ??
            (preflightData?.recorded
                ? preflightData.airspaceAndPermitCleared
                : INITIAL_PREFLIGHT_CHECKLIST.airspaceAndPermitCleared),
    };
    const [uploadRole, setUploadRole] = useState<UploadRoleOption>('OUTPUT');
    const [activeForm, setActiveForm] = useState<'none' | 'reject' | 'conflict' | 'complete' | 'fail' | 'forceFail'>('none');
    const [reasonText, setReasonText] = useState('');
    const [completionNote, setCompletionNote] = useState('');
    const [equipmentCondition, setEquipmentCondition] = useState('');
    const [failureReason, setFailureReason] = useState('');
    const [failureNotes, setFailureNotes] = useState('');
    const [selectedStationId, setSelectedStationId] = useState<string>('');
    const [selectedUavId, setSelectedUavId] = useState<string>('');
    const [selectedOperatorId, setSelectedOperatorId] = useState<string>('');

    const upload = useMissionUpload(missionId, uploadRole);
    const download = useMediaDownload();

    const corridorPolygon = useMemo(
        () => (mission?.flightPlan?.areaType === 'POLYGON' ? verticesToMapCoordinates(mission.flightPlan.vertices) : []),
        [mission],
    );

    if (detail.isPending) return <Screen><LoadingState label={t('opsMissions.detail.loading')}/></Screen>;
    if (detail.isError || !mission) {
        return (
            <Screen>
                <ErrorState
                    message={t('opsMissions.detail.errors.loadFailed')}
                    retryLabel={t('common.retry')}
                    onRetry={() => void detail.refetch()}
                />
            </Screen>
        );
    }

    const finished = terminalStatuses.includes(mission.status);
    const assigned = user?.id !== undefined && user.id === mission.operatorId;
    const controls = missionControls(mission, user?.id, can);
    const hasQuickActions =
        controls.confirm ||
        controls.reject ||
        controls.accept ||
        controls.ready ||
        controls.start ||
        controls.complete ||
        controls.fail ||
        controls.forceFail ||
        controls.conflict;
    const preflightApplicable =
        (assigned || can('MISSION_CONFIRM') || can('MISSION_VIEW_ALL')) &&
        ['CONFIRMED', 'RESOURCE_RESERVED', 'READY', 'IN_PROGRESS'].includes(mission.status);
    const takeoffGate = canTakeoffMission(mission, checklist, airspaceCheck.data?.clearance);
    const evidence = handoverEvidence(mission.missionType, media.data ?? []);
    const liveTelemetry = telemetry.data;
    const hasLiveTelemetryPoint = !!liveTelemetry && isFinitePoint(liveTelemetry.latitude, liveTelemetry.longitude);
    const hasCenterPoint = isFinitePoint(mission.flightPlan?.centerLatitude, mission.flightPlan?.centerLongitude);
    const flightCircle =
        mission.flightPlan?.areaType === 'CIRCLE' &&
        Array.isArray(mission.flightPlan.vertices) &&
        mission.flightPlan.vertices.length >= 1 &&
        Array.isArray(mission.flightPlan.vertices[0]) &&
        mission.flightPlan.vertices[0].length >= 2 &&
        isFinitePoint(mission.flightPlan.vertices[0][0], mission.flightPlan.vertices[0][1]) &&
        typeof mission.flightPlan.radiusMeters === 'number' &&
        Number.isFinite(mission.flightPlan.radiusMeters) &&
        mission.flightPlan.radiusMeters > 0
            ? {
                  center: {
                      latitude: mission.flightPlan.vertices[0][0],
                      longitude: mission.flightPlan.vertices[0][1],
                  },
                  radius: mission.flightPlan.radiusMeters,
              }
            : null;

    const showError = (error: unknown) => toast.show(opsErrorMessage(error, t), 'error');

    const stations = fleet.overview.data?.stations ?? [];
    const uavs = fleet.overview.data?.uavs ?? [];
    const operators = operatorsQuery.data?.content ?? [];

    const assignedStationObj = mission.stationId != null ? stations.find(item => item.id === mission.stationId) : undefined;
    const assignedUavObj = mission.uavId != null ? uavs.find(item => item.id === mission.uavId) : undefined;
    const assignedOperatorObj = mission.operatorId != null ? operators.find(item => item.id === mission.operatorId) : undefined;

    const assignedStationLabel =
        mission.stationId != null
            ? assignedStationObj
                ? `${assignedStationObj.code} · ${assignedStationObj.name}`
                : `#${mission.stationId}`
            : null;
    const assignedUavLabel =
        mission.uavId != null
            ? assignedUavObj
                ? `${assignedUavObj.serialNumber} · ${assignedUavObj.model}`
                : t('opsMissions.detail.assigned.uavFallback', {id: mission.uavId})
            : null;
    const assignedOperatorLabel =
        mission.operatorId != null
            ? mission.operatorId === user?.id
                ? t('opsMissions.detail.assigned.you')
                : assignedOperatorObj
                  ? `${assignedOperatorObj.fullName || assignedOperatorObj.username} (@${assignedOperatorObj.username})`
                  : t('opsMissions.detail.assigned.operatorFallback', {id: mission.operatorId})
            : null;

    const effectiveStationChoice = selectedStationId || (mission.stationId != null ? String(mission.stationId) : '');
    const effectiveUavChoice = selectedUavId || (mission.uavId != null ? String(mission.uavId) : '');
    const effectiveOperatorChoice = selectedOperatorId || (mission.operatorId != null ? String(mission.operatorId) : '');

    const assignableStations = stations.filter(s => s.status !== 'INACTIVE' || s.id === mission.stationId);
    const assignableUavs = uavs.filter(u => {
        if (u.id === mission.uavId) return true;
        if (u.status !== 'AVAILABLE') return false;
        const filterStationId = effectiveStationChoice ? Number(effectiveStationChoice) : mission.stationId;
        return filterStationId == null || u.stationId == null || u.stationId === filterStationId;
    });
    const assignableOperators = operators.filter(op => op.status === 'ACTIVE' || op.id === mission.operatorId);
    const canDispatchResources =
        !finished &&
        (can('MISSION_ASSIGN_STATION') ||
            can('MISSION_ASSIGN_UAV') ||
            can('MISSION_ASSIGN_OPERATOR') ||
            can('MISSION_RESERVE_EQUIPMENT')) &&
        ['CONFIRMED', 'RESOURCE_RESERVED', 'READY'].includes(mission.status);

    const pickMedia = async (
        source: 'camera' | 'library',
        roleOverride?: MediaRole,
        onUploaded?: (mediaId: number) => void,
    ) => {
        const permission =
            source === 'camera'
                ? await ImagePicker.requestCameraPermissionsAsync()
                : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            toast.show(t('mobile.files.permissionDenied'), 'error');
            return;
        }
        const targetRole = roleOverride ?? (uploadRole as MediaRole);
        const allowVideos = source === 'library' && roleOverride !== 'DOCUMENT';
        const result =
            source === 'camera'
                ? await ImagePicker.launchCameraAsync({mediaTypes: ['images'], quality: 0.85})
                : await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: allowVideos ? ['images', 'videos'] : ['images'],
                      quality: 0.85,
                  });
        const asset = result.canceled ? null : result.assets[0];
        if (!asset) return;
        const contentType = asset.mimeType ?? (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
        const ext = contentType.split('/')[1]?.replace(/[^a-zA-Z0-9]/g, '') || (asset.type === 'video' ? 'mp4' : 'jpg');
        upload.mutate(
            {
                file: {
                    uri: asset.uri,
                    name: asset.fileName ?? `${mission.code}-${targetRole.toLowerCase()}-${Date.now()}.${ext}`,
                    contentType,
                    size: asset.fileSize ?? 0,
                },
                mediaRole: targetRole,
            },
            {
                onSuccess: created => {
                    onUploaded?.(created.media.id);
                    toast.show(t('mobile.files.uploadedMedia'), 'success');
                },
                onError: showError,
            },
        );
    };

    const openMaps = () => {
        if (!hasPoint) return;
        const label = encodeURIComponent(mission.locationName || mission.code);
        const url =
            Platform.OS === 'ios'
                ? `maps:?q=${label}&ll=${mission.latitude},${mission.longitude}`
                : `geo:${mission.latitude},${mission.longitude}?q=${mission.latitude},${mission.longitude}(${label})`;
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
            : corridorPolygon.length >= 3
              ? corridorPolygon[0]
              : flightCircle
                ? flightCircle.center
                : {latitude: 21.0285, longitude: 105.8542};
    const showMap = hasPoint || corridorPolygon.length >= 3 || flightCircle != null || hasLiveTelemetryPoint;

    const roleOptions: { value: UploadRoleOption; label: string }[] = [
        {value: 'OUTPUT', label: t('opsMissions.detail.media.roleOutput')},
        {value: 'DOCUMENT', label: t('opsMissions.detail.media.roleDocument')},
        {value: 'FLIGHT_DATA', label: t('opsMissions.detail.media.roleFlightData')},
    ];

    return (
        <Screen
            onRefresh={() =>
                void Promise.all([
                    detail.refetch(),
                    timeline.refetch(),
                    media.refetch(),
                    airspaceCheck.refetch(),
                    zonesQuery.refetch(),
                    fleet.overview.refetch(),
                    operatorsQuery.refetch(),
                ])
            }
            refreshing={detail.isRefetching}>
            {/* Header Summary */}
            <Card>
                <View style={styles.rowBetween}>
                    <AppText variant="caption" style={styles.code}>{mission.code}</AppText>
                    <MissionStatusBadge status={mission.status}/>
                </View>
                <AppText variant="heading">{mission.title}</AppText>
                <View style={styles.pills}>
                    <Badge label={displayLabel(mission.missionType)}/>
                    <Badge
                        label={displayLabel(mission.priority)}
                        background={mission.priority === 'URGENT' ? colors.dangerLight : colors.slateLight}
                        color={mission.priority === 'URGENT' ? colors.danger : colors.slateDark}
                    />
                    {assignedStationLabel && (
                        <Badge icon={RadioTower} label={assignedStationLabel}/>
                    )}
                    {assignedUavLabel && (
                        <Badge icon={Cpu} label={assignedUavLabel}/>
                    )}
                </View>
                <View style={styles.metaRow}>
                    <CalendarClock size={16} color={colors.muted}/>
                    <AppText variant="small" style={styles.flex}>
                        {formatDate(mission.startTime)} → {formatDate(mission.expectedEndTime, {timeStyle: 'short'})}
                    </AppText>
                </View>
                <View style={styles.metaRow}>
                    <MapPin size={16} color={colors.muted}/>
                    <AppText variant="small" style={styles.flex}>{mission.locationName || '—'}</AppText>
                </View>
                {assignedOperatorLabel && (
                    <AppText variant="caption">
                        {t('opsMissions.detail.resources.operator')}: {assignedOperatorLabel} ·{' '}
                        {mission.operatorAccepted
                            ? t('opsMissions.detail.assigned.accepted')
                            : t('opsMissions.detail.assigned.notAccepted')}
                    </AppText>
                )}
                {mission.operatorConflictNote ? (
                    <AppText variant="small" style={styles.warningText}>
                        {t('opsMissions.detail.assigned.conflict', {note: mission.operatorConflictNote})}
                    </AppText>
                ) : null}
                {mission.description ? <AppText variant="small">{mission.description}</AppText> : null}
            </Card>

            {/* Field Apple Map with Airspace Zones, Flight Corridor, Takeoff & Live UAV */}
            {showMap && (
                <Card>
                    <SectionTitle
                        title={t('mobile.ops.map.title')}
                        action={
                            hasPoint ? (
                                <Pressable onPress={openMaps} accessibilityRole="button" style={styles.mapLink}>
                                    <ExternalLink size={14} color={colors.primary}/>
                                    <AppText variant="caption" style={styles.linkText}>{t('mobile.missions.openMaps')}</AppText>
                                </Pressable>
                            ) : undefined
                        }
                    />
                    <View style={styles.mapFrame}>
                        <MapView
                            style={StyleSheet.absoluteFill}
                            initialRegion={{
                                latitude: mapCenter.latitude,
                                longitude: mapCenter.longitude,
                                latitudeDelta: 0.03,
                                longitudeDelta: 0.03,
                            }}>
                            {(zonesQuery.data ?? []).map(zone => {
                                const tone = airspaceMapTone[zone.zoneType];
                                if (
                                    zone.geometryType === 'CIRCLE' &&
                                    isFinitePoint(zone.centerLat, zone.centerLng) &&
                                    typeof zone.radiusMeters === 'number' &&
                                    Number.isFinite(zone.radiusMeters) &&
                                    zone.radiusMeters > 0
                                ) {
                                    return (
                                        <Circle
                                            key={`zone-${zone.id}`}
                                            center={{latitude: zone.centerLat, longitude: zone.centerLng}}
                                            radius={zone.radiusMeters}
                                            strokeColor={tone.stroke}
                                            fillColor={tone.fill}
                                            strokeWidth={2}
                                        />
                                    );
                                }
                                const poly = verticesToMapCoordinates(zone.vertices);
                                if (poly.length >= 3) {
                                    return (
                                        <Polygon
                                            key={`zone-${zone.id}`}
                                            coordinates={poly}
                                            strokeColor={tone.stroke}
                                            fillColor={tone.fill}
                                            strokeWidth={2}
                                        />
                                    );
                                }
                                return null;
                            })}

                            {corridorPolygon.length >= 3 && (
                                <Polygon
                                    coordinates={corridorPolygon}
                                    strokeColor={airspaceMapTone.CORRIDOR.stroke}
                                    fillColor={airspaceMapTone.CORRIDOR.fill}
                                    strokeWidth={2}
                                />
                            )}

                            {flightCircle && (
                                <Circle
                                    center={flightCircle.center}
                                    radius={flightCircle.radius}
                                    strokeColor={airspaceMapTone.CORRIDOR.stroke}
                                    fillColor={airspaceMapTone.CORRIDOR.fill}
                                    strokeWidth={2}
                                />
                            )}

                            {hasPoint && (
                                <Marker
                                    coordinate={{latitude: mission.latitude!, longitude: mission.longitude!}}
                                    title={mission.code}
                                    description={mission.locationName}
                                    pinColor={colors.primary}
                                />
                            )}

                            {hasLiveTelemetryPoint && (
                                <Marker
                                    coordinate={{latitude: liveTelemetry.latitude, longitude: liveTelemetry.longitude}}
                                    title={assignedUavLabel ?? `UAV #${liveTelemetry.uavId}`}
                                    pinColor={sarMapTone.uavPin}
                                />
                            )}
                        </MapView>
                    </View>
                    <AppText variant="caption">{t('mobile.ops.map.legend')}</AppText>
                </Card>
            )}

            {/* Live Telemetry HUD while Flying */}
            {mission.status === 'IN_PROGRESS' && (
                <Card>
                    <SectionTitle title={t('mobile.ops.telemetry.title')}/>
                    {liveTelemetry ? (
                        <View style={styles.hudGrid}>
                            <View style={styles.hudItem}>
                                <AppText variant="caption">{t('opsMissions.overview.hud.battery')}</AppText>
                                <AppText variant="title">{liveTelemetry.batteryPct != null ? `${liveTelemetry.batteryPct}%` : '—'}</AppText>
                            </View>
                            <View style={styles.hudItem}>
                                <AppText variant="caption">{t('opsMissions.overview.hud.altitude')}</AppText>
                                <AppText variant="title">
                                    {liveTelemetry.altitudeAglMeters != null ? `${Math.round(liveTelemetry.altitudeAglMeters)} m` : '—'}
                                </AppText>
                            </View>
                            <View style={styles.hudItem}>
                                <AppText variant="caption">{t('opsMissions.overview.hud.speed')}</AppText>
                                <AppText variant="title">
                                    {liveTelemetry.groundSpeedMs != null ? `${liveTelemetry.groundSpeedMs.toFixed(1)} m/s` : '—'}
                                </AppText>
                            </View>
                            <View style={styles.hudItem}>
                                <AppText variant="caption">RTK</AppText>
                                <AppText variant="title">{liveTelemetry.rtkStatus ?? 'NONE'}</AppText>
                            </View>
                        </View>
                    ) : (
                        <AppText variant="small">{t('opsMissions.overview.hud.noTelemetry')}</AppText>
                    )}
                </Card>
            )}

            {/* Site Weather & Airspace Clearance */}
            {!finished && (hasPoint || airspaceCheck.data) && (
                <Card>
                    <SectionTitle
                        title={t('mobile.airspace.weatherAndAirspaceTitle')}
                        action={airspaceCheck.data ? <AirspaceBadge clearance={airspaceCheck.data.clearance}/> : undefined}
                    />
                    {weather.data && (
                        <View style={styles.weatherBlock}>
                            <Verdict clearance={weather.data.clearance}/>
                            <AppText variant="small">{t('weather.preflight.score', {score: weather.data.safetyScore})}</AppText>
                        </View>
                    )}
                    {airspaceCheck.data?.violations.map(violation => (
                        <AppText key={violation.zoneId} variant="small">
                            • {violation.code} ({violation.authority}): {violation.message}
                        </AppText>
                    ))}
                    {airspaceCheck.data && airspaceCheck.data.violations.length === 0 && (
                        <AppText variant="small">{t('mobile.airspace.noViolations')}</AppText>
                    )}
                </Card>
            )}

            {/* Flight Permit Card (Upsert + Scan + Commander Approve/Reject) */}
            <MissionPermitCard
                mission={mission}
                allowVerify
                mediaItems={media.data}
                onOpenScan={openFile}
                uploadScanLoading={upload.isPending}
                onUploadScan={
                    !finished && can('MISSION_MEDIA_UPLOAD')
                        ? onUploaded => void pickMedia('library', 'DOCUMENT', onUploaded)
                        : undefined
                }
                upsertLoading={actions.upsertPermit.isPending}
                verifyLoading={actions.verifyPermit.isPending}
                onUpsert={(data, onDone) =>
                    actions.upsertPermit.mutate(
                        {id: mission.id, data},
                        {
                            onSuccess: () => {
                                onDone();
                                toast.show(t('mobile.permit.savedToast'), 'success');
                            },
                            onError: showError,
                        },
                    )
                }
                onVerify={(data, onDone) =>
                    actions.verifyPermit.mutate(
                        {id: mission.id, data},
                        {
                            onSuccess: () => {
                                onDone();
                                toast.show(
                                    data.approved ? t('mobile.permit.approvedToast') : t('mobile.permit.rejectedToast'),
                                    data.approved ? 'success' : 'info',
                                );
                            },
                            onError: showError,
                        },
                    )
                }
            />

            {/* Dispatcher Resource Assignment (Station, UAV, Operator) */}
            {canDispatchResources && (
                <Card>
                    <SectionTitle title={t('mobile.ops.dispatch.title')}/>

                    {dispatchCandidatesQuery.data && (
                        <View style={styles.smartBox}>
                            <AppText variant="small" style={styles.dispatchLabel}>
                                {t('capabilities.smartDispatch.title')}
                            </AppText>
                            <AppText variant="caption">{t('capabilities.smartDispatch.subtitle')}</AppText>
                            {(() => {
                                const cands = dispatchCandidatesQuery.data;
                                const topStation = cands.stations.find(s => s.id === cands.recommendedStationId);
                                const topUav = cands.uavs.find(u => u.id === cands.recommendedUavId);
                                const topOp = cands.operators.find(o => o.id === cands.recommendedOperatorId);
                                return (
                                    <View style={styles.pills}>
                                        {topStation && (
                                            <Badge
                                                label={`${topStation.code} (${topStation.score})`}
                                                background={colors.surface}
                                                color={colors.slateDark}
                                            />
                                        )}
                                        {topUav && (
                                            <Badge
                                                label={`${topUav.serialNumber} (${topUav.score})`}
                                                background={colors.surface}
                                                color={colors.slateDark}
                                            />
                                        )}
                                        {topOp && (
                                            <Badge
                                                label={`@${topOp.username} (${topOp.score})`}
                                                background={colors.surface}
                                                color={colors.slateDark}
                                            />
                                        )}
                                    </View>
                                );
                            })()}
                            {dispatchCandidatesQuery.data.canAutoAssign &&
                                (can('MISSION_ASSIGN_STATION') ||
                                    can('MISSION_ASSIGN_UAV') ||
                                    can('MISSION_ASSIGN_OPERATOR') ||
                                    can('MISSION_RESERVE_EQUIPMENT')) && (
                                    <Button
                                        label={
                                            actions.autoAssign.isPending
                                                ? t('capabilities.smartDispatch.autoAssigning')
                                                : t('capabilities.smartDispatch.autoAssign')
                                        }
                                        icon={Sparkles}
                                        loading={actions.autoAssign.isPending}
                                        onPress={() =>
                                            actions.autoAssign.mutate(mission.id, {
                                                onSuccess: () =>
                                                    toast.show(
                                                        t('capabilities.smartDispatch.autoAssignedToast'),
                                                        'success',
                                                    ),
                                                onError: showError,
                                            })
                                        }
                                    />
                                )}
                        </View>
                    )}

                    <View style={styles.dispatchSection}>
                        <AppText variant="small" style={styles.dispatchLabel}>
                            {t('mobile.ops.dispatch.station')}: {assignedStationLabel ?? t('mobile.ops.dispatch.unassigned')}
                        </AppText>
                        {can('MISSION_ASSIGN_STATION') && assignableStations.length > 0 && (
                            <>
                                <ChipGroup
                                    value={effectiveStationChoice}
                                    onChange={setSelectedStationId}
                                    options={assignableStations.map(st => ({
                                        value: String(st.id),
                                        label: `${st.code} · ${st.name}`,
                                    }))}
                                />
                                <Button
                                    label={t('mobile.ops.dispatch.assignStation')}
                                    icon={RadioTower}
                                    tone="secondary"
                                    disabled={
                                        !effectiveStationChoice ||
                                        Number(effectiveStationChoice) === mission.stationId
                                    }
                                    loading={actions.assignStation.isPending}
                                    onPress={() =>
                                        actions.assignStation.mutate(
                                            {id: mission.id, resourceId: Number(effectiveStationChoice)},
                                            {
                                                onSuccess: () => {
                                                    setSelectedStationId('');
                                                    toast.show(t('mobile.ops.dispatch.assignedToast'), 'success');
                                                },
                                                onError: showError,
                                            },
                                        )
                                    }
                                />
                            </>
                        )}
                    </View>

                    <View style={styles.dispatchSection}>
                        <AppText variant="small" style={styles.dispatchLabel}>
                            {t('mobile.ops.dispatch.uav')}: {assignedUavLabel ?? t('mobile.ops.dispatch.unassigned')}
                        </AppText>
                        {can('MISSION_ASSIGN_UAV') && assignableUavs.length > 0 && (
                            <>
                                <ChipGroup
                                    value={effectiveUavChoice}
                                    onChange={setSelectedUavId}
                                    options={assignableUavs.map(u => ({
                                        value: String(u.id),
                                        label: `${u.serialNumber} · ${u.model}`,
                                    }))}
                                />
                                <Button
                                    label={t('mobile.ops.dispatch.assignUav')}
                                    icon={Cpu}
                                    tone="secondary"
                                    disabled={!effectiveUavChoice || Number(effectiveUavChoice) === mission.uavId}
                                    loading={actions.assignUav.isPending}
                                    onPress={() =>
                                        actions.assignUav.mutate(
                                            {id: mission.id, resourceId: Number(effectiveUavChoice)},
                                            {
                                                onSuccess: () => {
                                                    setSelectedUavId('');
                                                    toast.show(t('mobile.ops.dispatch.assignedToast'), 'success');
                                                },
                                                onError: showError,
                                            },
                                        )
                                    }
                                />
                            </>
                        )}
                    </View>

                    <View style={styles.dispatchSection}>
                        <AppText variant="small" style={styles.dispatchLabel}>
                            {t('mobile.ops.dispatch.operator')}: {assignedOperatorLabel ?? t('mobile.ops.dispatch.unassigned')}
                        </AppText>
                        {can('MISSION_ASSIGN_OPERATOR') && assignableOperators.length > 0 && (
                            <>
                                <ChipGroup
                                    value={effectiveOperatorChoice}
                                    onChange={setSelectedOperatorId}
                                    options={assignableOperators.map(op => ({
                                        value: String(op.id),
                                        label: `${op.fullName || op.username} (@${op.username})`,
                                    }))}
                                />
                                <Button
                                    label={t('mobile.ops.dispatch.assignOperator')}
                                    icon={UserCheck}
                                    tone="secondary"
                                    disabled={
                                        !effectiveOperatorChoice ||
                                        Number(effectiveOperatorChoice) === mission.operatorId
                                    }
                                    loading={actions.assignOperator.isPending}
                                    onPress={() =>
                                        actions.assignOperator.mutate(
                                            {id: mission.id, resourceId: Number(effectiveOperatorChoice)},
                                            {
                                                onSuccess: () => {
                                                    setSelectedOperatorId('');
                                                    toast.show(t('mobile.ops.dispatch.assignedToast'), 'success');
                                                },
                                                onError: showError,
                                            },
                                        )
                                    }
                                />
                            </>
                        )}
                    </View>
                </Card>
            )}

            {/* Interactive Pre-flight Safety Checklist */}
            {preflightApplicable && (
                <PreflightSafetyCard
                    mission={mission}
                    checklist={checklist}
                    onToggle={key => setChecklistOverrides(prev => togglePreflightItem({...checklist, ...prev}, key))}
                    airspaceClearance={airspaceCheck.data?.clearance}
                    preflightRecord={preflightData}
                    canSign={(assigned && can('MISSION_STATUS_UPDATE')) || can('MISSION_CONFIRM')}
                    signing={actions.upsertPreflight.isPending}
                    onSign={() =>
                        actions.upsertPreflight.mutate(
                            {
                                id: mission.id,
                                data: {
                                    airframeAndPropellersSafe: checklist.batteryAndPropellersSafe,
                                    batteryHealthy: checklist.batteryAndPropellersSafe,
                                    gnssRtkLocked: checklist.gnssRtkLocked,
                                    weatherWithinLimits: checklist.weatherCleared,
                                    airspaceAndPermitCleared: checklist.airspaceAndPermitCleared,
                                    measuredBatteryPct:
                                        liveTelemetry?.batteryPct != null
                                            ? Math.round(liveTelemetry.batteryPct)
                                            : (preflightData?.measuredBatteryPct ?? null),
                                    satelliteCount: preflightData?.satelliteCount ?? null,
                                    measuredWindMs: preflightData?.measuredWindMs ?? null,
                                },
                            },
                            {
                                onSuccess: () => toast.show(t('capabilities.preflight.savedToast'), 'success'),
                                onError: showError,
                            },
                        )
                    }
                />
            )}

            {/* Read-only Customer Handover Review on Completed Missions */}
            {mission.status === 'COMPLETED' && (
                <Card>
                    <SectionTitle
                        title={t('capabilities.review.opsTitle')}
                        action={
                            reviewQuery.data?.reviewed ? (
                                <Badge
                                    icon={reviewQuery.data.deliverablesAccepted ? CheckCircle2 : undefined}
                                    label={
                                        reviewQuery.data.deliverablesAccepted
                                            ? t('capabilities.review.acceptedBadge')
                                            : t('capabilities.review.pendingBadge')
                                    }
                                    background={
                                        reviewQuery.data.deliverablesAccepted ? colors.slateLight : colors.warningLight
                                    }
                                    color={
                                        reviewQuery.data.deliverablesAccepted ? colors.slateDark : colors.warning
                                    }
                                />
                            ) : undefined
                        }
                    />
                    {!reviewQuery.data?.reviewed ? (
                        <AppText variant="small">{t('capabilities.review.emptyOps')}</AppText>
                    ) : (
                        <>
                            <View style={styles.pills}>
                                <Badge
                                    icon={Star}
                                    label={`${t('capabilities.review.overallRating')}: ${reviewQuery.data.overallRating ?? 5}/5`}
                                    background={colors.warningLight}
                                    color={colors.warning}
                                />
                                <Badge
                                    label={`${t('capabilities.review.dataQuality')}: ${reviewQuery.data.dataQualityRating ?? 5}/5`}
                                />
                                <Badge
                                    label={`${t('capabilities.review.timeliness')}: ${reviewQuery.data.timelinessRating ?? 5}/5`}
                                />
                            </View>
                            {reviewQuery.data.comment ? (
                                <AppText variant="small">“{reviewQuery.data.comment}”</AppText>
                            ) : null}
                        </>
                    )}
                </Card>
            )}

            {/* Digital Flight Rehearsal & Remote Simulation Controls */}
            {can('UAV_VIEW') && (hasPoint || mission.flightPlan != null) && (() => {
                const activeSim = (simulationsQuery.data ?? []).find(
                    s =>
                        s.missionId === mission.id ||
                        s.missionCode === mission.code ||
                        (mission.uavId != null && s.uavId === mission.uavId),
                );
                const latestRun = missionRunsQuery.data?.[0];
                const canFlySim = can('UAV_UPDATE');
                const simBusy =
                    simActions.rehearseMission.isPending ||
                    simActions.command.isPending ||
                    simActions.stop.isPending;

                return (
                    <Card>
                        <SectionTitle
                            title={t('simulation.rehearseTitle')}
                            action={
                                activeSim ? (
                                    <Badge
                                        icon={Radio}
                                        label={t(`simulation.modes.${activeSim.mode}`)}
                                        background={colors.primaryLight}
                                        color={colors.primary}
                                    />
                                ) : latestRun ? (
                                    <Badge
                                        label={t(`simulation.runStatus.${latestRun.status}`)}
                                        background={colors.slateLight}
                                        color={colors.slateDark}
                                    />
                                ) : undefined
                            }
                        />
                        {activeSim ? (
                            <>
                                <AppText variant="small" style={styles.code}>
                                    {activeSim.uavCode}
                                </AppText>
                                <View style={styles.hudGrid}>
                                    <View style={styles.hudItem}>
                                        <AppText variant="caption">{t('simulation.hud.altitude')}</AppText>
                                        <AppText variant="title">{Math.round(activeSim.altitudeMeters)} m</AppText>
                                    </View>
                                    <View style={styles.hudItem}>
                                        <AppText variant="caption">{t('simulation.hud.speed')}</AppText>
                                        <AppText variant="title">{activeSim.groundSpeedMs.toFixed(1)} m/s</AppText>
                                    </View>
                                    <View style={styles.hudItem}>
                                        <AppText variant="caption">{t('simulation.hud.battery')}</AppText>
                                        <AppText variant="title">{Math.round(activeSim.batteryPct)}%</AppText>
                                    </View>
                                    <View style={styles.hudItem}>
                                        <AppText variant="caption">{t('simulation.hud.waypoint')}</AppText>
                                        <AppText variant="title">
                                            {Math.min(activeSim.nextWaypoint, activeSim.waypointCount)}/{activeSim.waypointCount}
                                        </AppText>
                                    </View>
                                </View>
                                {canFlySim && (
                                    <View style={styles.actions}>
                                        {activeSim.mode === 'HOLD' ? (
                                            <Button
                                                label={t('simulation.resume')}
                                                icon={Play}
                                                disabled={simBusy}
                                                onPress={() =>
                                                    simActions.command.mutate(
                                                        {uavId: activeSim.uavId, command: 'RESUME'},
                                                        {onError: showError},
                                                    )
                                                }
                                            />
                                        ) : (
                                            <Button
                                                label={t('simulation.pause')}
                                                icon={Pause}
                                                tone="secondary"
                                                disabled={simBusy || !['MISSION', 'RETURN_TO_HOME'].includes(activeSim.mode)}
                                                onPress={() =>
                                                    simActions.command.mutate(
                                                        {uavId: activeSim.uavId, command: 'PAUSE'},
                                                        {onError: showError},
                                                    )
                                                }
                                            />
                                        )}
                                        <Button
                                            label={t('simulation.rth')}
                                            icon={Home}
                                            tone="secondary"
                                            disabled={simBusy || ['RETURN_TO_HOME', 'LANDING', 'LANDED'].includes(activeSim.mode)}
                                            onPress={() =>
                                                simActions.command.mutate(
                                                    {uavId: activeSim.uavId, command: 'RETURN_TO_HOME'},
                                                    {onError: showError},
                                                )
                                            }
                                        />
                                        <Button
                                            label={t('simulation.stop')}
                                            tone="ghost"
                                            disabled={simBusy}
                                            onPress={() =>
                                                simActions.stop.mutate(activeSim.uavId, {onError: showError})
                                            }
                                        />
                                    </View>
                                )}
                            </>
                        ) : (
                            <>
                                <AppText variant="small">{t('simulation.subtitle')}</AppText>
                                {latestRun?.outcomeSummary ? (
                                    <View style={styles.smartBox}>
                                        <AppText variant="caption" style={styles.code}>{latestRun.uavCode}</AppText>
                                        <AppText variant="small">{latestRun.outcomeSummary}</AppText>
                                    </View>
                                ) : null}
                                {canFlySim && (
                                    <Button
                                        label={t('simulation.rehearseAction')}
                                        icon={Radio}
                                        tone="secondary"
                                        loading={simActions.rehearseMission.isPending}
                                        disabled={simBusy}
                                        onPress={() =>
                                            simActions.rehearseMission.mutate(
                                                {missionId: mission.id},
                                                {
                                                    onSuccess: started =>
                                                        toast.show(
                                                            t('simulation.rehearseStarted', {
                                                                code: started.missionCode ?? mission.code,
                                                            }),
                                                            'success',
                                                        ),
                                                    onError: showError,
                                                },
                                            )
                                        }
                                    />
                                )}
                            </>
                        )}
                    </Card>
                );
            })()}

            {/* Lifecycle Action Controls (gated by shared missionControls ownership + status + permission rules) */}
            {!finished && hasQuickActions && (
                <Card>
                    <SectionTitle title={t('opsMissions.overview.quickActions.title')}/>

                    <View style={styles.actions}>
                        {controls.confirm && (
                            <Button
                                label={t('opsMissions.detail.actions.confirm')}
                                icon={CheckCircle2}
                                loading={actions.confirm.isPending}
                                onPress={() =>
                                    actions.confirm.mutate(mission.id, {
                                        onSuccess: () => toast.show(t('mobile.ops.actions.confirmedToast'), 'success'),
                                        onError: showError,
                                    })
                                }
                                style={styles.flex}
                            />
                        )}

                        {controls.accept && (
                            <Button
                                label={t('opsMissions.detail.actions.accept')}
                                icon={ShieldCheck}
                                loading={actions.accept.isPending}
                                onPress={() =>
                                    actions.accept.mutate(
                                        {id: mission.id, expectedVersion: mission.version},
                                        {
                                            onSuccess: () => toast.show(t('mobile.ops.actions.acceptedToast'), 'success'),
                                            onError: showError,
                                        },
                                    )
                                }
                                style={styles.flex}
                            />
                        )}

                        {controls.ready && (
                            <Button
                                label={t('opsMissions.detail.actions.ready')}
                                icon={Navigation}
                                tone="secondary"
                                loading={actions.ready.isPending}
                                onPress={() =>
                                    actions.ready.mutate(mission.id, {
                                        onSuccess: () => toast.show(t('mobile.ops.actions.readyToast'), 'success'),
                                        onError: showError,
                                    })
                                }
                                style={styles.flex}
                            />
                        )}

                        {controls.start && (
                            <Button
                                label={t('mobile.ops.actions.startFlight')}
                                icon={Play}
                                disabled={!takeoffGate.allowed}
                                loading={actions.start.isPending}
                                onPress={() =>
                                    actions.start.mutate(mission.id, {
                                        onSuccess: () => toast.show(t('mobile.ops.actions.startedToast'), 'success'),
                                        onError: showError,
                                    })
                                }
                                style={styles.flex}
                            />
                        )}

                        {controls.complete && (
                            <Button
                                label={t('opsMissions.detail.actions.complete')}
                                icon={CheckCircle2}
                                onPress={() => setActiveForm(activeForm === 'complete' ? 'none' : 'complete')}
                                style={styles.flex}
                            />
                        )}

                        {controls.fail && (
                            <Button
                                label={t('opsMissions.detail.actions.fail')}
                                icon={AlertOctagon}
                                tone="danger"
                                onPress={() => setActiveForm(activeForm === 'fail' ? 'none' : 'fail')}
                                style={styles.flex}
                            />
                        )}

                        {controls.forceFail && (
                            <Button
                                label={t('opsMissions.detail.actions.forceFail')}
                                icon={AlertOctagon}
                                tone="danger"
                                onPress={() => setActiveForm(activeForm === 'forceFail' ? 'none' : 'forceFail')}
                                style={styles.flex}
                            />
                        )}

                        {controls.reject && (
                            <Button
                                label={t('opsMissions.detail.actions.reject')}
                                icon={XCircle}
                                tone="danger"
                                onPress={() => setActiveForm(activeForm === 'reject' ? 'none' : 'reject')}
                                style={styles.flex}
                            />
                        )}

                        {controls.conflict && (
                            <Button
                                label={t('opsMissions.detail.actions.conflict')}
                                icon={AlertTriangle}
                                tone="ghost"
                                onPress={() => setActiveForm(activeForm === 'conflict' ? 'none' : 'conflict')}
                            />
                        )}
                    </View>

                    {activeForm === 'reject' && controls.reject && (
                        <View style={styles.inlineForm}>
                            <TextField
                                label={t('opsMissions.detail.note.reason')}
                                value={reasonText}
                                onChangeText={setReasonText}
                                multiline
                            />
                            <Button
                                label={t('opsMissions.detail.confirm.reject.submit')}
                                tone="danger"
                                disabled={!canSubmitReasonNote(reasonText)}
                                loading={actions.reject.isPending}
                                onPress={() =>
                                    actions.reject.mutate(
                                        {id: mission.id, reason: reasonText},
                                        {
                                            onSuccess: () => {
                                                setReasonText('');
                                                setActiveForm('none');
                                                toast.show(t('mobile.ops.actions.rejectedToast'), 'info');
                                            },
                                            onError: showError,
                                        },
                                    )
                                }
                            />
                        </View>
                    )}

                    {activeForm === 'conflict' && controls.conflict && (
                        <View style={styles.inlineForm}>
                            <TextField
                                label={t('opsMissions.detail.note.reason')}
                                value={reasonText}
                                onChangeText={setReasonText}
                                multiline
                            />
                            <Button
                                label={t('opsMissions.detail.confirm.conflict.submit')}
                                disabled={!canSubmitReasonNote(reasonText)}
                                loading={actions.reportConflict.isPending}
                                onPress={() =>
                                    actions.reportConflict.mutate(
                                        {id: mission.id, note: reasonText},
                                        {
                                            onSuccess: () => {
                                                setReasonText('');
                                                setActiveForm('none');
                                                toast.show(t('mobile.ops.actions.conflictToast'), 'info');
                                            },
                                            onError: showError,
                                        },
                                    )
                                }
                            />
                        </View>
                    )}

                    {activeForm === 'complete' && controls.complete && (
                        <View style={styles.inlineForm}>
                            <AppText variant="small">
                                {evidence.required
                                    ? t('opsMissions.detail.complete.evidenceCount', {count: evidence.count})
                                    : t('opsMissions.detail.complete.evidenceOptional')}
                            </AppText>
                            <TextField
                                label={t('opsMissions.detail.note.result')}
                                value={completionNote}
                                onChangeText={setCompletionNote}
                                multiline
                            />
                            <TextField
                                label={t('opsMissions.detail.note.equipmentCondition')}
                                hint={t('opsMissions.detail.note.equipmentConditionHint')}
                                value={equipmentCondition}
                                onChangeText={setEquipmentCondition}
                            />
                            <Button
                                label={t('opsMissions.detail.confirm.complete.submit')}
                                icon={CheckCircle2}
                                disabled={!canSubmitCompletion(completionNote, equipmentCondition) || !evidence.satisfied}
                                loading={actions.complete.isPending}
                                onPress={() =>
                                    actions.complete.mutate(
                                        {id: mission.id, completionNote, equipmentCondition},
                                        {
                                            onSuccess: () => {
                                                setCompletionNote('');
                                                setEquipmentCondition('');
                                                setActiveForm('none');
                                                toast.show(t('mobile.ops.actions.completedToast'), 'success');
                                            },
                                            onError: showError,
                                        },
                                    )
                                }
                            />
                        </View>
                    )}

                    {activeForm === 'fail' && controls.fail && (
                        <View style={styles.inlineForm}>
                            <TextField
                                label={t('opsMissions.detail.note.failureReason')}
                                value={failureReason}
                                onChangeText={setFailureReason}
                            />
                            <TextField
                                label={t('opsMissions.detail.note.incident')}
                                value={failureNotes}
                                onChangeText={setFailureNotes}
                                multiline
                            />
                            <Button
                                label={t('opsMissions.detail.confirm.fail.submit')}
                                tone="danger"
                                disabled={!canSubmitFailure(failureReason, failureNotes)}
                                loading={actions.fail.isPending}
                                onPress={() =>
                                    actions.fail.mutate(
                                        {id: mission.id, failureReason, notes: failureNotes},
                                        {
                                            onSuccess: () => {
                                                setFailureReason('');
                                                setFailureNotes('');
                                                setActiveForm('none');
                                                toast.show(t('mobile.ops.actions.failedToast'), 'info');
                                            },
                                            onError: showError,
                                        },
                                    )
                                }
                            />
                        </View>
                    )}

                    {activeForm === 'forceFail' && controls.forceFail && (
                        <View style={styles.inlineForm}>
                            <AppText variant="small">{t('opsMissions.detail.forceFailWarning')}</AppText>
                            <TextField
                                label={t('opsMissions.detail.note.failureReason')}
                                value={failureReason}
                                onChangeText={setFailureReason}
                            />
                            <TextField
                                label={t('opsMissions.detail.note.incident')}
                                value={failureNotes}
                                onChangeText={setFailureNotes}
                                multiline
                            />
                            <Button
                                label={t('opsMissions.detail.confirm.forceFail.submit')}
                                tone="danger"
                                disabled={!canSubmitFailure(failureReason, failureNotes)}
                                loading={actions.forceFail.isPending}
                                onPress={() =>
                                    actions.forceFail.mutate(
                                        {id: mission.id, reason: failureReason, notes: failureNotes},
                                        {
                                            onSuccess: () => {
                                                setFailureReason('');
                                                setFailureNotes('');
                                                setActiveForm('none');
                                                toast.show(t('mobile.ops.actions.failedToast'), 'info');
                                            },
                                            onError: showError,
                                        },
                                    )
                                }
                            />
                        </View>
                    )}
                </Card>
            )}

            {/* Field Handover Camera / Library Upload & Attached Files */}
            {(can('MISSION_MEDIA_VIEW') || can('MISSION_MEDIA_UPLOAD')) && (
                <Card>
                    <SectionTitle
                        title={t('opsMissions.detail.media.title')}
                        action={
                            media.data ? (
                                <AppText variant="caption">{t('opsMissions.detail.media.count', {count: media.data.length})}</AppText>
                            ) : undefined
                        }
                    />
                    {!finished && can('MISSION_MEDIA_UPLOAD') && (
                        <View style={styles.uploadBlock}>
                            <ChipGroup options={roleOptions} value={uploadRole} onChange={setUploadRole}/>
                            <View style={styles.actions}>
                                <Button
                                    label={t('mobile.files.camera')}
                                    icon={Camera}
                                    tone="secondary"
                                    disabled={upload.isPending}
                                    onPress={() => void pickMedia('camera')}
                                    style={styles.flex}
                                />
                                <Button
                                    label={t('mobile.files.libraryMedia')}
                                    icon={ImagePlus}
                                    tone="secondary"
                                    loading={upload.isPending}
                                    onPress={() => void pickMedia('library')}
                                    style={styles.flex}
                                />
                            </View>
                        </View>
                    )}
                    {!can('MISSION_MEDIA_VIEW') ? (
                        <AppText variant="small">{t('opsMissions.detail.media.noPermission')}</AppText>
                    ) : media.isPending ? (
                        <LoadingState/>
                    ) : !media.data?.length ? (
                        <EmptyState icon={FileText} message={t('opsMissions.detail.media.empty')}/>
                    ) : (
                        media.data.map(item => (
                            <Pressable key={item.id} onPress={() => openFile(item.media.id)} accessibilityRole="button" style={styles.fileRow}>
                                <FileText size={18} color={colors.slate}/>
                                <View style={styles.flex}>
                                    <AppText numberOfLines={1}>{item.media.originalName}</AppText>
                                    <AppText variant="caption">
                                        {item.mediaRole} · {formatFileSize(item.media.size, formatNumber)}
                                    </AppText>
                                </View>
                                <Download size={18} color={colors.primary}/>
                            </Pressable>
                        ))
                    )}
                </Card>
            )}

            {/* Mission Timeline */}
            {can('MISSION_TIMELINE_VIEW') && (
                <Card>
                    <SectionTitle title={t('opsMissions.detail.timeline.title')}/>
                    {timeline.isPending ? (
                        <LoadingState/>
                    ) : !timeline.data?.length ? (
                        <EmptyState message={t('mobile.missions.noHistory')}/>
                    ) : (
                        [...timeline.data].reverse().map(event => (
                            <View key={event.id} style={styles.eventRow}>
                                <View style={styles.dot}/>
                                <View style={styles.flex}>
                                    <AppText>{eventTitle(event)}</AppText>
                                    {eventNote(event) ? <AppText variant="small">{eventNote(event)}</AppText> : null}
                                    {event.createdAt ? <AppText variant="caption">{formatDate(event.createdAt)}</AppText> : null}
                                </View>
                            </View>
                        ))
                    )}
                </Card>
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    rowBetween: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm},
    code: {fontWeight: '700', letterSpacing: 0.5},
    pills: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    metaRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    warningText: {color: colors.warning, fontWeight: '600'},
    mapLink: {flexDirection: 'row', alignItems: 'center', gap: 4},
    linkText: {color: colors.primary, fontWeight: '600'},
    mapFrame: {height: 220, borderRadius: radius.control, overflow: 'hidden'},
    hudGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md},
    hudItem: {flexBasis: '45%', flexGrow: 1, backgroundColor: colors.slateLight, borderRadius: radius.control, padding: spacing.sm, gap: 2},
    weatherBlock: {gap: 4},
    smartBox: {
        gap: spacing.xs,
        padding: spacing.md,
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.slateLight,
    },
    dispatchSection: {gap: spacing.xs, paddingTop: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border},
    dispatchLabel: {fontWeight: '600', color: colors.text},
    checkRow: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.xs},
    checkDone: {fontWeight: '600', color: colors.text},
    gateBanner: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.control, marginTop: spacing.xs},
    gateReady: {backgroundColor: colors.slateLight},
    gateBlocked: {backgroundColor: colors.warningLight},
    actions: {flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap'},
    inlineForm: {gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border},
    uploadBlock: {gap: spacing.sm},
    fileRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm},
    eventRow: {flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.xs},
    dot: {width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6},
    pressed: {opacity: 0.75},
});
