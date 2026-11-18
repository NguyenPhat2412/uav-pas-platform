import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {
    CheckCircle2,
    ClipboardList,
    Megaphone,
    Plane,
    ShieldCheck,
    XCircle,
} from 'lucide-react-native';
import {ProviderOrderAssignBox} from '@/components/marketplace/provider/ProviderOrderAssignBox';
import {ProviderRfqBiddingList} from '@/components/marketplace/provider/ProviderRfqBiddingList';
import {MissionStatusBadge} from '@/components/mission/MissionBits';
import {
    AppText,
    Badge,
    Button,
    Card,
    EmptyState,
    ErrorState,
    LoadingState,
    Screen,
    TextField,
} from '@/components/ui';
import {GlassSelectCards, GlassSelectField, type GlassOption} from '@/components/ui/GlassSelect';
import {
    useMyProviderBids,
    useMyProviderFleet,
    useMyProviderPilots,
    useOpenRfqs,
    useProviderOrders,
    useProviderStudioMutations,
} from '@/hooks/marketplace/useProviderStudio';
import {useSiteInfo} from '@/hooks/settings/useSiteInfo';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {
    extractActionableError,
    formatVndCompact,
    providerOrderStatusLabel,
} from '@/shared/forms/marketplace/marketplace-forms';
import {colors, radius, spacing} from '@/styles/tokens';

type OrderTab = 'ORDERS' | 'RFQ';

