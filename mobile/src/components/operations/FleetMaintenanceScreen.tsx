import React, {useMemo, useState} from 'react';
import {Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View} from 'react-native';
import {Stack, useRouter} from 'expo-router';
import {
    Bell,
    CheckCircle2,
    CheckSquare,
    ChevronRight,
    Cpu,
    ExternalLink,
    MapPin,
    Play,
    Radio,
    Square,
    Wrench,
} from 'lucide-react-native';
import {
    AppText,
    Badge,
    Button,
    Card,
    ChipGroup,
    CONTENT_WIDTH,
    EmptyState,
    ErrorState,
    LoadingState,
    SectionTitle,
    TextField,
} from '@/components/ui';
import {HeaderIconButton} from '@/components/layout/AppHeader';
import {AppBackground} from '@/components/layout/AppBackground';
import {useNotifications} from '@/hooks/notification/useNotifications';
import {useFleetOverview, useMaintenanceOrderActions, useMaintenanceOrders} from '@/hooks/uav/useFleetAndMaintenance';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {buildMaintenanceCompletionPayload, canSubmitMaintenanceCompletion} from '@/forms/operations/field-report-form';
import {missionFormError} from '@/shared/forms/mission/mission-form';
import type {OrderStatus, RepairOrder} from '@/shared/types/maintenance/maintenance.types';
import type {FleetStation, FleetUav, UavStatus} from '@/shared/types/uav/fleet-map.types';
import type {UavTelemetry} from '@/shared/types/uav/telemetry.types';
import {calendarDate, formatVnd, orderControls} from '@/shared/utils/maintenance/workflows';
import {isFinitePoint} from '@/utils/operations/map-shapes';
import {colors, radius, spacing} from '@/styles/tokens';

type FleetTab = 'uavs' | 'stations' | 'maintenance';
type OrderFilter = '' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';

function UavStatusBadge({status}: { status: UavStatus }) {
    const {t} = useI18n();
    const labelMap: Record<UavStatus, string> = {
        AVAILABLE: t('mobile.ops.fleet.uavStatus.AVAILABLE'),
        ASSIGNED: t('mobile.ops.fleet.uavStatus.ASSIGNED'),
        IN_USE: t('mobile.ops.fleet.uavStatus.IN_USE'),
        MAINTENANCE: t('mobile.ops.fleet.uavStatus.MAINTENANCE'),
        INACTIVE: t('mobile.ops.fleet.uavStatus.INACTIVE'),
    };
    const toneMap: Record<UavStatus, { background: string; color: string }> = {
        AVAILABLE: {background: colors.slateLight, color: colors.slateDark},
        ASSIGNED: {background: colors.primaryLight, color: colors.primary},
        IN_USE: {background: colors.slateDark, color: colors.white},
        MAINTENANCE: {background: colors.warningLight, color: colors.warning},
        INACTIVE: {background: colors.dangerLight, color: colors.danger},
    };
    const tone = toneMap[status] ?? toneMap.AVAILABLE;
    return <Badge label={labelMap[status] ?? status} background={tone.background} color={tone.color}/>;
}

function OrderStatusBadge({status}: { status: OrderStatus }) {
    const {t} = useI18n();
    const labelMap: Record<OrderStatus, string> = {
        OPEN: t('mobile.ops.maintenance.status.OPEN'),
        IN_PROGRESS: t('mobile.ops.maintenance.status.IN_PROGRESS'),
        COMPLETED: t('mobile.ops.maintenance.status.COMPLETED'),
        CANCELLED: t('mobile.ops.maintenance.status.CANCELLED'),
    };
    const toneMap: Record<OrderStatus, { background: string; color: string }> = {
        OPEN: {background: colors.warningLight, color: colors.warning},
        IN_PROGRESS: {background: colors.primaryLight, color: colors.primary},
        COMPLETED: {background: colors.slateDark, color: colors.white},
        CANCELLED: {background: colors.slateLight, color: colors.textSecondary},
    };
    const tone = toneMap[status];
    return <Badge label={labelMap[status]} background={tone.background} color={tone.color}/>;
}

