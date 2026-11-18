import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, FlatList, RefreshControl, StyleSheet, View} from 'react-native';
import {Stack, useLocalSearchParams, useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ClipboardList, Plane, Plus} from 'lucide-react-native';
import {GuestPromptCard} from '@/components/auth/GuestPromptCard';
import {AppBackground} from '@/components/layout/AppBackground';
import {HeaderIconButton} from '@/components/layout/AppHeader';
import {MissionRow} from '@/components/mission/MissionBits';
import {Button, ChipGroup, CONTENT_WIDTH, EmptyState, ErrorState, LoadingState, Screen} from '@/components/ui';
import {useMissionList} from '@/hooks/mission/useCustomerMissions';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {MISSION_FILTERS, type MissionFilter} from '@/utils/mission/status';
import {colors, spacing} from '@/styles/tokens';

const FILTERS = Object.keys(MISSION_FILTERS) as MissionFilter[];

export function MissionListScreen() {
    const {t} = useI18n();
    const {status, can} = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ filter?: string }>();
    const requested = FILTERS.includes(params.filter as MissionFilter) ? (params.filter as MissionFilter) : 'all';
    const [chosen, setChosen] = useState<{ from: string | undefined; filter: MissionFilter }>({from: params.filter, filter: requested});
    const [refreshing, setRefreshing] = useState(false);
    const filter = chosen.from === params.filter ? chosen.filter : requested;
    const statuses = MISSION_FILTERS[filter];
    const list = useMissionList(statuses.length === 1 ? statuses[0] : undefined);
    const missions = useMemo(() => {
        const all = list.data?.pages.flatMap(page => page.content) ?? [];
        return statuses.length > 1 ? all.filter(mission => (statuses as readonly string[]).includes(mission.status)) : all;
    }, [list.data, statuses]);

    const {hasNextPage, isFetchingNextPage, fetchNextPage} = list;
    useEffect(() => {
        if (status === 'signed-in' && statuses.length > 1 && missions.length < 10 && hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
        }
    }, [status, statuses.length, missions.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

    if (status !== 'signed-in') {
        return (
            <Screen>
                <GuestPromptCard
                    icon={Plane}
                    title={t('mobile.shop.guestOrdersTitle')}
                    description={t('mobile.shop.guestOrdersDesc')}
                />
            </Screen>
        );
    }

    const options = FILTERS.map(value => ({value, label: t(`mobile.missions.filters.${value}`)}));
    const filters = <ChipGroup options={options} value={filter} onChange={value => setChosen({from: params.filter, filter: value})}/>;

    return (
        <View style={styles.screen}>
            <AppBackground/>
            <Stack.Screen
                options={{
                    headerRight: can('MISSION_CREATE')
                        ? () => <HeaderIconButton icon={Plus} label={t('missions.create')} onPress={() => router.push('/customer/mission/create')}/>
                        : undefined,
                }}
            />
            {list.isPending || list.isError ? (
                <View style={styles.centerState}>
                    {list.isPending ? (
                        <LoadingState label={t('missions.loading')}/>
                    ) : (
                        <ErrorState message={t('missions.loadError')} retryLabel={t('common.retry')} onRetry={() => void list.refetch()}/>
                    )}
                </View>
            ) : (
                <FlatList
                    data={missions}
                    keyExtractor={mission => String(mission.id)}
                    contentInsetAdjustmentBehavior="never"
                    directionalLockEnabled
                    alwaysBounceHorizontal={false}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[styles.list, {paddingBottom: insets.bottom + 116}]}
                    ListHeaderComponent={filters}
                    renderItem={({item}) => (
                        <MissionRow
                            mission={item}
                            onPress={() => router.push({pathname: '/customer/mission/[id]', params: {id: String(item.id)}})}
                        />
                    )}
                    onEndReachedThreshold={0.4}
                    onEndReached={() => {
                        if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
                    }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                void list.refetch().finally(() => setRefreshing(false));
                            }}
                            tintColor={colors.primary}
                        />
                    }
                    ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={styles.more}/> : undefined}
                    ListEmptyComponent={
                        <EmptyState
                            icon={ClipboardList}
                            message={filter === 'all' ? t('missions.empty') : t('missions.emptyFiltered')}
                            action={
                                filter === 'all' && can('MISSION_CREATE') ? (
                                    <Button label={t('missions.create')} icon={Plus} onPress={() => router.push('/customer/mission/create')}/>
                                ) : undefined
                            }
                        />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: colors.canvas, overflow: 'hidden'},
    centerState: {flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg},
    list: {padding: spacing.lg, gap: spacing.md, flexGrow: 1, width: '100%', maxWidth: CONTENT_WIDTH, alignSelf: 'center'},
    more: {marginVertical: spacing.lg},
});
