import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {ArrowDownToLine, Receipt, Wallet} from 'lucide-react-native';
import {
    AppText,
    Badge,
    Button,
    Card,
    EmptyState,
    GlassSurface,
    LoadingState,
    ScaledText,
    Screen,
    SectionTitle,
    TextField,
} from '@/components/ui';
import {
    useMyProviderWallet,
    useProviderStudioMutations,
} from '@/hooks/marketplace/useProviderStudio';
import {useSiteInfo} from '@/hooks/settings/useSiteInfo';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {
    extractActionableError,
    formatVndCompact,
    payoutStatusLabel,
    walletTxLabel,
} from '@/shared/forms/marketplace/marketplace-forms';
import {colors, font, radius, spacing} from '@/styles/tokens';

export function ProviderWalletScreen() {
    const {t, formatDate} = useI18n();
    const toast = useToast();
    const {minPayoutVnd, maxPayoutVnd, platformFeeRate} = useSiteInfo();
    const walletQuery = useMyProviderWallet();
    const mutations = useProviderStudioMutations();

    const [amountInput, setAmountInput] = useState('');
    const [note, setNote] = useState('');

    if (walletQuery.isPending && !walletQuery.data) {
        return (
            <Screen>
                <LoadingState/>
            </Screen>
        );
    }

    const wallet = walletQuery.data;
    const available = Number(wallet?.availableBalanceVnd ?? 0);
    const feePct = Math.round((wallet?.platformFeeRate ?? platformFeeRate) * 100);
    const presets = Array.from(
        new Set(
            [
                minPayoutVnd,
                Math.max(minPayoutVnd * 4, 2_000_000),
                5_000_000,
                available > minPayoutVnd ? Math.min(available, maxPayoutVnd) : minPayoutVnd,
            ].filter(v => v >= minPayoutVnd && v <= maxPayoutVnd),
        ),
    );

    const submitPayout = () => {
        const amount = Math.round(Number(amountInput));
        if (!Number.isFinite(amount) || amount < minPayoutVnd || amount > maxPayoutVnd) {
            toast.show(
                t('mobile.provider.payoutBoundsError', {
                    min: formatVndCompact(minPayoutVnd),
                    max: formatVndCompact(maxPayoutVnd),
                }),
                'error',
            );
            return;
        }
        if (amount > available) {
            toast.show(t('mobile.provider.insufficientBalance'), 'error');
            return;
        }
        mutations.requestPayout.mutate(
            {amountVnd: amount, providerNote: note.trim() || undefined},
            {
                onSuccess: () => {
                    setAmountInput('');
                    setNote('');
                    toast.show(t('mobile.provider.payoutRequestedToast'), 'success');
                },
                onError: err =>
                    toast.show(
                        extractActionableError(err, t('mobile.provider.saveError')),
                        'error',
                    ),
            },
        );
    };

    const payouts = wallet?.payouts ?? [];
    const transactions = wallet?.recentTransactions ?? [];

    return (
        <Screen
            onRefresh={() => void walletQuery.refetch()}
            refreshing={walletQuery.isRefetching}>
            <GlassSurface style={styles.heroGlass} fallback={styles.heroFallback}>
                <AppText variant="caption" numberOfLines={1}>
                    {t('mobile.provider.availableBalance')} · {t('mobile.shop.illustrativePrice')}
                </AppText>
                <AppText variant="display" style={styles.price} numberOfLines={1} adjustsFontSizeToFit>
                    {formatVndCompact(available)}
                </AppText>
                <View style={styles.row}>
                    <View style={styles.statBox}>
                        <AppText variant="caption">{t('mobile.provider.escrowHeld')}</AppText>
                        <AppText variant="title">
                            {formatVndCompact(wallet?.escrowHeldVnd ?? 0)}
                        </AppText>
                    </View>
                    <View style={styles.statBox}>
                        <AppText variant="caption">{t('mobile.provider.pendingPayout')}</AppText>
                        <AppText variant="title">
                            {formatVndCompact(wallet?.pendingPayoutVnd ?? 0)}
                        </AppText>
                    </View>
                </View>
                <AppText variant="caption">
                    {t('mobile.provider.feeBanner', {fee: feePct})}
                    {wallet?.bankName
                        ? ` · ${wallet.bankName}${wallet.bankAccountNumber ? ` · ${wallet.bankAccountNumber}` : ''}`
                        : ''}
                </AppText>
            </GlassSurface>

            <Card>
                <SectionTitle title={t('mobile.provider.withdrawTitle')}/>
                <View style={styles.presetRow}>
                    {presets.map(val => {
                        const active = Number(amountInput) === val;
                        return (
                            <Pressable
                                key={val}
                                accessibilityRole="button"
                                accessibilityLabel={formatVndCompact(val)}
                                onPress={() => setAmountInput(String(val))}
                                style={[styles.chip, active && styles.chipActive]}>
                                <ScaledText
                                    style={[styles.chipText, active && styles.chipTextActive]}>
                                    {formatVndCompact(val)}
                                </ScaledText>
                            </Pressable>
                        );
                    })}
                </View>
                <TextField
                    label={t('mobile.provider.payoutAmountLabel', {
                        min: formatVndCompact(minPayoutVnd),
                    })} required
                    keyboardType="number-pad"
                    value={amountInput}
                    onChangeText={setAmountInput}
                />
                <TextField
                    label={t('mobile.provider.payoutNoteLabel')} optional
                    value={note}
                    onChangeText={setNote}
                />
                <Button
                    icon={ArrowDownToLine}
                    disabled={available < minPayoutVnd}
                    loading={mutations.requestPayout.isPending}
                    label={t('mobile.provider.requestPayoutBtn')}
                    onPress={submitPayout}
                />
            </Card>

            <SectionTitle title={t('mobile.provider.payoutHistoryTitle')}/>
            {payouts.length === 0 ? (
                <EmptyState icon={Wallet} message={t('mobile.provider.noPayouts')}/>
            ) : (
                payouts.map(item => (
                    <Card key={item.id}>
                        <View style={styles.rowBetween}>
                            <AppText variant="caption" style={styles.bold}>
                                {item.code}
                            </AppText>
                            <Badge
                                label={payoutStatusLabel(item.status)}
                                background={
                                    item.status === 'PAID'
                                        ? colors.primaryLight
                                        : item.status === 'REJECTED'
                                          ? colors.dangerLight
                                          : colors.warningLight
                                }
                                color={
                                    item.status === 'PAID'
                                        ? colors.primary
                                        : item.status === 'REJECTED'
                                          ? colors.danger
                                          : colors.warning
                                }
                            />
                        </View>
                        <AppText variant="title" style={styles.price}>
                            {formatVndCompact(item.amountVnd)}
                        </AppText>
                        <AppText variant="caption">
                            {item.bankName} · {item.bankAccountNumber}
                        </AppText>
                        {item.bankTransferRef ? (
                            <AppText variant="caption">UNC: {item.bankTransferRef}</AppText>
                        ) : null}
                        {item.adminNote ? (
                            <AppText variant="caption">{item.adminNote}</AppText>
                        ) : null}
                    </Card>
                ))
            )}

            <SectionTitle title={t('mobile.provider.ledgerTitle')}/>
            {transactions.length === 0 ? (
                <EmptyState icon={Receipt} message={t('mobile.provider.noTransactions')}/>
            ) : (
                transactions.map(tx => (
                    <Card key={tx.id}>
                        <View style={styles.rowBetween}>
                            <AppText variant="small" style={styles.bold}>
                                {walletTxLabel(tx.transactionType)}
                            </AppText>
                            <AppText variant="title" style={styles.price}>
                                {formatVndCompact(tx.netAmountVnd)}
                            </AppText>
                        </View>
                        {tx.description ? (
                            <AppText variant="caption">{tx.description}</AppText>
                        ) : null}
                        {tx.createdAt ? (
                            <AppText variant="caption">
                                {formatDate(tx.createdAt, {
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                })}
                            </AppText>
                        ) : null}
                    </Card>
                ))
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    heroGlass: {
        borderRadius: radius.card,
        padding: spacing.md,
        gap: spacing.sm,
        borderWidth: 1.5,
        borderColor: colors.glassBorderSelected,
    },
    heroFallback: {backgroundColor: colors.glassSurfaceSelected},
    row: {flexDirection: 'row', gap: spacing.sm},
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: spacing.sm,
    },
    statBox: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.control,
        padding: spacing.sm,
        gap: 2,
        borderWidth: 1,
        borderColor: colors.border,
    },
    presetRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    chip: {
        minHeight: 38,
        justifyContent: 'center',
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: colors.inputBorder,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    chipActive: {backgroundColor: colors.primary, borderColor: colors.primary},
    chipText: {fontSize: font.caption, fontWeight: '600', color: colors.text},
    chipTextActive: {color: colors.white},
    price: {color: colors.primary, fontWeight: '700'},
    bold: {fontWeight: '700', color: colors.text},
});
