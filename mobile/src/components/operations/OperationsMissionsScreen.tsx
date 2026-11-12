import React, {useMemo, useState} from 'react';
import {FlatList, RefreshControl, StyleSheet, View} from 'react-native';
import {Stack, useRouter} from 'expo-router';
import {Bell, CalendarClock, ChevronRight, ClipboardList, Cpu, MapPin, ShieldCheck} from 'lucide-react-native';
import {AppText, Badge, Card, ChipGroup, CONTENT_WIDTH, EmptyState, ErrorState, LoadingState, SectionTitle, TextField} from '@/components/ui';
import {HeaderIconButton} from '@/components/layout/AppHeader';
import {AppBackground} from '@/components/layout/AppBackground';
import {MissionStatusBadge} from '@/components/mission/MissionBits';
import {PermitStatusBadge} from '@/components/mission/MissionPermitCard';
import {useNotifications} from '@/hooks/notification/useNotifications';
import {useOperationsMissionList, useOperatorLogbook} from '@/hooks/operations/useOperationsMissions';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {displayLabel} from '@/shared/lib/presentation';
import type {Mission} from '@/shared/types/mission/mission.types';
import {colors, radius, spacing} from '@/styles/tokens';

type OpsMissionFilter = 'assigned' | 'ready' | 'pending' | 'completed' | 'all';

const ACTIVE_FIELD_STATUSES = new Set(['CONFIRMED', 'RESOURCE_RESERVED', 'READY', 'IN_PROGRESS']);
const COMPLETED_STATUSES = new Set(['COMPLETED', 'FAILED']);

function matchesOpsFilter(mission: Mission, filter: OpsMissionFilter, userId?: number): boolean {
    switch (filter) {
        case 'assigned':
            if (userId != null && mission.operatorId === userId) return !COMPLETED_STATUSES.has(mission.status);
            return ACTIVE_FIELD_STATUSES.has(mission.status);
        case 'ready':
            return ACTIVE_FIELD_STATUSES.has(mission.status);
        case 'pending':
            return mission.status === 'PENDING_CONFIRMATION';
        case 'completed':
            return COMPLETED_STATUSES.has(mission.status);
        case 'all':
            return true;
    }
}

function OpsMissionCard({mission, onPress}: { mission: Mission; onPress: () => void }) {
    const {t, formatDate} = useI18n();
    const highPriority = mission.priority === 'URGENT' || mission.priority === 'HIGH';
    const showPermit =
        (mission.permit != null && mission.permit.status !== 'NOT_REQUIRED') ||
        !!mission.flightPlan?.permitSupport;

    return (
        <Card onPress={onPress} accessibilityLabel={`${mission.code} ${mission.title}`}>
            <View style={styles.topRow}>
                <View style={styles.badges}>
                    <AppText variant="caption" style={styles.code}>{mission.code}</AppText>
                    {highPriority && (
                        <Badge
                            label={displayLabel(mission.priority)}
                            background={mission.priority === 'URGENT' ? colors.dangerLight : colors.warningLight}
                            color={mission.priority === 'URGENT' ? colors.danger : colors.warning}
                        />
                    )}
                </View>
                <MissionStatusBadge status={mission.status}/>
            </View>

            <View style={styles.titleRow}>
                <AppText variant="title" numberOfLines={2} style={styles.flex}>{mission.title}</AppText>
                <ChevronRight size={18} color={colors.muted}/>
            </View>

            <View style={styles.metaRow}>
                <CalendarClock size={14} color={colors.muted}/>
                <AppText variant="small">
                    {formatDate(mission.startTime, {dateStyle: 'medium', timeStyle: 'short'})}
                </AppText>
            </View>

            {mission.locationName ? (
                <View style={styles.metaRow}>
                    <MapPin size={14} color={colors.muted}/>
                    <AppText variant="small" numberOfLines={1} style={styles.flex}>{mission.locationName}</AppText>
                </View>
            ) : null}

            <View style={styles.pillsRow}>
                {mission.uavId != null && (
                    <Badge
                        icon={Cpu}
                        label={t('opsMissions.detail.assigned.uavFallback', {id: mission.uavId})}
                        background={colors.slateLight}
                        color={colors.slateDark}
                    />
                )}
                {mission.operatorAccepted && (
                    <Badge
                        icon={ShieldCheck}
                        label={t('mobile.ops.missions.acceptedBadge')}
                        background={colors.slateLight}
                        color={colors.slateDark}
                    />
                )}
                {showPermit && <PermitStatusBadge status={mission.permit?.status ?? 'PENDING'}/>}
            </View>
        </Card>
    );
}