export function ProviderOrdersScreen() {
    const {t, formatDate} = useI18n();
    const toast = useToast();
    const {requireEscrowBeforeStart} = useSiteInfo();
    const ordersQuery = useProviderOrders();
    const rfqsQuery = useOpenRfqs();
    const bidsQuery = useMyProviderBids();
    const fleetQuery = useMyProviderFleet();
    const pilotsQuery = useMyProviderPilots();
    const mutations = useProviderStudioMutations();

    const [tab, setTab] = useState<OrderTab>('ORDERS');
    const [uavChoice, setUavChoice] = useState<Record<number, string>>({});
    const [notes, setNotes] = useState<Record<number, string>>({});

    const orders = ordersQuery.data ?? [];
    const rfqs = rfqsQuery.data ?? [];
    const myBids = bidsQuery.data ?? [];
    const uavs = fleetQuery.data?.uavs ?? [];
    const pilots = pilotsQuery.data ?? [];

    const tabOptions: GlassOption<OrderTab>[] = [
        {
            value: 'ORDERS',
            label: t('mobile.provider.tabDirectOrders'),
            badge: `${orders.length}`,
            icon: ClipboardList,
        },
        {
            value: 'RFQ',
            label: t('mobile.provider.tabOpenRfq'),
            badge: `${rfqs.length}`,
            icon: Megaphone,
        },
    ];

    const uavOptions: GlassOption<string>[] = [
        {value: '', label: t('mobile.provider.autoUavOption'), icon: Plane},
        ...uavs.map(u => ({
            value: String(u.id),
            label: u.model,
            description: `SN: ${u.serialNumber}`,
            icon: Plane,
        })),
    ];

    const showErr = (err: unknown) =>
        toast.show(extractActionableError(err, t('mobile.provider.saveError')), 'error');

    const handleRefresh = () => {
        void ordersQuery.refetch();
        void rfqsQuery.refetch();
        void bidsQuery.refetch();
        void pilotsQuery.refetch();
    };

    return (
        <Screen
            onRefresh={handleRefresh}
            refreshing={ordersQuery.isRefetching || rfqsQuery.isRefetching}>
            <GlassSelectCards<OrderTab>
                columns={2}
                value={tab}
                options={tabOptions}
                onChange={setTab}
            />

            {requireEscrowBeforeStart ? (
                <View style={styles.escrowHint}>
                    <ShieldCheck size={15} color={colors.primary}/>
                    <AppText variant="caption" style={styles.flex}>
                        {t('mobile.provider.escrowBeforeStartNotice')}
                    </AppText>
                </View>
            ) : null}

            {tab === 'ORDERS' ? (
                ordersQuery.isPending ? (
                    <LoadingState/>
                ) : ordersQuery.isError ? (
                    <ErrorState
                        message={t('missions.loadError')}
                        retryLabel={t('common.retry')}
                        onRetry={() => void ordersQuery.refetch()}
                    />
                ) : orders.length === 0 ? (
                    <EmptyState icon={ClipboardList} message={t('mobile.provider.noOrders')}/>
                ) : (
                    orders.map(order => {
                        const chosenUav = uavChoice[order.id] ?? '';
                        const note = notes[order.id] ?? '';
                        const pending = order.providerResponseStatus === 'PENDING_PROVIDER';
                        const canStart =
                            order.providerResponseStatus === 'ACCEPTED' &&
                            (order.status === 'ACCEPTED' ||
                                order.status === 'SCHEDULED' ||
                                order.status === 'CONFIRMED' ||
                                order.status === 'RESOURCE_RESERVED' ||
                                order.status === 'READY');
                        const inProgress =
                            order.status === 'IN_PROGRESS' || order.status === 'IN_FLIGHT';

                        return (
                            <Card key={order.id}>
                                <View style={styles.rowBetween}>
                                    <AppText variant="caption" style={styles.bold}>
                                        {order.code}
                                    </AppText>
                                    <MissionStatusBadge status={order.status}/>
                                </View>
                                <AppText variant="title" numberOfLines={2}>
                                    {order.title}
                                </AppText>
                                <AppText variant="caption" numberOfLines={1}>
                                    {order.locationName} ·{' '}
                                    {formatDate(order.startTime, {dateStyle: 'medium', timeStyle: 'short'})}
                                </AppText>
                                <View style={styles.rowBetween}>
                                    <Badge
                                        label={providerOrderStatusLabel(order.providerResponseStatus)}
                                        background={colors.primaryLight}
                                        color={colors.primary}
                                    />
                                    {order.quotedSubtotalVnd != null ? (
                                        <View style={styles.priceInline}>
                                            <AppText variant="title" style={styles.price} numberOfLines={1}>
                                                {formatVndCompact(order.quotedSubtotalVnd)}
                                            </AppText>
                                            <AppText variant="caption" numberOfLines={1}>
                                                {t('mobile.shop.illustrativePrice')}
                                            </AppText>
                                        </View>
                                    ) : null}
                                </View>

                                {pending ? (
                                    <View style={styles.actionStack}>
                                        <GlassSelectField<string>
                                            label={t('mobile.provider.assignUavLabel')} optional
                                            sheetTitle={t('mobile.provider.assignUavLabel')}
                                            value={chosenUav}
                                            options={uavOptions}
                                            onChange={val => setUavChoice(prev => ({...prev, [order.id]: val}))}
                                        />
                                        <TextField
                                            label={t('missionForm.notes')} optional
                                            placeholder={t('mobile.provider.orderNotePlaceholder')}
                                            value={note}
                                            onChangeText={val => setNotes(prev => ({...prev, [order.id]: val}))}
                                        />
                                        <View style={styles.row}>
                                            <Button
                                                size="sm"
                                                icon={CheckCircle2}
                                                style={styles.flex}
                                                loading={mutations.respondToOrder.isPending}
                                                label={t('mobile.provider.acceptOrderBtn')}
                                                onPress={() =>
                                                    mutations.respondToOrder.mutate(
                                                        {
                                                            missionId: order.id,
                                                            payload: {
                                                                accept: true,
                                                                uavId: chosenUav ? Number(chosenUav) : undefined,
                                                                responseNote: note.trim() || undefined,
                                                            },
                                                        },
                                                        {
                                                            onSuccess: () =>
                                                                toast.show(t('mobile.provider.orderAcceptedToast'), 'success'),
                                                            onError: showErr,
                                                        },
                                                    )
                                                }
                                            />
                                            <Button
                                                size="sm"
                                                tone="danger"
                                                icon={XCircle}
                                                style={styles.flex}
                                                label={t('mobile.provider.declineOrderBtn')}
                                                onPress={() =>
                                                    mutations.respondToOrder.mutate(
                                                        {
                                                            missionId: order.id,
                                                            payload: {accept: false, responseNote: note.trim() || undefined},
                                                        },
                                                        {onError: showErr},
                                                    )
                                                }
                                            />
                                        </View>
                                    </View>
                                ) : canStart ? (
                                    <ProviderOrderAssignBox
                                        uavs={uavs}
                                        pilots={pilots}
                                        assigning={mutations.assignOrder.isPending}
                                        starting={mutations.startOrder.isPending}
                                        onAssign={({pilotId, uavId}) =>
                                            mutations.assignOrder.mutate(
                                                {missionId: order.id, payload: {pilotId, uavId}},
                                                {
                                                    onSuccess: () =>
                                                        toast.show(t('mobile.overnight.orderAssignedToast'), 'success'),
                                                    onError: showErr,
                                                },
                                            )
                                        }
                                        onStart={() =>
                                            mutations.startOrder.mutate(order.id, {
                                                onSuccess: () => toast.show(t('mobile.provider.flightStartedToast'), 'success'),
                                                onError: showErr,
                                            })
                                        }
                                    />
                                ) : inProgress ? (
                                    <View style={styles.actionStack}>
                                        <TextField
                                            label={t('mobile.provider.completionNoteLabel')} required
                                            value={note}
                                            onChangeText={val => setNotes(prev => ({...prev, [order.id]: val}))}
                                        />
                                        <Button
                                            size="sm"
                                            icon={CheckCircle2}
                                            loading={mutations.completeOrder.isPending}
                                            label={t('mobile.provider.completeOrderBtn')}
                                            onPress={() =>
                                                mutations.completeOrder.mutate(
                                                    {
                                                        missionId: order.id,
                                                        payload: {
                                                            completionNote:
                                                                note.trim() || t('mobile.provider.defaultCompletionNote'),
                                                        },
                                                    },
                                                    {
                                                        onSuccess: () =>
                                                            toast.show(t('mobile.provider.orderCompletedToast'), 'success'),
                                                        onError: showErr,
                                                    },
                                                )
                                            }
                                        />
                                    </View>
                                ) : null}
                            </Card>
                        );
                    })
                )
            ) : (
                <ProviderRfqBiddingList
                    rfqs={rfqs}
                    myBids={myBids}
                    isPending={rfqsQuery.isPending}
                    submitting={mutations.submitBid.isPending}
                    onSubmitBid={(missionId, payload, onDone) =>
                        mutations.submitBid.mutate(
                            {missionId, payload},
                            {
                                onSuccess: () => {
                                    onDone();
                                    toast.show(t('mobile.provider.bidSentToast'), 'success');
                                },
                                onError: showErr,
                            },
                        )
                    }
                />
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    escrowHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.primaryLight,
        borderRadius: radius.control,
        padding: spacing.sm,
    },
    row: {flexDirection: 'row', gap: spacing.xs},
    rowBetween: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm},
    priceInline: {flexDirection: 'row', alignItems: 'baseline', gap: 4},
    actionStack: {gap: spacing.xs, paddingTop: spacing.xs},
    bold: {fontWeight: '700', color: colors.text},
    price: {color: colors.primary, fontWeight: '700'},
    flex: {flex: 1},
});
