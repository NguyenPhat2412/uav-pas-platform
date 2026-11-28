import React from 'react';
import {Alert, Share, StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {
    AlertTriangle,
    Award,
    Building2,
    CheckCircle2,
    Download,
    Megaphone,
    QrCode,
    ShieldCheck,
    Star,
} from 'lucide-react-native';
import {
    AppText,
    Badge,
    Button,
    Card,
    EmptyState,
    GlassSurface,
    LoadingState,
    SectionTitle,
} from '@/components/ui';
import {useBilling, useBillingActions} from '@/hooks/useCustomerBilling';
import {useAcceptMissionBid, useMissionBids} from '@/hooks/useMarketplaceCatalog';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {
    escrowStatusLabel,
    extractActionableError,
    formatVndCompact,
    providerOrderStatusLabel,
} from '@/shared/forms/marketplace-forms';
import type {MissionBid} from '@/shared/types/marketplace.types';
import type {Mission} from '@/shared/types/mission.types';
import {colors, radius, spacing} from '@/styles/tokens';

export function MobileMissionMarketplaceCard({
    mission,
    owned,
}: {
    mission: Mission;
    owned: boolean;
}) {
    const {t} = useI18n();
    const toast = useToast();
    const router = useRouter();
    const isOpenRfq = mission.providerResponseStatus === 'OPEN_RFQ';
    const isMarketplace =
        mission.listingId != null ||
        mission.providerId != null ||
        isOpenRfq ||
        mission.quotedSubtotalVnd != null;

    const {invoices} = useBilling();
    const {downloadReceipt} = useBillingActions();
    const bidsQuery = useMissionBids(mission.id, owned && isOpenRfq);
    const acceptBid = useAcceptMissionBid(mission.id);

    if (!isMarketplace) return null;

    const invoice = invoices.data?.content.find(inv => inv.missionId === mission.id);
    const escrowStatus = invoice?.escrowStatus ?? 'NONE';
    const stepIndex =
        escrowStatus === 'RELEASED'
            ? 3
            : mission.status === 'IN_PROGRESS' || mission.status === 'COMPLETED'
              ? 2
              : escrowStatus === 'HELD' || invoice?.status === 'PAID'
                ? 1
                : 0;

    const escrowSteps = [
        t('mobile.escrow.stepOrder'),
        t('mobile.escrow.stepFund'),
        t('mobile.escrow.stepFly'),
        t('mobile.escrow.stepRelease'),
    ];

    const shareReceipt = async (invoiceId: number, code: string) => {
        try {
            const dataUri = await downloadReceipt.mutateAsync(invoiceId);
            const title = t('mobile.billing.receiptShareTitle', {code});
            await Share.share({title, url: dataUri, message: title});
        } catch (error) {
            toast.show(extractActionableError(error, t('billingPage.loadError')), 'error');
        }
    };

    const confirmAcceptBid = (bid: MissionBid) => {
        Alert.alert(
            t('mobile.escrow.acceptBidTitle'),
            t('mobile.escrow.acceptBidConfirm', {
                provider: bid.providerDisplayName,
                price: formatVndCompact(bid.proposedPriceVnd),
            }),
            [
                {text: t('common.cancel'), style: 'cancel'},
                {
                    text: t('common.confirm'),
                    onPress: () =>
                        acceptBid.mutate(bid.id, {
                            onSuccess: () => toast.show(t('mobile.escrow.bidAcceptedToast'), 'success'),
                            onError: err =>
                                toast.show(
                                    extractActionableError(err, t('mobile.escrow.bidAcceptError')),
                                    'error',
                                ),
                        }),
                },
            ],
        );
    };

    return (
        <GlassSurface style={styles.glassCard} fallback={styles.glassFallback}>
            <SectionTitle
                title={t('mobile.escrow.cardTitle')}
                action={
                    <Badge
                        icon={ShieldCheck}
                        label={
                            escrowStatus !== 'NONE'
                                ? escrowStatusLabel(escrowStatus)
                                : invoice?.status === 'PENDING'
                                  ? t('billingPage.status.PENDING')
                                  : providerOrderStatusLabel(mission.providerResponseStatus)
                        }
                        background={
                            escrowStatus === 'DISPUTED'
                                ? colors.dangerLight
                                : escrowStatus === 'HELD' || escrowStatus === 'RELEASED'
                                  ? colors.primaryLight
                                  : colors.warningLight
                        }
                        color={
                            escrowStatus === 'DISPUTED'
                                ? colors.danger
                                : escrowStatus === 'HELD' || escrowStatus === 'RELEASED'
                                  ? colors.primary
                                  : colors.warning
                        }
                    />
                }
            />

            <View style={styles.stepper}>
                {escrowSteps.map((label, idx) => {
                    const active = idx <= stepIndex;
                    return (
                        <View key={label} style={styles.stepItem}>
                            <View style={[styles.stepBar, active && styles.stepBarActive]}/>
                            <AppText
                                variant="caption"
                                numberOfLines={1}
                                style={active ? styles.stepActiveText : undefined}>
                                {label}
                            </AppText>
                        </View>
                    );
                })}
            </View>

            {!owned && mission.providerDisplayName ? (
                <View style={styles.metaRow}>
                    <Building2 size={15} color={colors.primary}/>
                    <AppText variant="small" style={styles.bold}>
                        {mission.providerDisplayName}
                    </AppText>
                </View>
            ) : null}

            {mission.listingTitle ? (
                <AppText variant="caption">
                    {mission.listingTitle}
                    {mission.bookingUnits ? ` · ${mission.bookingUnits}` : ''}
                </AppText>
            ) : null}

            {mission.quotedSubtotalVnd != null || invoice ? (
                <View style={styles.amountBox}>
                    <AppText variant="small">
                        {t('mobile.marketplace.estimatedEscrow')} · {t('mobile.shop.illustrativePrice')}
                    </AppText>
                    <AppText variant="title" style={styles.price}>
                        {formatVndCompact(invoice?.amount ?? mission.quotedSubtotalVnd)}
                    </AppText>
                </View>
            ) : null}

            {escrowStatus === 'DISPUTED' ? (
                <View style={styles.alertDanger}>
                    <AlertTriangle size={16} color={colors.danger}/>
                    <AppText variant="caption" style={styles.dangerText}>
                        {t('mobile.escrow.disputedNotice')}
                    </AppText>
                </View>
            ) : escrowStatus === 'RELEASED' ? (
                <View style={styles.alertSuccess}>
                    <CheckCircle2 size={16} color={colors.primary}/>
                    <AppText variant="caption" style={styles.primaryText}>
                        {t('mobile.escrow.releasedNotice')}
                    </AppText>
                </View>
            ) : null}

            {owned && invoice?.status === 'PENDING' ? (
                <Button
                    icon={QrCode}
                    label={t('mobile.escrow.payVietQrCta', {code: invoice.code})}
                    onPress={() =>
                        router.push({
                            pathname: '/customer/invoices/[id]',
                            params: {id: String(invoice.id)},
                        })
                    }
                />
            ) : owned && invoice?.status === 'PAID' ? (
                <Button
                    tone="secondary"
                    size="sm"
                    icon={Download}
                    loading={downloadReceipt.isPending}
                    label={t('mobile.billing.shareReceiptPdf')}
                    onPress={() => void shareReceipt(invoice.id, invoice.code)}
                />
            ) : null}

            {owned && isOpenRfq ? (
                <View style={styles.rfqBlock}>
                    <View style={styles.metaRow}>
                        <Megaphone size={15} color={colors.primary}/>
                        <AppText variant="small" style={styles.bold}>
                            {t('mobile.escrow.rfqBidsTitle', {
                                count: bidsQuery.data?.length ?? 0,
                            })}
                        </AppText>
                    </View>
                    {bidsQuery.isPending ? (
                        <LoadingState/>
                    ) : !bidsQuery.data?.length ? (
                        <EmptyState icon={Megaphone} message={t('mobile.escrow.noBidsYet')}/>
                    ) : (
                        bidsQuery.data.map(bid => (
                            <Card key={bid.id} style={styles.bidCard}>
                                <View style={styles.bidHeader}>
                                    <AppText variant="small" style={styles.bold}>
                                        {bid.providerDisplayName}
                                    </AppText>
                                    <AppText variant="title" style={styles.price}>
                                        {formatVndCompact(bid.proposedPriceVnd)}
                                    </AppText>
                                </View>
                                <View style={styles.metaRow}>
                                    <Star size={13} color={colors.warning}/>
                                    <AppText variant="caption">
                                        {Number(bid.providerRatingAvg || 0).toFixed(1)}
                                    </AppText>
                                    <Award size={13} color={colors.primary}/>
                                    <AppText variant="caption">
                                        {bid.providerCompletedMissionsCount}{' '}
                                        {t('mobile.marketplace.completedFlights')}
                                    </AppText>
                                </View>
                                {bid.proposedUavModel ? (
                                    <AppText variant="caption">UAV: {bid.proposedUavModel}</AppText>
                                ) : null}
                                <AppText variant="small">{bid.proposalNote}</AppText>
                                {bid.status === 'PENDING' ? (
                                    <Button
                                        size="sm"
                                        icon={CheckCircle2}
                                        loading={acceptBid.isPending && acceptBid.variables === bid.id}
                                        label={t('mobile.escrow.acceptBidBtn')}
                                        onPress={() => confirmAcceptBid(bid)}
                                    />
                                ) : null}
                            </Card>
                        ))
                    )}
                </View>
            ) : null}
        </GlassSurface>
    );
}

const styles = StyleSheet.create({
    glassCard: {
        borderRadius: radius.card,
        padding: spacing.md,
        gap: spacing.sm,
        borderWidth: 1.5,
        borderColor: colors.glassBorderSelected,
    },
    glassFallback: {backgroundColor: colors.glassSurfaceSelected},
    stepper: {flexDirection: 'row', gap: spacing.xs},
    stepItem: {flex: 1, gap: 4, minWidth: 0},
    stepBar: {height: 4, borderRadius: 2, backgroundColor: colors.border},
    stepBarActive: {backgroundColor: colors.primary},
    stepActiveText: {color: colors.text, fontWeight: '700'},
    metaRow: {flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap'},
    bold: {fontWeight: '700', color: colors.text},
    price: {color: colors.primary, fontWeight: '700'},
    amountBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        borderRadius: radius.control,
        padding: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    alertDanger: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.dangerLight,
        borderRadius: radius.control,
        padding: spacing.sm,
    },
    dangerText: {flex: 1, color: colors.danger, fontWeight: '600'},
    alertSuccess: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.primaryLight,
        borderRadius: radius.control,
        padding: spacing.sm,
    },
    primaryText: {flex: 1, color: colors.primary, fontWeight: '600'},
    rfqBlock: {
        gap: spacing.sm,
        paddingTop: spacing.xs,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
    },
    bidCard: {gap: spacing.xs},
    bidHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.xs},
});