export function OperationsMissionsScreen() {
    const {t, formatNumber} = useI18n();
    const {user} = useAuth();
    const router = useRouter();
    const {unreadCount} = useNotifications();
    const [filter, setFilter] = useState<OpsMissionFilter>('assigned');
    const [search, setSearch] = useState('');

    const list = useOperationsMissionList({search});
    const logbook = useOperatorLogbook();

    const missions = useMemo(() => {
        const rows = list.data?.content ?? [];
        return rows.filter(item => matchesOpsFilter(item, filter, user?.id));
    }, [list.data?.content, filter, user?.id]);

    const filterOptions: { value: OpsMissionFilter; label: string }[] = [
        {value: 'assigned', label: t('mobile.ops.missions.filters.assigned')},
        {value: 'ready', label: t('mobile.ops.missions.filters.ready')},
        {value: 'pending', label: t('mobile.ops.missions.filters.pending')},
        {value: 'completed', label: t('mobile.ops.missions.filters.completed')},
        {value: 'all', label: t('mobile.ops.missions.filters.all')},
    ];

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

            {list.isPending || list.isError ? (
                <View style={styles.centerState}>
                    {list.isPending ? (
                        <LoadingState label={t('opsMissions.detail.loading')}/>
                    ) : (
                        <ErrorState
                            message={t('opsMissions.detail.errors.loadFailed')}
                            retryLabel={t('common.retry')}
                            onRetry={() => void list.refetch()}
                        />
                    )}
                </View>
            ) : (
                <FlatList
                    data={missions}
                    keyExtractor={item => String(item.id)}
                    contentInsetAdjustmentBehavior="automatic"
                    contentContainerStyle={styles.list}
                    keyboardShouldPersistTaps="handled"
                    ListHeaderComponent={
                        <View style={styles.headerBlock}>
                            {logbook.data && (
                                <Card>
                                    <SectionTitle
                                        title={t('capabilities.logbook.title')}
                                        action={<AppText variant="caption" style={styles.code}>{logbook.data.operatorFullName}</AppText>}
                                    />
                                    <View style={styles.kpiGrid}>
                                        <View style={styles.kpiCell}>
                                            <AppText variant="caption">{t('capabilities.logbook.totalHours')}</AppText>
                                            <AppText variant="title">{formatNumber(logbook.data.totalFlightHours)} h</AppText>
                                        </View>
                                        <View style={styles.kpiCell}>
                                            <AppText variant="caption">{t('capabilities.logbook.completedMissions')}</AppText>
                                            <AppText variant="title">
                                                {logbook.data.completedMissions}/{logbook.data.totalAssignedMissions}
                                            </AppText>
                                        </View>
                                        <View style={styles.kpiCell}>
                                            <AppText variant="caption">{t('capabilities.logbook.preflightCompliance')}</AppText>
                                            <AppText variant="title">{formatNumber(logbook.data.preflightComplianceRate)}%</AppText>
                                        </View>
                                        <View style={styles.kpiCell}>
                                            <AppText variant="caption">{t('capabilities.logbook.customerRating')}</AppText>
                                            <AppText variant="title">
                                                {logbook.data.averageCustomerRating != null
                                                    ? `★ ${logbook.data.averageCustomerRating.toFixed(1)}`
                                                    : '—'}
                                            </AppText>
                                        </View>
                                    </View>
                                </Card>
                            )}
                            <TextField
                                label={t('opsMissions.list.search')}
                                placeholder={t('opsMissions.list.search')}
                                value={search}
                                onChangeText={setSearch}
                                autoCorrect={false}
                                clearButtonMode="while-editing"
                                returnKeyType="search"
                            />
                            <ChipGroup options={filterOptions} value={filter} onChange={setFilter}/>
                        </View>
                    }
                    renderItem={({item}) => (
                        <OpsMissionCard
                            mission={item}
                            onPress={() => router.push({pathname: '/operations/mission/[id]', params: {id: String(item.id)}})}
                        />
                    )}
                    refreshControl={
                        <RefreshControl
                            refreshing={list.isRefetching}
                            onRefresh={() => void Promise.all([list.refetch(), logbook.refetch()])}
                            tintColor={colors.primary}
                        />
                    }
                    ListEmptyComponent={<EmptyState icon={ClipboardList} message={t('missions.emptyFiltered')}/>}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: colors.canvas},
    centerState: {flex: 1, justifyContent: 'center'},
    list: {padding: spacing.lg, gap: spacing.md, flexGrow: 1, width: '100%', maxWidth: CONTENT_WIDTH, alignSelf: 'center'},
    headerBlock: {gap: spacing.sm},
    kpiGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
    kpiCell: {
        flexBasis: '47%',
        flexGrow: 1,
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.slateLight,
        padding: spacing.sm,
        gap: 2,
    },
    topRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm},
    badges: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap'},
    code: {fontWeight: '700', letterSpacing: 0.5},
    titleRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    metaRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
    pillsRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap', marginTop: 2},
    flex: {flex: 1},
});