function FleetUavCard({
    uav,
    sample,
    onOpenMission,
}: {
    uav: FleetUav;
    sample?: UavTelemetry;
    onOpenMission: (missionId: number) => void;
}) {
    const {t} = useI18n();
    return (
        <Card>
            <View style={styles.rowBetween}>
                <View style={styles.titleStack}>
                    <AppText variant="title">{uav.model}</AppText>
                    <AppText variant="caption" style={styles.code}>{uav.serialNumber}</AppText>
                </View>
                <UavStatusBadge status={uav.status}/>
            </View>

            <View style={styles.pills}>
                {uav.manufacturer ? <Badge label={uav.manufacturer}/> : null}
                {uav.stationName ? <Badge icon={Radio} label={uav.stationName}/> : null}
            </View>

            {sample ? (
                <View style={styles.telemetryStrip}>
                    <AppText variant="caption">
                        {t('opsMissions.overview.hud.battery')}: {sample.batteryPct != null ? `${sample.batteryPct}%` : '—'}
                    </AppText>
                    <AppText variant="caption">
                        {t('opsMissions.overview.hud.altitude')}:{' '}
                        {sample.altitudeAglMeters != null ? `${Math.round(sample.altitudeAglMeters)} m` : '—'}
                    </AppText>
                    <AppText variant="caption">
                        {t('opsMissions.overview.hud.speed')}:{' '}
                        {sample.groundSpeedMs != null ? `${sample.groundSpeedMs.toFixed(1)} m/s` : '—'}
                    </AppText>
                    <AppText variant="caption">RTK: {sample.rtkStatus ?? 'NONE'}</AppText>
                </View>
            ) : null}

            {uav.activeMission ? (
                <Pressable
                    onPress={() => onOpenMission(uav.activeMission!.id)}
                    accessibilityRole="button"
                    style={styles.missionBanner}>
                    <View style={styles.flex}>
                        <AppText variant="caption" style={styles.code}>{uav.activeMission.code}</AppText>
                        <AppText variant="small" numberOfLines={1}>{uav.activeMission.title}</AppText>
                    </View>
                    <ChevronRight size={16} color={colors.primary}/>
                </Pressable>
            ) : null}
        </Card>
    );
}

function FleetStationCard({station}: { station: FleetStation }) {
    const {t} = useI18n();
    const hasCoords = isFinitePoint(station.latitude, station.longitude);

    const openMaps = () => {
        if (!hasCoords) return;
        const label = encodeURIComponent(`${station.code} ${station.name}`);
        const url =
            Platform.OS === 'ios'
                ? `maps:?q=${label}&ll=${station.latitude},${station.longitude}`
                : `geo:${station.latitude},${station.longitude}?q=${station.latitude},${station.longitude}(${label})`;
        void Linking.openURL(url);
    };

    return (
        <Card>
            <View style={styles.rowBetween}>
                <AppText variant="caption" style={styles.code}>{station.code}</AppText>
                <Badge
                    icon={Cpu}
                    label={t('mobile.ops.fleet.stationUavCount', {count: station.uavCount})}
                    background={colors.slateLight}
                    color={colors.slateDark}
                />
            </View>
            <AppText variant="title">{station.name}</AppText>
            {station.status ? <AppText variant="caption">{station.status}</AppText> : null}
            {hasCoords && (
                <Pressable onPress={openMaps} accessibilityRole="button" style={styles.mapLink}>
                    <MapPin size={14} color={colors.muted}/>
                    <AppText variant="small" style={styles.flex}>
                        {station.latitude!.toFixed(5)}, {station.longitude!.toFixed(5)}
                    </AppText>
                    <ExternalLink size={14} color={colors.primary}/>
                </Pressable>
            )}
        </Card>
    );
}

