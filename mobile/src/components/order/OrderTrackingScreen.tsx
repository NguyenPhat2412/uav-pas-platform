import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import MapView, {Marker, Polyline} from 'react-native-maps';
import {
    BatteryCharging,
    CalendarCheck2,
    CheckCircle2,
    Clock3,
    Gauge,
    Hourglass,
    PackageCheck,
    Plane,
    Star,
    Wifi,
    type LucideIcon,
} from 'lucide-react-native';
import {
    AppText,
    Badge,
    Card,
    ErrorState,
    LoadingState,
    ScaledText,
    Screen,
    SectionTitle,
} from '@/components/ui';
import {useMissionDetail} from '@/hooks/mission/useCustomerMissions';
import {useOrderTracking} from '@/hooks/order/useOrders';
import {useI18n} from '@/providers/I18nContext';
import type {OrderStatusGroup} from '@/shared/types/project/project.types';
import {
    formatTrackingLink,
    ORDER_STATUS_GROUPS,
    resolveOrderStatusGroup,
} from '@/utils/mission/order-groups';
import {isFinitePoint} from '@/utils/operations/map-shapes';
import {colors, font, radius, spacing} from '@/styles/tokens';

const MILESTONE_ICONS: Record<OrderStatusGroup, LucideIcon> = {
    PENDING: Hourglass,
    SCHEDULED: CalendarCheck2,
    IN_FLIGHT: Plane,
    DELIVERED: PackageCheck,
    TO_REVIEW: Star,
};

function toLatLngList(pairs?: number[][] | null): { latitude: number; longitude: number }[] {
    if (!Array.isArray(pairs)) return [];
    return pairs
        .filter(p => Array.isArray(p) && p.length >= 2 && isFinitePoint(p[0], p[1]))
        .map(p => ({latitude: p[0], longitude: p[1]}));
}

/**
 * Simulated UAV Flight & Delivery Tracking Screen (`GET /api/v1/orders/{id}/tracking`,
 * S1-mobile.md #5 & UI-GUIDE §3.6):
 * - Live Apple Map with simulated UAV position + planned waypoints + flown track
 * - 4 compact 1-line telemetry tiles (Progress, Battery, Link, ETA)
 * - Vertical Shopee-style milestone timeline with current milestone highlighted in brand red
 */
export function OrderTrackingScreen() {
    const {t, formatDate} = useI18n();
    const {id} = useLocalSearchParams<{ id: string }>();
    const orderId = Number(id);
    const trackingQuery = useOrderTracking(orderId);
    const {detail} = useMissionDetail(orderId);

    const tracking = trackingQuery.data;
    const mission = detail.data;

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

    const uavLat = tracking?.position?.latitude ?? mission?.latitude ?? 21.0285;
    const uavLng = tracking?.position?.longitude ?? mission?.longitude ?? 105.8542;
    const hasCoords = isFinitePoint(uavLat, uavLng);
    const waypoints = toLatLngList(tracking?.waypoints);
    const track = toLatLngList(tracking?.track);

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
        IN_FLIGHT: t('mobile.overnight.orderInFlight'),
        DELIVERED: t('mobile.overnight.orderDelivered'),
        TO_REVIEW: t('mobile.overnight.orderToReview'),
    };

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
                        icon={Plane}
                        label={milestoneLabels[activeGroup]}
                        background={colors.primaryLight}
                        color={colors.primary}
                    />
                </View>
                {mission?.title ? (
                    <AppText variant="title" numberOfLines={2}>
                        {mission.title}
                    </AppText>
                ) : null}

                {hasCoords ? (
                    <View style={styles.mapFrame}>
                        <MapView
                            style={styles.map}
                            initialRegion={{
                                latitude: uavLat,
                                longitude: uavLng,
                                latitudeDelta: 0.018,
                                longitudeDelta: 0.018,
                            }}>
                            {waypoints.length >= 2 ? (
                                <Polyline
                                    coordinates={waypoints}
                                    strokeColor={colors.slate}
                                    strokeWidth={2}
                                />
                            ) : null}
                            {track.length >= 2 ? (
                                <Polyline
                                    coordinates={track}
                                    strokeColor={colors.primary}
                                    strokeWidth={3}
                                />
                            ) : null}
                            <Marker
                                coordinate={{latitude: uavLat, longitude: uavLng}}
                                pinColor={colors.primary}
                            />
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
                            {Math.round(tracking.progressPct ?? 0)}%
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
                    <Card style={styles.kpiTile}>
                        <Clock3 size={18} color={colors.primary}/>
                        <AppText variant="caption" numberOfLines={1}>
                            {t('mobile.overnight.trackingEta')}
                        </AppText>
                        <ScaledText style={styles.kpiVal} numberOfLines={1}>
                            {tracking.etaMinutes != null
                                ? t('mobile.overnight.trackingMinutes', {
                                      min: Math.max(0, Math.round(tracking.etaMinutes)),
                                  })
                                : '—'}
                        </ScaledText>
                    </Card>
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
    code: {fontWeight: '700', color: colors.slateDark},
    mapFrame: {
        height: 220,
        borderRadius: radius.card,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.slateLight,
    },
    map: {flex: 1},
    kpiGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    kpiTile: {flex: 1, minWidth: '46%', alignItems: 'center', gap: 4, paddingVertical: spacing.sm},
    kpiVal: {fontSize: font.title, fontWeight: '700', color: colors.text},
    stepRow: {flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm},
    railCol: {alignItems: 'center', width: 28},
    dotCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.slateLight,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dotCurrent: {backgroundColor: colors.primary, borderColor: colors.primary},
    dotDone: {backgroundColor: colors.slateLight, borderColor: colors.slate},
    railLine: {width: 2, flex: 1, minHeight: 16, backgroundColor: colors.border, marginVertical: 2},
    railLineDone: {backgroundColor: colors.slate},
    stepTextCol: {flex: 1, paddingBottom: spacing.sm, justifyContent: 'center'},
    stepTitle: {fontSize: font.body, color: colors.textSecondary},
    stepTitleCurrent: {color: colors.primary, fontWeight: '700'},
});
