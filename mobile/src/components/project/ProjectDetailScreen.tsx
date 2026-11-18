import React, {useMemo} from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import {Stack, useLocalSearchParams, useRouter} from 'expo-router';
import {
    CalendarClock,
    Compass,
    Edit3,
    FolderKanban,
    Layers,
    MapPin,
    Pause,
    Play,
    Plus,
    Trash2,
    XCircle,
} from 'lucide-react-native';
import {HeaderIconButton} from '@/components/layout/AppHeader';
import {MissionRow} from '@/components/mission/MissionBits';
import {
    AppText,
    Badge,
    Button,
    Card,
    EmptyState,
    ErrorState,
    LoadingState,
    Screen,
    SectionTitle,
} from '@/components/ui';
import {useMissionList} from '@/hooks/mission/useCustomerMissions';
import {
    useProjectDetail,
    useProjectMutations,
    useProjectSubscriptions,
} from '@/hooks/project/useProjects';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {extractActionableError, formatVndCompact} from '@/shared/forms/marketplace/marketplace-forms';
import type {ProjectScheduleType, ProjectSubscriptionStatus} from '@/shared/types/project/project.types';
import {colors, spacing} from '@/styles/tokens';

function scheduleLabel(type: ProjectScheduleType, t: (key: string) => string): string {
    if (type === 'WEEKLY') return t('mobile.overnight.scheduleWeekly');
    if (type === 'MONTHLY') return t('mobile.overnight.scheduleMonthly');
    return t('mobile.overnight.scheduleOnce');
}

function statusBadgeTone(status: ProjectSubscriptionStatus, t: (key: string) => string) {
    if (status === 'PAUSED') {
        return {label: t('mobile.overnight.subPaused'), bg: colors.warningLight, fg: colors.warning};
    }
    if (status === 'ENDED') {
        return {label: t('mobile.overnight.subEnded'), bg: colors.slateLight, fg: colors.slateDark};
    }
    return {label: t('mobile.overnight.subActive'), bg: colors.primaryLight, fg: colors.primary};
}

/**
 * Project Detail Screen (`GET /api/v1/projects/{id}` + `/subscriptions` + orders, S1-mobile.md #3).
 */
