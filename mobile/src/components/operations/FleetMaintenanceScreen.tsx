import React, {useMemo, useState} from 'react';
import {RefreshControl, ScrollView, StyleSheet, View} from 'react-native';
import {Stack, useRouter} from 'expo-router';
import {Bell, Cpu, History, Radio, Wrench} from 'lucide-react-native';
import {
    AppText,
    Card,
    ChipGroup,
    CONTENT_WIDTH,
    EmptyState,
    ErrorState,
    LoadingState,
    SectionTitle,
} from '@/components/ui';
import {HeaderIconButton} from '@/components/layout/AppHeader';
import {AppBackground} from '@/components/layout/AppBackground';
import {FleetStationCard, FleetUavCard, RepairOrderCard} from '@/components/uav/FleetAssetCards';
import {SimulationRunLogCard, SimulationSessionCard} from '@/components/uav/FleetSimulationCards';
import {MobileUav3DViewerCard} from '@/components/uav/MobileUav3DViewerCard';
import {MobileUavHealthAnalyticsCard} from '@/components/uav/MobileUavHealthAnalyticsCard';
import {useNotifications} from '@/hooks/notification/useNotifications';
import {useSimulationActions, useSimulationRuns, useSimulations} from '@/hooks/simulation/useSimulation';
import {useFleetOverview, useMaintenanceOrderActions, useMaintenanceOrders} from '@/hooks/uav/useFleetAndMaintenance';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {buildMaintenanceCompletionPayload} from '@/forms/operations/field-report-form';
import {missionFormError} from '@/shared/forms/mission/mission-form';
import type {UavHealthProfile} from '@/shared/types/uav/telemetry.types';
import {colors, radius, spacing} from '@/styles/tokens';

type FleetTab = 'uavs' | 'stations' | 'maintenance' | 'simulation';
type OrderFilter = '' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';