function RepairOrderCard({
    order,
    canUpdate,
    startLoading,
    completeLoading,
    onStart,
    onComplete,
}: {
    order: RepairOrder;
    canUpdate: boolean;
    startLoading: boolean;
    completeLoading: boolean;
    onStart: () => void;
    onComplete: (notes: string, passed: boolean, onDone: () => void) => void;
}) {
    const {t, locale} = useI18n();
    const controls = orderControls(order.status, canUpdate);
    const [showCompleteForm, setShowCompleteForm] = useState(false);
    const [inspectionNotes, setInspectionNotes] = useState('');
    const [inspectionPassed, setInspectionPassed] = useState(true);

    const intlLocale = locale === 'ja' ? 'ja-JP' : locale === 'en' ? 'en-US' : 'vi-VN';
    const costLabel = /^\d+$/.test(order.totalMaterialCost)
        ? formatVnd(order.totalMaterialCost, undefined, intlLocale)
        : t('mobile.ops.maintenance.undeterminedCost');
    const plannedLabel = order.plannedDate
        ? calendarDate(order.plannedDate, undefined, intlLocale)
        : '—';

    return (
        <Card>
            <View style={styles.rowBetween}>
                <AppText variant="caption" style={styles.code}>{order.uavSerialNumber}</AppText>
                <OrderStatusBadge status={order.status}/>
            </View>

            <AppText variant="title">{order.title}</AppText>
            {order.description ? <AppText variant="small">{order.description}</AppText> : null}

            <View style={styles.metaGrid}>
                <AppText variant="caption">
                    {t('mobile.ops.maintenance.technician')}: {order.technicianName || '—'}
                </AppText>
                <AppText variant="caption">
                    {t('mobile.ops.maintenance.plannedDate')}: {plannedLabel}
                </AppText>
                <AppText variant="caption">
                    {t('mobile.ops.maintenance.materialCost')}: {costLabel}
                </AppText>
            </View>

            {order.inspectionNotes ? (
                <AppText variant="small">
                    {t('mobile.ops.maintenance.inspectionNotesLabel')}: {order.inspectionNotes}
                </AppText>
            ) : null}

            {controls.start && (
                <Button
                    label={t('mobile.ops.maintenance.startRepair')}
                    icon={Play}
                    loading={startLoading}
                    onPress={onStart}
                />
            )}

            {controls.complete && !showCompleteForm && (
                <Button
                    label={t('mobile.ops.maintenance.completeInspection')}
                    icon={CheckCircle2}
                    tone="secondary"
                    onPress={() => setShowCompleteForm(true)}
                />
            )}

            {controls.complete && showCompleteForm && (
                <View style={styles.inlineForm}>
                    <TextField
                        label={t('mobile.ops.maintenance.inspectionNotesLabel')}
                        placeholder={t('mobile.ops.maintenance.inspectionNotesPlaceholder')}
                        value={inspectionNotes}
                        onChangeText={setInspectionNotes}
                        multiline
                    />
                    <Pressable
                        onPress={() => setInspectionPassed(current => !current)}
                        accessibilityRole="checkbox"
                        accessibilityState={{checked: inspectionPassed}}
                        style={styles.checkRow}>
                        {inspectionPassed ? (
                            <CheckSquare size={20} color={colors.primary}/>
                        ) : (
                            <Square size={20} color={colors.slate}/>
                        )}
                        <AppText variant="small" style={styles.flex}>
                            {t('mobile.ops.maintenance.inspectionPassedCheck')}
                        </AppText>
                    </Pressable>
                    <View style={styles.actions}>
                        <Button
                            label={t('mobile.ops.maintenance.submitInspection')}
                            icon={CheckCircle2}
                            loading={completeLoading}
                            disabled={!canSubmitMaintenanceCompletion(inspectionNotes, inspectionPassed)}
                            onPress={() =>
                                onComplete(inspectionNotes, inspectionPassed, () => {
                                    setInspectionNotes('');
                                    setShowCompleteForm(false);
                                })
                            }
                            style={styles.flex}
                        />
                        <Button label={t('common.cancel')} tone="ghost" onPress={() => setShowCompleteForm(false)}/>
                    </View>
                </View>
            )}
        </Card>
    );
}

