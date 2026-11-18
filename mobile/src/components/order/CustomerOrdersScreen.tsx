import React, {useMemo, useState} from 'react';
import {ActivityIndicator, FlatList, RefreshControl, StyleSheet, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Compass, PackageCheck} from 'lucide-react-native';
import {AppBackground} from '@/components/layout/AppBackground';
import {MissionRow} from '@/components/mission/MissionBits';
import {OfflineBanner} from '@/components/shared/OfflineBanner';
import {
    Button,
    ChipGroup,
    CONTENT_WIDTH,
    EmptyState,
    ErrorState,
    LoadingState,
} from '@/components/ui';
import {useMissionList} from '@/hooks/mission/useCustomerMissions';
import {useI18n} from '@/providers/I18nContext';
import type {OrderStatusGroup} from '@/shared/types/project/project.types';
import {matchesOrderStatusGroup, ORDER_STATUS_GROUPS} from '@/utils/mission/order-groups';
import {colors, spacing} from '@/styles/tokens';

type GroupFilter = OrderStatusGroup | 'ALL';

/**
 * Shopee-style Filtered Customer Orders Screen opened from the 5-icon Order Status Bar on Home
 * or from Project details (`?group=PENDING|SCHEDULED|IN_FLIGHT|DELIVERED|TO_REVIEW&projectId=`).
 */
export function CustomerOrdersScreen() {
    const {t} = useI18n();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ group?: string; projectId?: string }>();
    const requestedGroup: GroupFilter = ORDER_STATUS_GROUPS.includes(params.group as OrderStatusGroup)
        ? (params.group as OrderStatusGroup)
        : 'ALL';
    const [chosen, setChosen] = useState<{ from: string | undefined; value: GroupFilter }>({
        from: params.group,
        value: requestedGroup,
    });
    const [refreshing, setRefreshing] = useState(false);

    const group = chosen.from === params.group ? chosen.value : requestedGroup;
    const parsedProjectId = params.projectId ? Number(params.projectId) : undefined;
    const projectId =
        parsedProjectId && Number.isSafeInteger(parsedProjectId) && parsedProjectId > 0
            ? parsedProjectId
            : undefined;

    const list = useMissionList(undefined, '', {
        projectId,
        statusGroup: group === 'ALL' ? undefined : group,
    });

    const orders = useMemo(() => {
        const all = list.data?.pages.flatMap(page => page.content) ?? [];
        return all.filter(item => {
            if (projectId != null && item.projectId != null && item.projectId !== projectId) {
                return false;
            }
            return matchesOrderStatusGroup(item, group);
        });
    }, [group, list.data, projectId]);

    const chipOptions: { value: GroupFilter; label: string }[] = [
        {value: 'ALL', label: t('mobile.overnight.orderAll')},
        {value: 'PENDING', label: t('mobile.overnight.orderPending')},
        {value: 'SCHEDULED', label: t('mobile.overnight.orderScheduled')},
        {value: 'IN_FLIGHT', label: t('mobile.overnight.orderInFlight')},
        {value: 'DELIVERED', label: t('mobile.overnight.orderDelivered')},
        {value: 'TO_REVIEW', label: t('mobile.overnight.orderToReview')},
    ];

    return (
        <View style={styles.screen}>
            <AppBackground/>
            {list.isPending && !list.data ? (
                <View style={styles.centerState}>
                    <LoadingState label={t('missions.loading')}/>
                </View>
            ) : list.isError && orders.length === 0 ? (
                <View style={styles.centerState}>
                    <ErrorState
                        message={t('missions.loadError')}
                        retryLabel={t('common.retry')}
                        onRetry={() => void list.refetch()}
                    />
                </View>
            ) : (
                <FlatList
                    data={orders}
                    keyExtractor={item => String(item.id)}
                    contentInsetAdjustmentBehavior="never"
                    directionalLockEnabled
                    alwaysBounceHorizontal={false}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[styles.list, {paddingBottom: insets.bottom + spacing.xl}]}
                    ListHeaderComponent={
                        <View style={styles.headerStack}>
                            <OfflineBanner/>
                            <ChipGroup
                                options={chipOptions}
                                value={group}
                                onChange={value => setChosen({from: params.group, value})}
                            />
                        </View>
                    }
                    renderItem={({item}) => (
                        <MissionRow
                            mission={item}
                            onPress={() =>
                                router.push({
                                    pathname: '/customer/mission/[id]',
                                    params: {id: String(item.id)},
                                })
                            }
                        />
                    )}
                    onEndReachedThreshold={0.4}
                    onEndReached={() => {
                        if (list.hasNextPage && !list.isFetchingNextPage) {
                            void list.fetchNextPage();
                        }
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
                    ListFooterComponent={
                        list.isFetchingNextPage ? (
                            <ActivityIndicator color={colors.primary} style={styles.more}/>
                        ) : undefined
                    }
                    ListEmptyComponent={
                        <EmptyState
                            icon={PackageCheck}
                            message={t('mobile.overnight.orderEmpty')}
                            action={
                                <Button
                                    size="sm"
                                    icon={Compass}
                                    label={t('mobile.overnight.orderExploreCta')}
                                    onPress={() => router.navigate('/customer/services')}
                                />
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
    list: {
        padding: spacing.lg,
        gap: spacing.md,
        flexGrow: 1,
        width: '100%',
        maxWidth: CONTENT_WIDTH,
        alignSelf: 'center',
    },
    more: {marginVertical: spacing.lg},
    headerStack: {gap: spacing.sm},
});
