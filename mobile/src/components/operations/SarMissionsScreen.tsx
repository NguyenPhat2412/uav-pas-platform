import React, {useState} from 'react';
import {FlatList, RefreshControl, StyleSheet, View} from 'react-native';
import {Stack, useRouter} from 'expo-router';
import {Bell, ChevronRight, Compass, Cpu, Crosshair, Radio, Users} from 'lucide-react-native';
import {AppText, Badge, Card, ChipGroup, CONTENT_WIDTH, EmptyState, ErrorState, LoadingState} from '@/components/ui';
import {HeaderIconButton} from '@/components/layout/AppHeader';
import {AppBackground} from '@/components/layout/AppBackground';
import {useNotifications} from '@/hooks/notification/useNotifications';
import {useSarMissions} from '@/hooks/sar/useSarCockpit';
import {useI18n} from '@/providers/I18nContext';
import {displayLabel} from '@/shared/lib/presentation';
import type {SarCockpitMission, SarStatus} from '@/shared/types/sar/sar.types';
import {isFinitePoint} from '@/utils/operations/map-shapes';
import {colors, spacing} from '@/styles/tokens';

type SarFilterMode = 'active' | 'all';

export function SarStatusBadge({status}: { status: SarStatus }) {
    const {t} = useI18n();
    const labelMap: Record<SarStatus, string> = {
        SEARCHING: t('mobile.ops.sar.status.SEARCHING'),
        TARGET_LOCATED: t('mobile.ops.sar.status.TARGET_LOCATED'),
        RESCUED: t('mobile.ops.sar.status.RESCUED'),
        SUSPENDED: t('mobile.ops.sar.status.SUSPENDED'),
    };
    const toneMap: Record<SarStatus, { background: string; color: string }> = {
        SEARCHING: {background: colors.warningLight, color: colors.warning},
        TARGET_LOCATED: {background: colors.dangerLight, color: colors.danger},
        RESCUED: {background: colors.slateDark, color: colors.white},
        SUSPENDED: {background: colors.slateLight, color: colors.textSecondary},
    };
    const tone = toneMap[status];
    return <Badge label={labelMap[status]} background={tone.background} color={tone.color}/>;
}

function SarMissionCard({item, onPress}: { item: SarCockpitMission; onPress: () => void }) {
    const {t} = useI18n();
    const urgent = item.priority === 'URGENT' || item.priority === 'HIGH';

    return (
        <Card onPress={onPress} accessibilityLabel={`${item.missionCode} ${item.missionTitle}`}>
            <View style={styles.topRow}>
                <View style={styles.badges}>
                    <AppText variant="caption" style={styles.code}>{item.missionCode}</AppText>
                    {item.priority ? (
                        <Badge
                            label={displayLabel(item.priority)}
                            background={urgent ? colors.dangerLight : colors.slateLight}
                            color={urgent ? colors.danger : colors.slateDark}
                        />
                    ) : null}
                </View>
                <SarStatusBadge status={item.sarStatus}/>
            </View>

            <View style={styles.titleRow}>
                <AppText variant="title" numberOfLines={2} style={styles.flex}>{item.missionTitle}</AppText>
                <ChevronRight size={18} color={colors.muted}/>
            </View>

            <View style={styles.metaRow}>
                <Crosshair size={14} color={colors.primary}/>
                <AppText variant="small">
                    {t('mobile.ops.sar.lkpLabel')}:{' '}
                    {isFinitePoint(item.lkpLatitude, item.lkpLongitude)
                        ? `${item.lkpLatitude.toFixed(5)}, ${item.lkpLongitude.toFixed(5)}`
                        : '—'}
                    {typeof item.driftRadiusMeters === 'number' && Number.isFinite(item.driftRadiusMeters)
                        ? ` · ±${Math.round(item.driftRadiusMeters)} m`
                        : ''}
                </AppText>
            </View>

            <View style={styles.pillsRow}>
                {item.victimCountEstimated != null && (
                    <Badge
                        icon={Users}
                        label={t('mobile.ops.sar.victimsCount', {count: item.victimCountEstimated})}
                        background={colors.primaryLight}
                        color={colors.primary}
                    />
                )}
                {item.uavSerialNumber ? (
                    <Badge
                        icon={Cpu}
                        label={item.uavModel ? `${item.uavModel} (${item.uavSerialNumber})` : item.uavSerialNumber}
                        background={colors.slateLight}
                        color={colors.slateDark}
                    />
                ) : null}
                {item.stationName ? (
                    <Badge
                        icon={Radio}
                        label={item.stationName}
                        background={colors.slateLight}
                        color={colors.slateDark}
                    />
                ) : null}
            </View>
        </Card>
    );
}

export function SarMissionsScreen() {
    const {t} = useI18n();
    const router = useRouter();
    const {unreadCount} = useNotifications();
    const [mode, setMode] = useState<SarFilterMode>('active');
    const [refreshing, setRefreshing] = useState(false);

    const query = useSarMissions(mode === 'all');
    const items = query.data ?? [];

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await query.refetch();
        } finally {
            setRefreshing(false);
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
                            count={unreadCount}
                            onPress={() => router.push('/operations/notifications')}
                        />
                    ),
                }}
            />

            {!query.data && (query.isPending || query.isError) ? (
                <View style={styles.centerState}>
                    {query.isPending ? (
                        <LoadingState label={t('mobile.ops.sar.loading')}/>
                    ) : (
                        <ErrorState
                            message={t('mobile.ops.sar.loadError')}
                            retryLabel={t('common.retry')}
                            onRetry={() => void query.refetch()}
                        />
                    )}
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={item => String(item.sarId)}
                    contentInsetAdjustmentBehavior="automatic"
                    contentContainerStyle={styles.list}
                    ListHeaderComponent={
                        <ChipGroup<SarFilterMode>
                            value={mode}
                            onChange={setMode}
                            options={[
                                {value: 'active', label: t('mobile.ops.sar.filters.active')},
                                {value: 'all', label: t('mobile.ops.sar.filters.all')},
                            ]}
                        />
                    }
                    renderItem={({item}) => (
                        <SarMissionCard
                            item={item}
                            onPress={() =>
                                router.push({pathname: '/operations/sar/[missionId]', params: {missionId: String(item.missionId)}})
                            }
                        />
                    )}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => void handleRefresh()}
                            tintColor={colors.primary}
                        />
                    }
                    ListEmptyComponent={<EmptyState icon={Compass} message={t('mobile.ops.sar.empty')}/>}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: colors.canvas},
    centerState: {flex: 1, justifyContent: 'center'},
    list: {padding: spacing.lg, gap: spacing.md, flexGrow: 1, width: '100%', maxWidth: CONTENT_WIDTH, alignSelf: 'center'},
    topRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm},
    badges: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap'},
    code: {fontWeight: '700', letterSpacing: 0.5},
    titleRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    metaRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
    pillsRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap', marginTop: 2},
    flex: {flex: 1},
});