export function ProjectDetailScreen() {
    const {t, formatDate} = useI18n();
    const toast = useToast();
    const router = useRouter();
    const {id} = useLocalSearchParams<{ id: string }>();
    const projectId = Number(id);

    const detail = useProjectDetail(projectId);
    const subsQuery = useProjectSubscriptions(projectId);
    const ordersQuery = useMissionList(undefined, '', {projectId});
    const mutations = useProjectMutations();

    const orders = useMemo(() => {
        const all = ordersQuery.data?.pages.flatMap(page => page.content) ?? [];
        return all.filter(m => m.projectId == null || m.projectId === projectId);
    }, [ordersQuery.data, projectId]);

    const handleRefresh = () => {
        void detail.refetch();
        void subsQuery.refetch();
        void ordersQuery.refetch();
    };

    const confirmDelete = () => {
        Alert.alert(t('mobile.overnight.deleteProjectAction'), t('mobile.overnight.deleteProjectConfirm'), [
            {text: t('common.cancel'), style: 'cancel'},
            {
                text: t('mobile.overnight.deleteProjectAction'),
                style: 'destructive',
                onPress: () => {
                    mutations.deleteProject.mutate(projectId, {
                        onSuccess: () => {
                            toast.show(t('mobile.overnight.projectDeletedToast'), 'info');
                            router.back();
                        },
                        onError: err =>
                            toast.show(extractActionableError(err, t('mobile.provider.saveError')), 'error'),
                    });
                },
            },
        ]);
    };

    if (detail.isPending) {
        return (
            <Screen>
                <LoadingState label={t('mobile.overnight.projectsLoading')}/>
            </Screen>
        );
    }

    if (detail.isError || !detail.data) {
        return (
            <Screen>
                <ErrorState
                    message={t('mobile.overnight.projectDetailLoadError')}
                    retryLabel={t('common.retry')}
                    onRetry={() => void detail.refetch()}
                />
            </Screen>
        );
    }

    const project = detail.data;
    const subs = subsQuery.data ?? [];

    return (
        <Screen
            onRefresh={handleRefresh}
            refreshing={detail.isRefetching || subsQuery.isRefetching}>
            <Stack.Screen
                options={{
                    title: project.name,
                    headerRight: () => (
                        <HeaderIconButton
                            icon={Edit3}
                            label={t('mobile.overnight.editProjectAction')}
                            onPress={() =>
                                router.push({
                                    pathname: '/customer/projects/[id]/edit',
                                    params: {id: String(project.id)},
                                })
                            }
                        />
                    ),
                }}
            />

            <Card>
                <View style={styles.topRow}>
                    <FolderKanban size={22} color={colors.primary}/>
                    <View style={styles.flex}>
                        <AppText variant="heading" numberOfLines={2}>
                            {project.name}
                        </AppText>
                        <View style={styles.metaRow}>
                            <MapPin size={14} color={colors.slate}/>
                            <AppText variant="caption" numberOfLines={1}>
                                {project.province}
                            </AppText>
                        </View>
                    </View>
                </View>
                {project.note ? <AppText variant="small">{project.note}</AppText> : null}
                <View style={styles.actionRow}>
                    <Button
                        size="sm"
                        icon={Plus}
                        label={t('mobile.overnight.subscribeForProjectBtn')}
                        onPress={() => router.navigate('/customer/services')}
                        style={styles.flex}
                    />
                    <Button
                        size="sm"
                        tone="danger"
                        icon={Trash2}
                        loading={mutations.deleteProject.isPending}
                        label={t('mobile.overnight.deleteProjectAction')}
                        onPress={confirmDelete}
                    />
                </View>
            </Card>

            <SectionTitle title={t('mobile.overnight.subscriptionsTitle')}/>
            {subsQuery.isPending ? (
                <LoadingState/>
            ) : subsQuery.isError ? (
                <ErrorState
                    message={t('services.loadError')}
                    retryLabel={t('common.retry')}
                    onRetry={() => void subsQuery.refetch()}
                />
            ) : subs.length === 0 ? (
                <EmptyState
                    icon={Layers}
                    message={t('mobile.overnight.subscriptionsEmpty')}
                    action={
                        <Button
                            size="sm"
                            icon={Compass}
                            label={t('mobile.overnight.orderExploreCta')}
                            onPress={() => router.navigate('/customer/services')}
                        />
                    }
                />
            ) : (
                subs.map(sub => {
                    const tone = statusBadgeTone(sub.status, t);
                    const isPaused = sub.status === 'PAUSED';
                    return (
                        <Card key={sub.id}>
                            <View style={styles.rowBetween}>
                                <Badge label={scheduleLabel(sub.scheduleType, t)} background={colors.slateLight} color={colors.slateDark}/>
                                <Badge label={tone.label} background={tone.bg} color={tone.fg}/>
                            </View>
                            <AppText variant="title" numberOfLines={2}>
                                {sub.listingTitle || `#${sub.listingId}`}
                            </AppText>
                            <View style={styles.metaRow}>
                                <CalendarClock size={13} color={colors.slate}/>
                                <AppText variant="caption" numberOfLines={1}>
                                    {formatDate(sub.startDate, {dateStyle: 'medium'})}
                                </AppText>
                            </View>
                            {sub.estimatedTotalVnd != null ? (
                                <View style={styles.priceRow}>
                                    <AppText variant="title" style={styles.price} numberOfLines={1}>
                                        {formatVndCompact(sub.estimatedTotalVnd)}
                                    </AppText>
                                    <AppText variant="caption" numberOfLines={1}>
                                        {t('mobile.shop.illustrativePrice')}
                                    </AppText>
                                </View>
                            ) : null}
                            {sub.status !== 'ENDED' ? (
                                <View style={styles.actionRow}>
                                    <Button
                                        size="sm"
                                        tone="secondary"
                                        icon={isPaused ? Play : Pause}
                                        label={
                                            isPaused
                                                ? t('mobile.overnight.resumeSubBtn')
                                                : t('mobile.overnight.pauseSubBtn')
                                        }
                                        onPress={() =>
                                            mutations.updateSubscription.mutate(
                                                {
                                                    projectId,
                                                    subId: sub.id,
                                                    payload: {status: isPaused ? 'ACTIVE' : 'PAUSED'},
                                                },
                                                {
                                                    onSuccess: () =>
                                                        toast.show(t('mobile.overnight.subUpdatedToast'), 'success'),
                                                    onError: err =>
                                                        toast.show(
                                                            extractActionableError(err, t('mobile.provider.saveError')),
                                                            'error',
                                                        ),
                                                },
                                            )
                                        }
                                        style={styles.flex}
                                    />
                                    <Button
                                        size="sm"
                                        tone="ghost"
                                        icon={XCircle}
                                        label={t('mobile.overnight.cancelSubBtn')}
                                        onPress={() =>
                                            mutations.cancelSubscription.mutate(
                                                {projectId, subId: sub.id},
                                                {
                                                    onSuccess: () =>
                                                        toast.show(t('mobile.overnight.subCancelledToast'), 'info'),
                                                    onError: err =>
                                                        toast.show(
                                                            extractActionableError(err, t('mobile.provider.saveError')),
                                                            'error',
                                                        ),
                                                },
                                            )
                                        }
                                    />
                                </View>
                            ) : null}
                        </Card>
                    );
                })
            )}

            <SectionTitle title={t('mobile.overnight.navOrders')}/>
            {ordersQuery.isPending ? (
                <LoadingState/>
            ) : orders.length === 0 ? (
                <EmptyState
                    icon={Compass}
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
            ) : (
                orders.map(order => (
                    <MissionRow
                        key={order.id}
                        mission={order}
                        onPress={() =>
                            router.push({
                                pathname: '/customer/mission/[id]',
                                params: {id: String(order.id)},
                            })
                        }
                    />
                ))
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    topRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    metaRow: {flexDirection: 'row', alignItems: 'center', gap: 4},
    rowBetween: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs},
    priceRow: {flexDirection: 'row', alignItems: 'baseline', gap: 6},
    price: {color: colors.primary, fontWeight: '700'},
    actionRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs},
    flex: {flex: 1},
});
