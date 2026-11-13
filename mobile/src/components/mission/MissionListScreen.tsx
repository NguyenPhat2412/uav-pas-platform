import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View} from 'react-native';
import {Stack, useLocalSearchParams, useRouter} from 'expo-router';
import {ClipboardList, Plus} from 'lucide-react-native';
import {Button, ChipGroup, CONTENT_WIDTH, EmptyState, ErrorState, LoadingState} from '@/components/ui';
import {MissionRow} from '@/components/mission/MissionBits';
import {useMissionList} from '@/hooks/mission/useCustomerMissions';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {MISSION_FILTERS, type MissionFilter} from '@/utils/mission/status';
import {AppBackground} from '@/components/layout/AppBackground';
import {colors, spacing} from '@/styles/tokens';

const FILTERS = Object.keys(MISSION_FILTERS) as MissionFilter[];

export function MissionListScreen() {
    const {t} = useI18n();
    const {can} = useAuth();
    const router = useRouter();
    const params = useLocalSearchParams<{ filter?: string }>();
    const requested = FILTERS.includes(params.filter as MissionFilter) ? params.filter as MissionFilter : 'all';
    const [chosen, setChosen] = useState<{ from: string | undefined; filter: MissionFilter }>({from: params.filter, filter: requested});
    const [refreshing, setRefreshing] = useState(false);
    // A tile on the home screen may open this tab with a new filter; it wins over the last chip tapped.
    const filter = chosen.from === params.filter ? chosen.filter : requested;
    const statuses = MISSION_FILTERS[filter];
    // The API filters one status at a time; groups with several statuses filter the loaded pages here.
    const list = useMissionList(statuses.length === 1 ? statuses[0] : undefined);
    const missions = useMemo(() => {
        const all = list.data?.pages.flatMap(page => page.content) ?? [];
        return statuses.length > 1 ? all.filter(mission => (statuses as readonly string[]).includes(mission.status)) : all;
    }, [list.data, statuses]);

    // A grouped filter may match nothing on the pages loaded so far: keep loading until it fills a screen.
    const {hasNextPage, isFetchingNextPage, fetchNextPage} = list;
    useEffect(() => {
        if (statuses.length > 1 && missions.length < 10 && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    }, [statuses.length, missions.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const options = FILTERS.map(value => ({value, label: t(`mobile.missions.filters.${value}`)}));

    const filters = <ChipGroup options={options} value={filter} onChange={value => setChosen({from: params.filter, filter: value})}/>;

    return (
        <View style={styles.screen}>
            <AppBackground/>
            <Stack.Screen options={{
                headerRight: can('MISSION_CREATE') ? () => (
                    <Pressable onPress={() => router.push('/customer/mission/create')} accessibilityRole="button" accessibilityLabel={t('missions.create')}
                               hitSlop={8} style={({pressed}) => [styles.add, pressed && styles.pressed]}>
                        <Plus size={22} color={colors.primary}/>
                    </Pressable>
                ) : undefined,
            }}/>
            {list.isPending || list.isError ? (
                <View style={styles.centerState}>
                    {list.isPending ? <LoadingState label={t('missions.loading')}/>
                        : <ErrorState message={t('missions.loadError')} retryLabel={t('common.retry')} onRetry={() => void list.refetch()}/>}
                </View>
            ) : (
                <FlatList
                    data={missions}
                    keyExtractor={mission => String(mission.id)}
                    contentInsetAdjustmentBehavior="automatic"
                    contentContainerStyle={styles.list}
                    ListHeaderComponent={filters}
                    renderItem={({item}) => <MissionRow mission={item} onPress={() => router.push({pathname: '/customer/mission/[id]', params: {id: String(item.id)}})}/>}
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
                        <EmptyState icon={ClipboardList} message={filter === 'all' ? t('missions.empty') : t('missions.emptyFiltered')}
                                    action={filter === 'all' && can('MISSION_CREATE')
                                        ? <Button label={t('missions.create')} icon={Plus} onPress={() => router.push('/customer/mission/create')}/>
                                        : undefined}/>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: colors.canvas},
    add: {width: 32, height: 32, alignItems: 'center', justifyContent: 'center'},
    pressed: {opacity: 0.6},
    centerState: {flex: 1, justifyContent: 'center'},
    // Same centred column as Screen, so lists line up with the other pages on wide screens.
    list: {padding: spacing.lg, gap: spacing.md, flexGrow: 1, width: '100%', maxWidth: CONTENT_WIDTH, alignSelf: 'center'},
    more: {marginVertical: spacing.lg},
});