export function FleetMaintenanceScreen() {
    const {t} = useI18n();
    const {can} = useAuth();
    const toast = useToast();
    const router = useRouter();
    const {unreadCount} = useNotifications();

    const [tab, setTab] = useState<FleetTab>('uavs');
    const [orderFilter, setOrderFilter] = useState<OrderFilter>('');

    const {overview, telemetry, telemetryByUavId} = useFleetOverview();
    const ordersQuery = useMaintenanceOrders(orderFilter);
    const orderActions = useMaintenanceOrderActions();

    const uavs = useMemo(() => overview.data?.uavs ?? [], [overview.data?.uavs]);
    const stations = overview.data?.stations ?? [];
    const orders = ordersQuery.data?.content ?? [];

    const fleetStats = useMemo(() => {
        let available = 0;
        let active = 0;
        let maintenance = 0;
        for (const uav of uavs) {
            if (uav.status === 'AVAILABLE') available += 1;
            else if (uav.status === 'IN_USE' || uav.status === 'ASSIGNED') active += 1;
            else if (uav.status === 'MAINTENANCE') maintenance += 1;
        }
        return {total: uavs.length, available, active, maintenance};
    }, [uavs]);

    const showError = (error: unknown) => toast.show(missionFormError(error, t), 'error');

    const refreshing =
        tab === 'maintenance'
            ? ordersQuery.isRefetching
            : overview.isRefetching || telemetry.isRefetching;

    const handleRefresh = () => {
        if (tab === 'maintenance') {
            void ordersQuery.refetch();
        } else {
            void Promise.all([overview.refetch(), telemetry.refetch()]);
        }
    };

    return (
        <View style={styles.screen}>
            <AppBackground/>
            <Stack.Screen
                options={{
                    headerRight: () => (
                        <HeaderIconButton
                            icon={Bell}
                            label={t('nav.notifications')}
                            dot={unreadCount > 0}
                            onPress={() => router.push('/operations/notifications')}
                        />
                    ),
                }}
            />

            <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary}/>}>
                <ChipGroup<FleetTab>
                    value={tab}
                    onChange={setTab}
                    options={[
                        {value: 'uavs', label: t('mobile.ops.fleet.tabs.uavs')},
                        {value: 'stations', label: t('mobile.ops.fleet.tabs.stations')},
                        {value: 'maintenance', label: t('mobile.ops.fleet.tabs.maintenance')},
                    ]}
                />

                {tab === 'uavs' && (
                    <>
                        <Card>
                            <SectionTitle title={t('mobile.ops.fleet.summaryTitle')}/>
                            <View style={styles.summaryGrid}>
                                <View style={styles.summaryCell}>
                                    <AppText variant="caption">{t('mobile.ops.fleet.stats.total')}</AppText>
                                    <AppText variant="heading">{fleetStats.total}</AppText>
                                </View>
                                <View style={styles.summaryCell}>
                                    <AppText variant="caption">{t('mobile.ops.fleet.stats.available')}</AppText>
                                    <AppText variant="heading">{fleetStats.available}</AppText>
                                </View>
                                <View style={styles.summaryCell}>
                                    <AppText variant="caption">{t('mobile.ops.fleet.stats.active')}</AppText>
                                    <AppText variant="heading">{fleetStats.active}</AppText>
                                </View>
                                <View style={styles.summaryCell}>
                                    <AppText variant="caption">{t('mobile.ops.fleet.stats.maintenance')}</AppText>
                                    <AppText variant="heading">{fleetStats.maintenance}</AppText>
                                </View>
                            </View>
                        </Card>

                        {overview.isPending ? (
                            <LoadingState label={t('mobile.ops.fleet.loading')}/>
                        ) : overview.isError ? (
                            <ErrorState
                                message={t('mobile.ops.fleet.loadError')}
                                retryLabel={t('common.retry')}
                                onRetry={() => void overview.refetch()}
                            />
                        ) : uavs.length === 0 ? (
                            <EmptyState icon={Cpu} message={t('mobile.ops.fleet.emptyUavs')}/>
                        ) : (
                            uavs.map(uav => (
                                <FleetUavCard
                                    key={uav.id}
                                    uav={uav}
                                    sample={telemetryByUavId.get(uav.id)}
                                    onOpenMission={missionId =>
                                        router.push({pathname: '/operations/mission/[id]', params: {id: String(missionId)}})
                                    }
                                />
                            ))
                        )}
                    </>
                )}

                {tab === 'stations' && (
                    <>
                        {overview.isPending ? (
                            <LoadingState label={t('mobile.ops.fleet.loading')}/>
                        ) : overview.isError ? (
                            <ErrorState
                                message={t('mobile.ops.fleet.loadError')}
                                retryLabel={t('common.retry')}
                                onRetry={() => void overview.refetch()}
                            />
                        ) : stations.length === 0 ? (
                            <EmptyState icon={Radio} message={t('mobile.ops.fleet.emptyStations')}/>
                        ) : (
                            stations.map(station => <FleetStationCard key={station.id} station={station}/>)
                        )}
                    </>
                )}

                {tab === 'maintenance' && (
                    <>
                        {!can('UAV_MAINTENANCE_VIEW') ? (
                            <EmptyState icon={Wrench} message={t('mobile.ops.maintenance.noPermission')}/>
                        ) : (
                            <>
                                <ChipGroup<OrderFilter>
                                    value={orderFilter}
                                    onChange={setOrderFilter}
                                    options={[
                                        {value: '', label: t('mobile.ops.maintenance.filters.all')},
                                        {value: 'OPEN', label: t('mobile.ops.maintenance.status.OPEN')},
                                        {value: 'IN_PROGRESS', label: t('mobile.ops.maintenance.status.IN_PROGRESS')},
                                        {value: 'COMPLETED', label: t('mobile.ops.maintenance.status.COMPLETED')},
                                    ]}
                                />
                                {ordersQuery.isPending ? (
                                    <LoadingState label={t('mobile.ops.maintenance.loading')}/>
                                ) : ordersQuery.isError ? (
                                    <ErrorState
                                        message={t('mobile.ops.maintenance.loadError')}
                                        retryLabel={t('common.retry')}
                                        onRetry={() => void ordersQuery.refetch()}
                                    />
                                ) : orders.length === 0 ? (
                                    <EmptyState icon={Wrench} message={t('mobile.ops.maintenance.empty')}/>
                                ) : (
                                    orders.map(order => (
                                        <RepairOrderCard
                                            key={order.id}
                                            order={order}
                                            canUpdate={can('UAV_MAINTENANCE_UPDATE')}
                                            startLoading={orderActions.startOrder.isPending}
                                            completeLoading={orderActions.completeOrder.isPending}
                                            onStart={() =>
                                                orderActions.startOrder.mutate(
                                                    {orderId: order.id, expectedVersion: order.version},
                                                    {
                                                        onSuccess: () =>
                                                            toast.show(t('mobile.ops.maintenance.startedToast'), 'success'),
                                                        onError: showError,
                                                    },
                                                )
                                            }
                                            onComplete={(notes, passed, onDone) => {
                                                const payload = buildMaintenanceCompletionPayload(order.version, notes, passed);
                                                orderActions.completeOrder.mutate(
                                                    {orderId: order.id, ...payload},
                                                    {
                                                        onSuccess: () => {
                                                            onDone();
                                                            toast.show(t('mobile.ops.maintenance.completedToast'), 'success');
                                                        },
                                                        onError: showError,
                                                    },
                                                );
                                            }}
                                        />
                                    ))
                                )}
                            </>
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: colors.canvas},
    content: {padding: spacing.lg, gap: spacing.md, flexGrow: 1, width: '100%', maxWidth: CONTENT_WIDTH, alignSelf: 'center'},
    flex: {flex: 1},
    rowBetween: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm},
    titleStack: {flex: 1, gap: 2},
    code: {fontWeight: '700', letterSpacing: 0.5},
    pills: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    summaryGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
    summaryCell: {
        flexBasis: '45%',
        flexGrow: 1,
        backgroundColor: colors.slateLight,
        borderRadius: radius.control,
        padding: spacing.sm,
        gap: 2,
    },
    telemetryStrip: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
        backgroundColor: colors.slateLight,
        borderRadius: radius.control,
        padding: spacing.sm,
    },
    missionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.sm,
        borderRadius: radius.control,
        backgroundColor: colors.primaryLight,
    },
    mapLink: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    metaGrid: {gap: 2},
    inlineForm: {
        gap: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
    },
    checkRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs},
    actions: {flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap'},
});
