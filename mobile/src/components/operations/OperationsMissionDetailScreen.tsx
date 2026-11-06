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
    ImagePlus,
    MapPin,
    Navigation,
    Play,
    ShieldAlert,
    ShieldCheck,
    Square,
    XCircle,
} from 'lucide-react-native';
import {AppText, Badge, Button, Card, ChipGroup, EmptyState, ErrorState, LoadingState, Screen, SectionTitle, TextField} from '@/components/ui';
import {MissionStatusBadge} from '@/components/mission/MissionBits';
import {MissionPermitCard} from '@/components/mission/MissionPermitCard';
import {Verdict} from '@/components/weather/WeatherCard';
import {useAirspaceZones, useMissionAirspaceCheck} from '@/hooks/airspace/useAirspace';
import {useMediaDownload, useMissionUpload} from '@/hooks/media/useMissionUpload';
import {useOperationsMissionActions, useOperationsMissionDetail} from '@/hooks/operations/useOperationsMissions';
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
import type {MediaRole, Mission} from '@/shared/types/mission/mission.types';
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
}: {
    mission: Mission;
    checklist: PreflightChecklistState;
    onToggle: (key: PreflightChecklistKey) => void;
    airspaceClearance?: AirspaceClearance | null;
}) {
    const {t} = useI18n();
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
    const {t, formatDate, formatNumber} = useI18n();
    const {user, can} = useAuth();
    const toast = useToast();
    const {id} = useLocalSearchParams<{ id: string }>();
    const missionId = Number(id);

    const {detail, timeline, media, telemetry} = useOperationsMissionDetail(missionId);
    const actions = useOperationsMissionActions();
    const mission = detail.data;

    const zonesQuery = useAirspaceZones(true);
    const airspaceCheck = useMissionAirspaceCheck(mission);
    const hasPoint = isFinitePoint(mission?.latitude, mission?.longitude);
    const weather = useMissionWeather(missionId, hasPoint && !terminalStatuses.includes(mission?.status ?? 'DRAFT'));

    const [checklist, setChecklist] = useState<PreflightChecklistState>(INITIAL_PREFLIGHT_CHECKLIST);
    const [uploadRole, setUploadRole] = useState<UploadRoleOption>('OUTPUT');
    const [activeForm, setActiveForm] = useState<'none' | 'reject' | 'conflict' | 'complete' | 'fail' | 'forceFail'>('none');
    const [reasonText, setReasonText] = useState('');
    const [completionNote, setCompletionNote] = useState('');
    const [equipmentCondition, setEquipmentCondition] = useState('');
    const [failureReason, setFailureReason] = useState('');
    const [failureNotes, setFailureNotes] = useState('');

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
    const preflightApplicable = assigned && ['CONFIRMED', 'RESOURCE_RESERVED', 'READY'].includes(mission.status);
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

    const pickMedia = async (source: 'camera' | 'library') => {
        const permission =
            source === 'camera'
                ? await ImagePicker.requestCameraPermissionsAsync()
                : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            toast.show(t('mobile.files.permissionDenied'), 'error');
            return;
        }
        const result =
            source === 'camera'
                ? await ImagePicker.launchCameraAsync({mediaTypes: ['images'], quality: 0.85})
                : await ImagePicker.launchImageLibraryAsync({mediaTypes: ['images'], quality: 0.85});
        const asset = result.canceled ? null : result.assets[0];
        if (!asset) return;
        const contentType = asset.mimeType ?? 'image/jpeg';
        upload.mutate(
            {
                file: {
                    uri: asset.uri,
                    name: asset.fileName ?? `${mission.code}-${uploadRole.toLowerCase()}-${Date.now()}.${contentType.split('/')[1] ?? 'jpg'}`,
                    contentType,
                    size: asset.fileSize ?? 0,
                },
                mediaRole: uploadRole as MediaRole,
            },
            {
                onSuccess: () => toast.show(t('mobile.files.uploaded'), 'success'),
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
                    {mission.uavId != null && (
                        <Badge icon={Cpu} label={t('opsMissions.detail.assigned.uavFallback', {id: mission.uavId})}/>
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
                {mission.operatorId != null && (
                    <AppText variant="caption">
                        {mission.operatorId === user?.id
                            ? `${t('opsMissions.detail.resources.operator')}: ${t('opsMissions.detail.assigned.you')}`
                            : t('opsMissions.detail.assigned.operatorFallback', {id: mission.operatorId})}{' '}
                        ·{' '}
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
                                    title={`UAV #${liveTelemetry.uavId}`}
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

            {/* Flight Permit Card (Upsert + Commander Approve/Reject) */}
            <MissionPermitCard
                mission={mission}
                allowVerify
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

            {/* Interactive Pre-flight Safety Checklist */}
            {preflightApplicable && (
                <PreflightSafetyCard
                    mission={mission}
                    checklist={checklist}
                    onToggle={key => setChecklist(prev => togglePreflightItem(prev, key))}
                    airspaceClearance={airspaceCheck.data?.clearance}
                />
            )}

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
                                    label={t('mobile.files.library')}
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
