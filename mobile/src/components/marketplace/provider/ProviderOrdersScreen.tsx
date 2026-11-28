import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {
    CheckCircle2,
    ClipboardList,
    Layers,
    Plane,
    ShieldCheck,
    XCircle,
} from 'lucide-react-native';
import {ProviderOrderAssignBox} from '@/components/marketplace/provider/ProviderOrderAssignBox';
import {MissionStatusBadge} from '@/components/mission/MissionBits';
import {
    IllustrativeBadge,
    IllustrativeFooterNote,
} from '@/components/shared/IllustrativeDisclaimer';
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
import {GlassSelectField, type GlassOption} from '@/components/ui/GlassSelect';
import {
    useMyProviderFleet,
    useMyProviderPilots,
    useProviderOrders,
    useProviderStudioMutations,
} from '@/hooks/useProviderStudio';
import {useSiteInfo} from '@/hooks/useSiteInfo';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {
    formatVndCompact,
    providerOrderStatusLabel,
} from '@/shared/forms/marketplace-forms';
import {
    cleanEntityName,
    formatProviderConflictError,
    isHttpConflict,
} from '@/utils/clean-text';
import {colors, radius, spacing} from '@/styles/tokens';

/**
 * Partner Studio Assigned Orders Screen (`GET /api/v1/marketplace/provider/orders`):
 * - Hides RFQ tab per UI-REVIEW-9-FIXES #5 while preserving underlying API modules
 * - Strips legacy "— minh hoạ" from titles/models (UI-REVIEW-9-FIXES #1)
 * - Surfaces S0's HTTP 409 conflict codes (`UAV_TIME_CONFLICT`, `OPERATOR_TIME_CONFLICT`,
 *   `UAV_IN_USE`, `NO_UAV_AVAILABLE`) cleanly and self-heals via refetch
 */
export function ProviderOrdersScreen() {
    const {t, formatDate} = useI18n();
    const toast = useToast();
    const router = useRouter();
    const {requireEscrowBeforeStart} = useSiteInfo();
    const ordersQuery = useProviderOrders();
    const fleetQuery = useMyProviderFleet();
    const pilotsQuery = useMyProviderPilots();
    const mutations = useProviderStudioMutations();

    const [uavChoice, setUavChoice] = useState<Record<number, string>>({});
    const [notes, setNotes] = useState<Record<number, string>>({});

    const orders = ordersQuery.data ?? [];
    const uavs = fleetQuery.data?.uavs ?? [];
    const pilots = pilotsQuery.data ?? [];

    const uavOptions: GlassOption<string>[] = [
        {value: '', label: t('mobile.provider.autoUavOption'), icon: Plane},
        ...uavs.map(u => ({
            value: String(u.id),
            label: u.serialNumber,
            description: cleanEntityName(u.model),
            icon: Plane,
        })),
    ];

    const handleRefresh = () => {
        void ordersQuery.refetch();
        void fleetQuery.refetch();
        void pilotsQuery.refetch();
    };

    const showErr = (err: unknown) => {
        toast.show(formatProviderConflictError(err, t), 'error');
        if (isHttpConflict(err)) {
            handleRefresh();
        }
    };

    return (
        <Screen
            onRefresh={handleRefresh}
            refreshing={ordersQuery.isRefetching}>
            {requireEscrowBeforeStart ? (
                <View style={styles.escrowHint}>
                    <ShieldCheck size={15} color={colors.primary}/>
                    <AppText variant="caption" style={styles.flex}>
                        {t('mobile.provider.escrowBeforeStartNotice')}
                    </AppText>
                </View>
            ) : null}

            {ordersQuery.isPending && !orders.length ? (
                <LoadingState/>
            ) : ordersQuery.isError && !orders.length ? (
                <ErrorState
                    message={t('missions.loadError')}
                    retryLabel={t('common.retry')}
                    onRetry={() => void ordersQuery.refetch()}
                />
            ) : orders.length === 0 ? (
                <EmptyState
                    icon={ClipboardList}
                    message={t('mobile.provider.noOrders')}
                    action={
                        <Button
                            size="sm"
                            icon={Layers}
                            label={t('mobile.provider.menuListings')}
                            onPress={() => router.push('/customer/provider/listings')}
                        />
                    }
                />
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
                                {cleanEntityName(order.title)}
                            </AppText>
                            <AppText variant="caption" numberOfLines={1}>
                                {cleanEntityName(order.locationName)} ·{' '}
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
                                        <IllustrativeBadge/>
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
                                        showTriggerDescription
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
                                    currentUavId={order.uavId}
                                    currentPilotUserId={order.operatorId}
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
            )}
            <IllustrativeFooterNote/>
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
    priceInline: {flexDirection: 'row', alignItems: 'center', gap: 6},
    actionStack: {gap: spacing.xs, paddingTop: spacing.xs},
    bold: {fontWeight: '700', color: colors.text},
    price: {color: colors.primary, fontWeight: '700'},
    flex: {flex: 1},
});
