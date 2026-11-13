import React, {useMemo, useState} from 'react';
import {Alert, Linking, Platform, Pressable, StyleSheet, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import MapView, {Circle, Marker, Polygon} from 'react-native-maps';
import {ExternalLink, Home, Send} from 'lucide-react-native';
import {AppText, Button, Card, ErrorState, LoadingState, Screen, SectionTitle, TextField} from '@/components/ui';
import {SarDetectionsCard, SarMissionHeaderCard, SarTelemetryHudCard} from '@/components/operations/SarCockpitPanels';
import {useSarCockpit} from '@/hooks/sar/useSarCockpit';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {buildRescueDispatchPayload} from '@/forms/operations/field-report-form';
import {missionFormError} from '@/shared/forms/mission/mission-form';
import type {AiDetection} from '@/shared/types/sar/sar.types';
import {isFinitePoint, parseGeoJsonPolygonCoordinates} from '@/utils/operations/map-shapes';
import {colors, radius, sarMapTone, spacing} from '@/styles/tokens';

export function SarCockpitScreen() {
    const {t} = useI18n();
    const {can} = useAuth();
    const toast = useToast();
    const router = useRouter();
    const {missionId: missionIdParam} = useLocalSearchParams<{ missionId: string }>();
    const missionId = Number(missionIdParam);

    const {
        mission, missionsQuery, detections, tasks, telemetry,
        verifyDetection, dispatchRescue, returnToHome, refresh,
    } = useSarCockpit(missionId);

    const [selectedDetectionId, setSelectedDetectionId] = useState<number | null>(null);
    const [coordinatorNote, setCoordinatorNote] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await refresh();
        } finally {
            setRefreshing(false);
        }
    };

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
        hasLkp && typeof mission.driftRadiusMeters === 'number' &&
        Number.isFinite(mission.driftRadiusMeters) && mission.driftRadiusMeters > 0;
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
        const url = Platform.OS === 'ios' ? `maps:?q=${label}&ll=${lat},${lng}` : `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
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
        <Screen onRefresh={() => void handleRefresh()} refreshing={refreshing}>
            <SarMissionHeaderCard
                mission={mission}
                hasLkp={hasLkp}
                hasDrift={hasDrift}
                onOpenMissionDetail={() => router.push({pathname: '/operations/mission/[id]', params: {id: String(mission.missionId)}})}
            />

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

            <SarTelemetryHudCard liveTelemetry={liveTelemetry} latestTask={latestTask}/>

            <SarDetectionsCard
                detectionList={detectionList}
                selectedDetectionId={selectedDetection?.id ?? null}
                isPending={detections.isPending}
                canAct={canAct}
                verifying={verifyDetection.isPending}
                onSelectDetection={setSelectedDetectionId}
                onVerifyDetection={detectionId =>
                    verifyDetection.mutate({detectionId, verified: true}, {
                        onSuccess: () => { setSelectedDetectionId(detectionId); toast.show(t('mobile.ops.sar.verifiedToast'), 'success'); },
                        onError: showError,
                    })
                }
                onDismissDetection={detectionId =>
                    verifyDetection.mutate({detectionId, verified: false}, {
                        onSuccess: () => toast.show(t('mobile.ops.sar.dismissedToast'), 'info'),
                        onError: showError,
                    })
                }
            />

            {canAct && mission.sarStatus !== 'RESCUED' && (
                <Card>
                    <SectionTitle title={t('mobile.ops.sar.commandTitle')}/>
                    {selectedDetection ? (
                        <AppText variant="small">
                            {t('mobile.ops.sar.dispatchTargetHint', {label: selectedDetection.label, confidence: Math.round(selectedDetection.confidence * 100)})}
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
    mapLink: {flexDirection: 'row', alignItems: 'center', gap: 4},
    linkText: {color: colors.primary, fontWeight: '600'},
    mapFrame: {height: 240, borderRadius: radius.control, overflow: 'hidden'},
    actions: {flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.xs},
});
