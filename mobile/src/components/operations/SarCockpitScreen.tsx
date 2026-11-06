import React, {useMemo, useState} from 'react';
import {Alert, Linking, Platform, Pressable, StyleSheet, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import MapView, {Circle, Marker, Polygon} from 'react-native-maps';
import {
    CheckCircle2,
    Cpu,
    Crosshair,
    ExternalLink,
    Home,
    Phone,
    Radio,
    Send,
    Sparkles,
    Users,
    XCircle,
} from 'lucide-react-native';
import {AppText, Badge, Button, Card, EmptyState, ErrorState, LoadingState, Screen, SectionTitle, TextField} from '@/components/ui';
import {SarStatusBadge} from '@/components/operations/SarMissionsScreen';
import {useSarCockpit} from '@/hooks/sar/useSarCockpit';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {buildRescueDispatchPayload} from '@/forms/operations/field-report-form';
import {missionFormError} from '@/shared/forms/mission/mission-form';
import {displayLabel} from '@/shared/lib/presentation';
import type {AiDetection} from '@/shared/types/sar/sar.types';
import {isFinitePoint, parseGeoJsonPolygonCoordinates} from '@/utils/operations/map-shapes';
import {colors, radius, sarMapTone, spacing} from '@/styles/tokens';

export function SarCockpitScreen() {
    const {t, formatDate} = useI18n();
    const {can} = useAuth();
    const toast = useToast();
    const router = useRouter();
    const {missionId: missionIdParam} = useLocalSearchParams<{ missionId: string }>();
    const missionId = Number(missionIdParam);

    const {
        mission,
        missionsQuery,
        detections,
        tasks,
        telemetry,
        verifyDetection,
        dispatchRescue,
        returnToHome,
        refresh,
    } = useSarCockpit(missionId);

    const [selectedDetectionId, setSelectedDetectionId] = useState<number | null>(null);
    const [coordinatorNote, setCoordinatorNote] = useState('');

    const searchPolygon = useMemo(
        () => parseGeoJsonPolygonCoordinates(mission?.searchAreaPolygon),
        [mission?.searchAreaPolygon],
    );

    if (missionsQuery.isPending) {
        return <Screen><LoadingState label={t('mobile.ops.sar.loading')}/></Screen>;
    }

    if (missionsQuery.isError || !mission) {
        return (
            <Screen>
                <ErrorState
                    message={t('mobile.ops.sar.loadError')}
                    retryLabel={t('common.retry')}
                    onRetry={() => void missionsQuery.refetch()}
                />
            </Screen>
        );
    }

    const canAct = can('MISSION_STATUS_UPDATE') || can('MISSION_VIEW_ALL');
    const liveTelemetry = telemetry.data;
    const hasLkp = isFinitePoint(mission.lkpLatitude, mission.lkpLongitude);
    const hasDrift =
        hasLkp &&
        typeof mission.driftRadiusMeters === 'number' &&
        Number.isFinite(mission.driftRadiusMeters) &&
        mission.driftRadiusMeters > 0;
    const hasStation = isFinitePoint(mission.stationLatitude, mission.stationLongitude);
    const hasLiveTelemetry = !!liveTelemetry && isFinitePoint(liveTelemetry.latitude, liveTelemetry.longitude);
    const detectionList = detections.data ?? [];
    const latestTask = (tasks.data ?? [])[0] ?? null;
    const selectedDetection: AiDetection | null =
        detectionList.find(item => item.id === selectedDetectionId) ??
        detectionList.find(item => item.verified) ??
        null;

    const showError = (error: unknown) => toast.show(missionFormError(error, t), 'error');

    const openAppleMaps = (lat: number, lng: number, labelText: string) => {
        if (!isFinitePoint(lat, lng)) return;
        const label = encodeURIComponent(labelText);
        const url =
            Platform.OS === 'ios'
                ? `maps:?q=${label}&ll=${lat},${lng}`
                : `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
        void Linking.openURL(url);
    };

    const confirmReturnToHome = () => {
        if (mission.uavId == null) return;
        Alert.alert(t('mobile.ops.sar.rthConfirmTitle'), t('mobile.ops.sar.rthConfirmBody'), [
            {text: t('common.cancel'), style: 'cancel'},
            {
                text: t('mobile.ops.sar.rthButton'),
                style: 'destructive',
                onPress: () =>
                    returnToHome.mutate(undefined, {
                        onSuccess: () => toast.show(t('mobile.ops.sar.rthSentToast'), 'info'),
                        onError: showError,
                    }),
            },
        ]);
    };

    const handleDispatchRescue = () => {
        const selectedHasPoint = isFinitePoint(selectedDetection?.latitude, selectedDetection?.longitude);
        const payload = buildRescueDispatchPayload({
            coordinatorNote,
            detectionId: selectedDetection?.id ?? null,
            latitude: selectedHasPoint ? selectedDetection!.latitude : hasLkp ? mission.lkpLatitude : null,
            longitude: selectedHasPoint ? selectedDetection!.longitude : hasLkp ? mission.lkpLongitude : null,
        });
        dispatchRescue.mutate(payload, {
            onSuccess: result => {
                setCoordinatorNote('');
                toast.show(result.message || t('mobile.ops.sar.dispatchedToast'), 'success');
            },
            onError: showError,
        });
    };

    const mapCenter = hasLiveTelemetry
        ? {latitude: liveTelemetry.latitude, longitude: liveTelemetry.longitude}
        : hasLkp
          ? {latitude: mission.lkpLatitude, longitude: mission.lkpLongitude}
          : searchPolygon.length >= 3
            ? searchPolygon[0]
            : hasStation
              ? {latitude: mission.stationLatitude!, longitude: mission.stationLongitude!}
              : {latitude: 21.0285, longitude: 105.8542};
    const showMap = hasLkp || hasLiveTelemetry || searchPolygon.length >= 3 || hasStation;

    return (
        <Screen onRefresh={() => void refresh()} refreshing={missionsQuery.isRefetching}>
            {/* SAR Mission Header */}
            <Card>
                <View style={styles.rowBetween}>
                    <AppText variant="caption" style={styles.code}>{mission.missionCode}</AppText>
                    <SarStatusBadge status={mission.sarStatus}/>
                </View>
                <AppText variant="heading">{mission.missionTitle}</AppText>

                <View style={styles.pills}>
                    {mission.priority ? (
                        <Badge
                            label={displayLabel(mission.priority)}
                            background={mission.priority === 'URGENT' ? colors.dangerLight : colors.slateLight}
                            color={mission.priority === 'URGENT' ? colors.danger : colors.slateDark}
                        />
                    ) : null}
                    {mission.victimCountEstimated != null && (
                        <Badge
                            icon={Users}
                            label={t('mobile.ops.sar.victimsCount', {count: mission.victimCountEstimated})}
                            background={colors.primaryLight}
                            color={colors.primary}
                        />
                    )}
                    {mission.uavSerialNumber ? (
                        <Badge
                            icon={Cpu}
                            label={mission.uavModel ? `${mission.uavModel} (${mission.uavSerialNumber})` : mission.uavSerialNumber}
                        />
                    ) : null}
                    {mission.stationName ? <Badge icon={Radio} label={mission.stationName}/> : null}
                </View>

                <View style={styles.metaRow}>
                    <Crosshair size={16} color={colors.primary}/>
                    <AppText variant="small" style={styles.flex}>
                        {t('mobile.ops.sar.lkpLabel')}:{' '}
                        {hasLkp ? `${mission.lkpLatitude.toFixed(5)}, ${mission.lkpLongitude.toFixed(5)}` : '—'}
                        {hasDrift ? ` (±${Math.round(mission.driftRadiusMeters!)} m)` : ''}
                    </AppText>
                </View>

                {mission.emergencyContact ? (
                    <View style={styles.metaRow}>
                        <Phone size={16} color={colors.muted}/>
                        <AppText variant="small" style={styles.flex}>{mission.emergencyContact}</AppText>
                    </View>
                ) : null}

                <Button
                    label={t('mobile.ops.sar.openMissionDetail')}
                    tone="ghost"
                    onPress={() => router.push({pathname: '/operations/mission/[id]', params: {id: String(mission.missionId)}})}
                />
            </Card>

            {/* Search Datum, Drift Circle, Search Polygon, Station, Live UAV & AI Detections Map */}
            {showMap && (
                <Card>
                    <SectionTitle
                        title={t('mobile.ops.sar.mapTitle')}
                        action={
                            hasLkp ? (
                                <Pressable
                                    onPress={() => openAppleMaps(mission.lkpLatitude, mission.lkpLongitude, `${mission.missionCode} LKP`)}
                                    accessibilityRole="button"
                                    style={styles.mapLink}>
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
                                latitudeDelta: 0.035,
                                longitudeDelta: 0.035,
                            }}>
                            {searchPolygon.length >= 3 && (
                                <Polygon
                                    coordinates={searchPolygon}
                                    strokeColor={sarMapTone.searchStroke}
                                    fillColor={sarMapTone.searchFill}
                                    strokeWidth={2}
                                />
                            )}

                            {hasDrift && (
                                <Circle
                                    center={{latitude: mission.lkpLatitude, longitude: mission.lkpLongitude}}
                                    radius={mission.driftRadiusMeters!}
                                    strokeColor={sarMapTone.driftStroke}
                                    fillColor={sarMapTone.driftFill}
                                    strokeWidth={2}
                                />
                            )}

                            {hasLkp && (
                                <Marker
                                    coordinate={{latitude: mission.lkpLatitude, longitude: mission.lkpLongitude}}
                                    title={`${t('mobile.ops.sar.lkpLabel')} · ${mission.missionCode}`}
                                    pinColor={sarMapTone.lkpPin}
                                />
                            )}

                            {hasStation && (
                                <Marker
                                    coordinate={{latitude: mission.stationLatitude!, longitude: mission.stationLongitude!}}
                                    title={mission.stationName ?? t('mobile.ops.sar.homeStation')}
                                    pinColor={sarMapTone.stationPin}
                                />
                            )}

                            {hasLiveTelemetry && (
                                <Marker
                                    coordinate={{latitude: liveTelemetry.latitude, longitude: liveTelemetry.longitude}}
                                    title={`UAV #${liveTelemetry.uavId}`}
                                    pinColor={sarMapTone.uavPin}
                                />
                            )}

                            {detectionList.map(det =>
                                isFinitePoint(det.latitude, det.longitude) ? (
                                    <Marker
                                        key={`det-${det.id}`}
                                        coordinate={{latitude: det.latitude!, longitude: det.longitude!}}
                                        title={`${det.label} (${Math.round(det.confidence * 100)}%)`}
                                        onPress={() => setSelectedDetectionId(det.id)}
                                        pinColor={det.verified ? sarMapTone.detectionVerifiedPin : sarMapTone.detectionPendingPin}
                                    />
                                ) : null,
                            )}
                        </MapView>
                    </View>
                    <AppText variant="caption">{t('mobile.ops.sar.mapLegend')}</AppText>
                </Card>
            )}

            {/* Live UAV & Edge AI Telemetry HUD */}
            <Card>
                <SectionTitle title={t('mobile.ops.sar.hudTitle')}/>
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

                {latestTask && (
                    <View style={styles.aiSummary}>
                        <Sparkles size={16} color={colors.primary}/>
                        <AppText variant="caption" style={styles.flex}>
                            {t('mobile.ops.sar.aiNodeLine', {
                                node: latestTask.processingNode,
                                fps: latestTask.fps != null ? latestTask.fps.toFixed(1) : '—',
                                latency: latestTask.inferenceTimeMs != null ? Math.round(latestTask.inferenceTimeMs) : '—',
                            })}
                        </AppText>
                    </View>
                )}
            </Card>

            {/* AI Target Detections & Verification */}
            <Card>
                <SectionTitle
                    title={t('mobile.ops.sar.detectionsTitle')}
                    action={
                        <Badge
                            label={String(detectionList.length)}
                            background={detectionList.length > 0 ? colors.primaryLight : colors.slateLight}
                            color={detectionList.length > 0 ? colors.primary : colors.slateDark}
                        />
                    }
                />
                {detections.isPending ? (
                    <LoadingState/>
                ) : detectionList.length === 0 ? (
                    <EmptyState icon={Sparkles} message={t('mobile.ops.sar.noDetections')}/>
                ) : (
                    detectionList.map(det => {
                        const selected = selectedDetection?.id === det.id;
                        return (
                            <Pressable
                                key={det.id}
                                onPress={() => setSelectedDetectionId(det.id)}
                                accessibilityRole="button"
                                style={[styles.detectionCard, selected && styles.detectionSelected]}>
                                <View style={styles.rowBetween}>
                                    <AppText variant="title">
                                        {det.label} · {Math.round(det.confidence * 100)}%
                                    </AppText>
                                    <Badge
                                        label={det.verified ? t('mobile.ops.sar.verifiedBadge') : t('mobile.ops.sar.pendingBadge')}
                                        background={det.verified ? colors.slateDark : colors.warningLight}
                                        color={det.verified ? colors.white : colors.warning}
                                    />
                                </View>
                                {isFinitePoint(det.latitude, det.longitude) ? (
                                    <AppText variant="small">
                                        {det.latitude!.toFixed(5)}, {det.longitude!.toFixed(5)}
                                        {det.trackingId ? ` · #${det.trackingId}` : ''}
                                    </AppText>
                                ) : null}
                                <AppText variant="caption">
                                    {formatDate(det.createdAt, {dateStyle: 'short', timeStyle: 'medium'})}
                                    {det.verifiedBy ? ` · ${det.verifiedBy}` : ''}
                                </AppText>

                                {canAct && (
                                    <View style={styles.actions}>
                                        <Button
                                            label={t('mobile.ops.sar.verifyTarget')}
                                            icon={CheckCircle2}
                                            tone={det.verified ? 'secondary' : 'primary'}
                                            loading={verifyDetection.isPending}
                                            onPress={() =>
                                                verifyDetection.mutate(
                                                    {detectionId: det.id, verified: true},
                                                    {
                                                        onSuccess: () => {
                                                            setSelectedDetectionId(det.id);
                                                            toast.show(t('mobile.ops.sar.verifiedToast'), 'success');
                                                        },
                                                        onError: showError,
                                                    },
                                                )
                                            }
                                            style={styles.flex}
                                        />
                                        <Button
                                            label={t('mobile.ops.sar.falseAlarm')}
                                            icon={XCircle}
                                            tone="ghost"
                                            loading={verifyDetection.isPending}
                                            onPress={() =>
                                                verifyDetection.mutate(
                                                    {detectionId: det.id, verified: false},
                                                    {
                                                        onSuccess: () => toast.show(t('mobile.ops.sar.dismissedToast'), 'info'),
                                                        onError: showError,
                                                    },
                                                )
                                            }
                                        />
                                    </View>
                                )}
                            </Pressable>
                        );
                    })
                )}
            </Card>

            {/* Rescue Dispatch & Return To Home */}
            {canAct && mission.sarStatus !== 'RESCUED' && (
                <Card>
                    <SectionTitle title={t('mobile.ops.sar.commandTitle')}/>
                    {selectedDetection ? (
                        <AppText variant="small">
                            {t('mobile.ops.sar.dispatchTargetHint', {
                                label: selectedDetection.label,
                                confidence: Math.round(selectedDetection.confidence * 100),
                            })}
                        </AppText>
                    ) : (
                        <AppText variant="small">{t('mobile.ops.sar.dispatchDatumHint')}</AppText>
                    )}

                    <TextField
                        label={t('mobile.ops.sar.coordinatorNoteLabel')}
                        placeholder={t('mobile.ops.sar.coordinatorNotePlaceholder')}
                        value={coordinatorNote}
                        onChangeText={setCoordinatorNote}
                        multiline
                    />

                    <View style={styles.actions}>
                        <Button
                            label={t('mobile.ops.sar.dispatchButton')}
                            icon={Send}
                            loading={dispatchRescue.isPending}
                            onPress={handleDispatchRescue}
                            style={styles.flex}
                        />
                        <Button
                            label={t('mobile.ops.sar.rthButton')}
                            icon={Home}
                            tone="danger"
                            disabled={mission.uavId == null}
                            loading={returnToHome.isPending}
                            onPress={confirmReturnToHome}
                        />
                    </View>
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
    mapLink: {flexDirection: 'row', alignItems: 'center', gap: 4},
    linkText: {color: colors.primary, fontWeight: '600'},
    mapFrame: {height: 240, borderRadius: radius.control, overflow: 'hidden'},
    hudGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md},
    hudItem: {
        flexBasis: '45%',
        flexGrow: 1,
        backgroundColor: colors.slateLight,
        borderRadius: radius.control,
        padding: spacing.sm,
        gap: 2,
    },
    aiSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingTop: spacing.xs,
    },
    detectionCard: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.control,
        padding: spacing.md,
        gap: spacing.xs,
        backgroundColor: colors.surface,
    },
    detectionSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight,
    },
    actions: {flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.xs},
});