export function FleetMaintenanceScreen() {
    const {t} = useI18n();
    const {can} = useAuth();
    const toast = useToast();
    const router = useRouter();
    const {unreadCount} = useNotifications();

    const [tab, setTab] = useState<FleetTab>('uavs');
    const [orderFilter, setOrderFilter] = useState<OrderFilter>('');
    const [selectedProfile, setSelectedProfile] = useState<UavHealthProfile | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const {overview, telemetry, telemetryByUavId} = useFleetOverview();
    const ordersQuery = useMaintenanceOrders(orderFilter);
    const orderActions = useMaintenanceOrderActions();
    const simulationsQuery = useSimulations(tab === 'simulation');
    const simulationRunsQuery = useSimulationRuns(undefined, tab === 'simulation');
    const simulationActions = useSimulationActions();
    const canFlySim = can('UAV_UPDATE');
    const simBusy =
        simulationActions.command.isPending ||
        simulationActions.stop.isPending ||
        simulationActions.rehearseMission.isPending;

    const uavs = useMemo(() => overview.data?.uavs ?? [], [overview.data?.uavs]);
    const stations = overview.data?.stations ?? [];
    const orders = ordersQuery.data?.content ?? [];
    const activeSimulations = simulationsQuery.data ?? [];
    const simulationRuns = simulationRunsQuery.data ?? [];

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

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            if (tab === 'maintenance') {
                await ordersQuery.refetch();
            } else if (tab === 'simulation') {
                await Promise.all([simulationsQuery.refetch(), simulationRunsQuery.refetch()]);
            } else {
                await Promise.all([overview.refetch(), telemetry.refetch()]);
            }
        } finally {
            setRefreshing(false);
        }
    };

    const activeSample = selectedProfile ? telemetryByUavId.get(selectedProfile.uavId) : undefined;

    return (
        <View style={styles.screen}>
            <AppBackground/>
            <Stack.Screen
                options={{
                    headerRight: () => (
                        <HeaderIconButton
                            icon={Bell}
                            label={t('nav.notifications')}
                            count={unreadCount}
                            onPress={() => router.push('/operations/notifications')}
                        />
                    ),
                }}
            />

            <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={colors.primary}/>}>
                <ChipGroup<FleetTab>
                    value={tab}
                    onChange={setTab}
                    options={[
                        {value: 'uavs', label: t('mobile.ops.fleet.tabs.uavs')},
                        {value: 'stations', label: t('mobile.ops.fleet.tabs.stations')},
                        {value: 'maintenance', label: t('mobile.ops.fleet.tabs.maintenance')},
                        ...(can('UAV_VIEW') ? [{value: 'simulation' as const, label: t('operationsNav.simulation')}] : []),
                    ]}
                />

                {tab === 'uavs' && (
                    <>
                        <Card style={styles.summaryCard}>
                            <View style={styles.summaryGrid}>
                                <View style={styles.summaryCell}>
                                    <AppText variant="title" style={styles.summaryValue}>{fleetStats.total}</AppText>
                                    <AppText variant="caption" numberOfLines={1}>{t('mobile.ops.fleet.stats.total')}</AppText>
                                </View>
                                <View style={styles.summaryCell}>
                                    <AppText variant="title" style={styles.summaryValue}>{fleetStats.available}</AppText>
                                    <AppText variant="caption" numberOfLines={1}>{t('mobile.ops.fleet.stats.available')}</AppText>
                                </View>
                                <View style={styles.summaryCell}>
                                    <AppText variant="title" style={styles.summaryValue}>{fleetStats.active}</AppText>
                                    <AppText variant="caption" numberOfLines={1}>{t('mobile.ops.fleet.stats.active')}</AppText>
                                </View>
                                <View style={styles.summaryCell}>
                                    <AppText variant="title" style={styles.summaryValue}>{fleetStats.maintenance}</AppText>
                                    <AppText variant="caption" numberOfLines={1}>{t('mobile.ops.fleet.stats.maintenance')}</AppText>
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

                        {can('UAV_VIEW') && (
                            <MobileUavHealthAnalyticsCard
                                selectedUavId={selectedProfile?.uavId}
                                onSelectUav={setSelectedProfile}
                            />
                        )}

                        <MobileUav3DViewerCard
                            key={selectedProfile?.uavId ?? 'default-uav'}
                            serialNumber={selectedProfile?.serialNumber ?? uavs[0]?.serialNumber ?? 'UAV-350-RTK'}
                            modelName={selectedProfile?.model ?? uavs[0]?.model ?? 'DJI Matrice 350 RTK'}
                            airframeClass={selectedProfile?.airframeClass ?? 'QUADCOPTER_RTK'}
                            altitudeM={activeSample?.altitudeAglMeters ?? 85}
                            speedMps={activeSample?.groundSpeedMs ?? 12.4}
                            batteryPct={activeSample?.batteryPct ?? selectedProfile?.batteryStateOfHealthPct ?? 88}
                            yawDeg={activeSample?.headingDeg ?? 45}
                        />
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

                {tab === 'simulation' && (
                    <>
                        <Card>
                            <SectionTitle title={t('simulation.running')}/>
                            <AppText variant="small">{t('simulation.subtitle')}</AppText>
                        </Card>

                        {simulationsQuery.isPending ? (
                            <LoadingState label={t('mobile.ops.fleet.loading')}/>
                        ) : activeSimulations.length > 0 ? (
                            activeSimulations.map(sim => (
                                <SimulationSessionCard
                                    key={sim.uavId}
                                    state={sim}
                                    canFly={canFlySim}
                                    busy={simBusy}
                                    onCommand={cmd =>
                                        simulationActions.command.mutate(
                                            {uavId: sim.uavId, command: cmd},
                                            {onError: showError},
                                        )
                                    }
                                    onStop={() =>
                                        simulationActions.stop.mutate(sim.uavId, {onError: showError})
                                    }
                                    onOpenMission={missionId =>
                                        router.push({pathname: '/operations/mission/[id]', params: {id: String(missionId)}})
                                    }
                                />
                            ))
                        ) : null}

                        <Card>
                            <SectionTitle title={t('simulation.history.title')}/>
                            {simulationRunsQuery.isPending ? (
                                <LoadingState label={t('mobile.ops.fleet.loading')}/>
                            ) : simulationRuns.length === 0 ? (
                                <EmptyState icon={History} message={t('simulation.history.empty')}/>
                            ) : null}
                        </Card>

                        {simulationRuns.slice(0, 10).map(run => (
                            <SimulationRunLogCard
                                key={run.id}
                                run={run}
                                onOpenMission={missionId =>
                                    router.push({pathname: '/operations/mission/[id]', params: {id: String(missionId)}})
                                }
                            />
                        ))}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: colors.canvas},
    content: {padding: spacing.lg, gap: spacing.md, flexGrow: 1, width: '100%', maxWidth: CONTENT_WIDTH, alignSelf: 'center'},
    summaryCard: {paddingVertical: spacing.sm, paddingHorizontal: spacing.md},
    summaryGrid: {flexDirection: 'row', gap: spacing.xs},
    summaryCell: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: colors.slateLight,
        borderRadius: radius.control,
        paddingVertical: spacing.xs,
        paddingHorizontal: 4,
    },
    summaryValue: {color: colors.primary},
});
