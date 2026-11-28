import React, {useEffect, useMemo, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import MapView, {Marker, Polyline} from 'react-native-maps';
import {
    BatteryCharging, CalendarCheck2, CheckCircle2, Clock3, Gauge,
    Hourglass, Navigation2, PackageCheck, Plane, Star, Wifi, type LucideIcon,
} from 'lucide-react-native';
import {
    AppText, Badge, Card, ErrorState, LoadingState, ScaledText, Screen, SectionTitle,
} from '@/components/ui';
import {useMissionDetail} from '@/hooks/useCustomerMissions';
import {useOrderTracking} from '@/hooks/useOrders';
import {useI18n} from '@/providers/I18nContext';
import type {OrderStatusGroup} from '@/shared/types/project.types';
import {cleanEntityName} from '@/utils/clean-text';
import {formatTrackingLink, ORDER_STATUS_GROUPS, resolveOrderStatusGroup} from '@/utils/order-groups';
import {isFinitePoint} from '@/utils/map-shapes';
import {computeFitRegion, toLatLngList, type LatLng} from '@/utils/tracking-geometry';
import {colors, font, radius, spacing} from '@/styles/tokens';

const MILESTONE_ICONS: Record<OrderStatusGroup, LucideIcon> = {
    PENDING: Hourglass,
    SCHEDULED: CalendarCheck2,
    IN_FLIGHT: Plane,
    DELIVERED: PackageCheck,
    TO_REVIEW: Star,
};

/**
 * Simulated UAV Flight & Delivery Tracking Screen (`GET /api/v1/orders/{id}/tracking`,
 * UI-REVIEW-9-FIXES #4 & UI-GUIDE §3.6):
 * - Draws planned `waypoints` (dashed muted polyline) and flown `track` (solid primary polyline)
 * - Rotates UAV marker at `position` by `headingDeg` and auto-fits bounds to the flight path
 * - Displays "Đã bay xong · Chờ bàn giao" and hides "Còn lại 0 phút" once simulation completes
 */
export function OrderTrackingScreen() {
    const {t, formatDate} = useI18n();
    const {id} = useLocalSearchParams<{ id: string }>();
    const orderId = Number(id);
    const trackingQuery = useOrderTracking(orderId);
    const {detail} = useMissionDetail(orderId);
    const mapRef = useRef<MapView | null>(null);

    const tracking = trackingQuery.data;
    const mission = detail.data;

    const uavLat = tracking?.position?.latitude ?? mission?.latitude ?? 21.0285;
    const uavLng = tracking?.position?.longitude ?? mission?.longitude ?? 105.8542;
    const headingDeg = Number.isFinite(tracking?.position?.headingDeg)
        ? Number(tracking?.position?.headingDeg)
        : 0;
    const hasCoords = isFinitePoint(uavLat, uavLng);
    const waypoints = useMemo(() => toLatLngList(tracking?.waypoints), [tracking?.waypoints]);
    const track = useMemo(() => toLatLngList(tracking?.track), [tracking?.track]);

    const fitPoints = useMemo(() => {
        const pts: LatLng[] = [...waypoints, ...track];
        if (hasCoords) pts.push({latitude: uavLat, longitude: uavLng});
        return pts;
    }, [hasCoords, track, uavLat, uavLng, waypoints]);

    const fitFlightBounds = () => {
        if (fitPoints.length >= 2) {
            mapRef.current?.fitToCoordinates(fitPoints, {
                edgePadding: {top: 40, right: 40, bottom: 40, left: 40},
                animated: false,
            });
        }
    };

    useEffect(() => {
        fitFlightBounds();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [waypoints.length, track.length]);

    const handleRefresh = () => {
        void trackingQuery.refetch();
        void detail.refetch();
    };

    if (trackingQuery.isPending && detail.isPending) {
        return (
            <Screen>
                <LoadingState label={t('missionDetail.loading')}/>
            </Screen>
        );
    }

    if (trackingQuery.isError && !mission) {
        return (
            <Screen>
                <ErrorState
                    message={t('mobile.overnight.trackingLoadError')}
                    retryLabel={t('common.retry')}
                    onRetry={handleRefresh}
                />
            </Screen>
        );
    }

    const rawStatus = String(tracking?.status ?? mission?.status ?? '');
    const progressVal = Number(tracking?.progressPct ?? 0);
    const isFlightDoneAwaitingHandover =
        (rawStatus === 'IN_PROGRESS' || rawStatus === 'IN_FLIGHT') &&
        (progressVal >= 100 || tracking?.activeSimulation === false);

    const activeGroup: OrderStatusGroup =
        (ORDER_STATUS_GROUPS.includes(tracking?.statusGroup as OrderStatusGroup)
            ? (tracking?.statusGroup as OrderStatusGroup)
            : null) ??
        (mission ? resolveOrderStatusGroup(mission) : null) ??
        'PENDING';
    const activeIndex = ORDER_STATUS_GROUPS.indexOf(activeGroup);

    const milestoneLabels: Record<OrderStatusGroup, string> = {
        PENDING: t('mobile.overnight.orderPending'),
        SCHEDULED: t('mobile.overnight.orderScheduled'),
        IN_FLIGHT: isFlightDoneAwaitingHandover
            ? t('mobile.overnight.flightDoneAwaitingHandover')
            : t('mobile.overnight.orderInFlight'),
        DELIVERED: t('mobile.overnight.orderDelivered'),
        TO_REVIEW: t('mobile.overnight.orderToReview'),
    };

    const showEtaTile =
        !isFlightDoneAwaitingHandover &&
        tracking?.etaMinutes != null &&
        Math.round(tracking.etaMinutes) > 0;

    return (
        <Screen
            onRefresh={handleRefresh}
            refreshing={trackingQuery.isRefetching || detail.isRefetching}>
            <Card>
                <View style={styles.headerRow}>
                    <AppText variant="caption" style={styles.code} numberOfLines={1}>
                        {tracking?.missionCode || mission?.code || `#${orderId}`}
                    </AppText>
                    <Badge
                        icon={isFlightDoneAwaitingHandover ? CheckCircle2 : Plane}
                        label={milestoneLabels[activeGroup]}
                        background={isFlightDoneAwaitingHandover ? colors.slateLight : colors.primaryLight}
                        color={isFlightDoneAwaitingHandover ? colors.slateDark : colors.primary}
                    />
                </View>
                {mission?.title ? (
                    <AppText variant="title" numberOfLines={2}>
                        {cleanEntityName(mission.title)}
                    </AppText>
                ) : null}

                {hasCoords ? (
                    <View style={styles.mapFrame}>
                        <MapView
                            ref={mapRef}
                            style={styles.map}
                            initialRegion={computeFitRegion(fitPoints, uavLat, uavLng)}
                            onMapReady={fitFlightBounds}>
                            {waypoints.length >= 2 ? (
                                <Polyline
                                    coordinates={waypoints}
                                    strokeColor={colors.muted}
                                    strokeWidth={2.5}
                                    lineDashPattern={[6, 5]}
                                />
                            ) : null}
                            {track.length >= 2 ? (
                                <Polyline
                                    coordinates={track}
                                    strokeColor={colors.primary}
                                    strokeWidth={3.5}
                                />
                            ) : null}
                            {waypoints.length >= 2 ? (
                                <Marker
                                    coordinate={waypoints[0]}
                                    anchor={{x: 0.5, y: 0.5}}
                                    tracksViewChanges={false}>
                                    <View style={styles.waypointStartDot}/>
                                </Marker>
                            ) : null}
                            <Marker
                                coordinate={{latitude: uavLat, longitude: uavLng}}
                                anchor={{x: 0.5, y: 0.5}}
                                flat>
                                <View style={styles.uavMarkerOuter}>
                                    <View style={{transform: [{rotate: `${headingDeg}deg`}]}}>
                                        <Navigation2 size={14} color={colors.white} fill={colors.white}/>
                                    </View>
                                </View>
                            </Marker>
                        </MapView>
                    </View>
                ) : null}
            </Card>

            {trackingQuery.isError ? (
                <ErrorState
                    message={t('mobile.overnight.trackingLoadError')}
                    retryLabel={t('common.retry')}
                    onRetry={() => void trackingQuery.refetch()}
                />
            ) : tracking ? (
                <View style={styles.kpiGrid}>
                    <Card style={styles.kpiTile}>
                        <Gauge size={18} color={colors.primary}/>
                        <AppText variant="caption" numberOfLines={1}>
                            {t('mobile.overnight.trackingProgress')}
                        </AppText>
                        <ScaledText style={styles.kpiVal} numberOfLines={1}>
                            {Math.round(progressVal)}%
                        </ScaledText>
                    </Card>
                    <Card style={styles.kpiTile}>
                        <BatteryCharging size={18} color={colors.primary}/>
                        <AppText variant="caption" numberOfLines={1}>
                            {t('mobile.overnight.trackingBattery')}
                        </AppText>
                        <ScaledText style={styles.kpiVal} numberOfLines={1}>
                            {tracking.battery != null ? `${Math.round(tracking.battery)}%` : '—'}
                        </ScaledText>
                    </Card>
                    <Card style={styles.kpiTile}>
                        <Wifi size={18} color={colors.primary}/>
                        <AppText variant="caption" numberOfLines={1}>
                            {t('mobile.overnight.trackingLink')}
                        </AppText>
                        <ScaledText style={styles.kpiVal} numberOfLines={1}>
                            {formatTrackingLink(tracking.link)}
                        </ScaledText>
                    </Card>
                    {showEtaTile ? (
                        <Card style={styles.kpiTile}>
                            <Clock3 size={18} color={colors.primary}/>
                            <AppText variant="caption" numberOfLines={1}>
                                {t('mobile.overnight.trackingEta')}
                            </AppText>
                            <ScaledText style={styles.kpiVal} numberOfLines={1}>
                                {t('mobile.overnight.trackingMinutes', {
                                    min: Math.max(1, Math.round(tracking.etaMinutes ?? 0)),
                                })}
                            </ScaledText>
                        </Card>
                    ) : null}
                </View>
            ) : null}

            <Card>
                <SectionTitle title={t('mobile.overnight.trackingTimelineTitle')}/>
                {ORDER_STATUS_GROUPS.map((group, idx) => {
                    const isCurrent = idx === activeIndex;
                    const isDone = idx < activeIndex;
                    const Icon = isDone ? CheckCircle2 : MILESTONE_ICONS[group];
                    return (
                        <View key={group} style={styles.stepRow}>
                            <View style={styles.railCol}>
                                <View
                                    style={[
                                        styles.dotCircle,
                                        isCurrent && styles.dotCurrent,
                                        isDone && styles.dotDone,
                                    ]}>
                                    <Icon
                                        size={14}
                                        color={
                                            isCurrent
                                                ? colors.white
                                                : isDone
                                                  ? colors.slateDark
                                                  : colors.muted
                                        }
                                    />
                                </View>
                                {idx < ORDER_STATUS_GROUPS.length - 1 ? (
                                    <View style={[styles.railLine, isDone && styles.railLineDone]}/>
                                ) : null}
                            </View>
                            <View style={styles.stepTextCol}>
                                <AppText
                                    variant="title"
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.82}
                                    style={[
                                        styles.stepTitle,
                                        isCurrent && styles.stepTitleCurrent,
                                    ]}>
                                    {milestoneLabels[group]}
                                </AppText>
                                {isCurrent && tracking?.updatedAt ? (
                                    <AppText variant="caption" numberOfLines={1}>
                                        {formatDate(tracking.updatedAt, {
                                            dateStyle: 'short',
                                            timeStyle: 'short',
                                        })}
                                    </AppText>
                                ) : null}
                            </View>
                        </View>
                    );
                })}
            </Card>
        </Screen>
    );
}

const styles = StyleSheet.create({
    headerRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs},
    code: {fontWeight: '700', color: colors.slateDark, flexShrink: 1},
    mapFrame: {
        height: 224, borderRadius: radius.card, overflow: 'hidden',
        borderWidth: 1, borderColor: colors.border, backgroundColor: colors.slateLight,
    },
    map: {flex: 1},
    waypointStartDot: {
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: colors.surface, borderWidth: 2.5, borderColor: colors.slateDark,
    },
    uavMarkerOuter: {
        width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary,
        borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center',
    },
    kpiGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    kpiTile: {flex: 1, minWidth: '30%', alignItems: 'center', gap: 4, paddingVertical: spacing.sm},
    kpiVal: {fontSize: font.title, fontWeight: '700', color: colors.text},
    stepRow: {flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm},
    railCol: {alignItems: 'center', width: 28},
    dotCircle: {
        width: 28, height: 28, borderRadius: 14, backgroundColor: colors.slateLight,
        borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    },
    dotCurrent: {backgroundColor: colors.primary, borderColor: colors.primary},
    dotDone: {backgroundColor: colors.slateLight, borderColor: colors.slate},
    railLine: {width: 2, flex: 1, minHeight: 16, backgroundColor: colors.border, marginVertical: 2},
    railLineDone: {backgroundColor: colors.slate},
    stepTextCol: {flex: 1, paddingBottom: spacing.sm, justifyContent: 'center'},
    stepTitle: {fontSize: font.body, color: colors.textSecondary},
    stepTitleCurrent: {color: colors.primary, fontWeight: '700'},
});
