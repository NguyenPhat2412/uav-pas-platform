import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Building2, CheckCircle2, Layers, Wallet, XCircle} from 'lucide-react-native';
import {
    AppText,
    Badge,
    Button,
    Card,
    EmptyState,
    LoadingState,
    SectionTitle,
    TextField,
} from '@/components/ui';
import {GlassSelectCards, type GlassOption} from '@/components/ui/GlassSelect';
import {
    useAdminMarketplaceListings,
    useAdminMarketplaceMutations,
    useAdminMarketplacePayouts,
    useAdminMarketplaceProviders,
} from '@/hooks/useAdminMarketplaceMobile';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {
    extractActionableError,
    formatVndCompact,
    listingTypeLabel,
} from '@/shared/forms/marketplace-forms';
import {colors, spacing} from '@/styles/tokens';

type ModQueue = 'PROVIDERS' | 'LISTINGS' | 'PAYOUTS';

export function AdminMarketplaceTabContent() {
    const {t} = useI18n();
    const toast = useToast();
    const [queue, setQueue] = useState<ModQueue>('PROVIDERS');
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [refs, setRefs] = useState<Record<number, string>>({});

    const providersQuery = useAdminMarketplaceProviders('PENDING_REVIEW');
    const listingsQuery = useAdminMarketplaceListings('PENDING_REVIEW');
    const payoutsQuery = useAdminMarketplacePayouts('PENDING');
    const mutations = useAdminMarketplaceMutations();

    const providers = providersQuery.data?.content ?? [];
    const listings = listingsQuery.data?.content ?? [];
    const payouts = payoutsQuery.data?.content ?? [];

    const queueOptions: GlassOption<ModQueue>[] = [
        {
            value: 'PROVIDERS',
            label: t('mobile.adminQuick.marketplace.kycTab'),
            badge: `${providers.length}`,
            icon: Building2,
        },
        {
            value: 'LISTINGS',
            label: t('mobile.adminQuick.marketplace.listingsTab'),
            badge: `${listings.length}`,
            icon: Layers,
        },
        {
            value: 'PAYOUTS',
            label: t('mobile.adminQuick.marketplace.payoutsTab'),
            badge: `${payouts.length}`,
            icon: Wallet,
        },
    ];

    const showErr = (err: unknown) =>
        toast.show(extractActionableError(err, t('mobile.provider.saveError')), 'error');

    const okToast = () => toast.show(t('mobile.adminQuick.marketplace.moderatedToast'), 'success');

    return (
        <>
            <GlassSelectCards<ModQueue> columns={1} value={queue} options={queueOptions} onChange={setQueue}/>

            {queue === 'PROVIDERS' ? (
                providersQuery.isPending ? (
                    <LoadingState/>
                ) : providers.length === 0 ? (
                    <EmptyState icon={Building2} message={t('mobile.adminQuick.marketplace.emptyKyc')}/>
                ) : (
                    providers.map(prov => {
                        const key = `p-${prov.id}`;
                        const note = notes[key] ?? '';
                        return (
                            <Card key={prov.id}>
                                <AppText variant="title">{prov.displayName}</AppText>
                                <AppText variant="caption">
                                    {prov.providerType} · {prov.province} · {prov.taxOrIdNumber ?? '—'}
                                </AppText>
                                <TextField
                                    label={t('missionForm.notes')} optional
                                    placeholder={t('mobile.adminQuick.marketplace.notePlaceholder')}
                                    value={note}
                                    onChangeText={val => setNotes(prev => ({...prev, [key]: val}))}
                                />
                                <View style={styles.row}>
                                    <Button
                                        size="sm"
                                        icon={CheckCircle2}
                                        style={styles.flex}
                                        loading={mutations.moderateProvider.isPending}
                                        label={t('mobile.adminQuick.marketplace.approveBtn')}
                                        onPress={() =>
                                            mutations.moderateProvider.mutate(
                                                {id: prov.id, payload: {status: 'VERIFIED', reviewNote: note.trim() || undefined}},
                                                {onSuccess: okToast, onError: showErr},
                                            )
                                        }
                                    />
                                    <Button
                                        size="sm"
                                        tone="danger"
                                        icon={XCircle}
                                        style={styles.flex}
                                        label={t('mobile.adminQuick.marketplace.rejectBtn')}
                                        onPress={() =>
                                            mutations.moderateProvider.mutate(
                                                {
                                                    id: prov.id,
                                                    payload: {
                                                        status: 'REJECTED',
                                                        reviewNote: note.trim() || t('mobile.adminQuick.marketplace.defaultRejectNote'),
                                                    },
                                                },
                                                {onError: showErr},
                                            )
                                        }
                                    />
                                </View>
                            </Card>
                        );
                    })
                )
            ) : queue === 'LISTINGS' ? (
                listingsQuery.isPending ? (
                    <LoadingState/>
                ) : listings.length === 0 ? (
                    <EmptyState icon={Layers} message={t('mobile.adminQuick.marketplace.emptyListings')}/>
                ) : (
                    listings.map(item => {
                        const key = `l-${item.id}`;
                        const note = notes[key] ?? '';
                        return (
                            <Card key={item.id}>
                                <Badge label={listingTypeLabel(item.listingType)} background={colors.slateLight} color={colors.slateDark}/>
                                <AppText variant="title">{item.title}</AppText>
                                <AppText variant="caption">
                                    {item.providerDisplayName} · {formatVndCompact(item.basePriceVnd)}
                                </AppText>
                                <TextField
                                    label={t('missionForm.notes')} optional
                                    placeholder={t('mobile.adminQuick.marketplace.notePlaceholder')}
                                    value={note}
                                    onChangeText={val => setNotes(prev => ({...prev, [key]: val}))}
                                />
                                <View style={styles.row}>
                                    <Button
                                        size="sm"
                                        icon={CheckCircle2}
                                        style={styles.flex}
                                        loading={mutations.moderateListing.isPending}
                                        label={t('mobile.adminQuick.marketplace.publishBtn')}
                                        onPress={() =>
                                            mutations.moderateListing.mutate(
                                                {id: item.id, payload: {status: 'PUBLISHED', moderationNote: note.trim() || undefined}},
                                                {onSuccess: okToast, onError: showErr},
                                            )
                                        }
                                    />
                                    <Button
                                        size="sm"
                                        tone="danger"
                                        icon={XCircle}
                                        style={styles.flex}
                                        label={t('mobile.adminQuick.marketplace.rejectBtn')}
                                        onPress={() =>
                                            mutations.moderateListing.mutate(
                                                {
                                                    id: item.id,
                                                    payload: {
                                                        status: 'REJECTED',
                                                        moderationNote: note.trim() || t('mobile.adminQuick.marketplace.defaultRejectNote'),
                                                    },
                                                },
                                                {onError: showErr},
                                            )
                                        }
                                    />
                                </View>
                            </Card>
                        );
                    })
                )
            ) : payoutsQuery.isPending ? (
                <LoadingState/>
            ) : payouts.length === 0 ? (
                <EmptyState icon={Wallet} message={t('mobile.adminQuick.marketplace.emptyPayouts')}/>
            ) : (
                payouts.map(payout => {
                    const ref = refs[payout.id] ?? '';
                    const note = notes[`w-${payout.id}`] ?? '';
                    return (
                        <Card key={payout.id}>
                            <SectionTitle
                                title={payout.code}
                                action={<Badge label={formatVndCompact(payout.amountVnd)} background={colors.primaryLight} color={colors.primary}/>}
                            />
                            <AppText variant="small">
                                {payout.providerDisplayName} · {payout.bankName} ({payout.bankAccountNumber})
                            </AppText>
                            <TextField
                                label={t('mobile.adminQuick.invoices.refLabel')} required
                                value={ref}
                                autoCapitalize="characters"
                                onChangeText={val => setRefs(prev => ({...prev, [payout.id]: val}))}
                            />
                            <TextField
                                label={t('missionForm.notes')} optional
                                placeholder={t('mobile.adminQuick.marketplace.notePlaceholder')}
                                value={note}
                                onChangeText={val => setNotes(prev => ({...prev, [`w-${payout.id}`]: val}))}
                            />
                            <View style={styles.row}>
                                <Button
                                    size="sm"
                                    icon={CheckCircle2}
                                    style={styles.flex}
                                    disabled={!ref.trim()}
                                    loading={mutations.processPayout.isPending}
                                    label={t('mobile.adminQuick.marketplace.approveBtn')}
                                    onPress={() =>
                                        mutations.processPayout.mutate(
                                            {id: payout.id, payload: {approve: true, bankTransferRef: ref.trim(), adminNote: note.trim() || undefined}},
                                            {onSuccess: okToast, onError: showErr},
                                        )
                                    }
                                />
                                <Button
                                    size="sm"
                                    tone="danger"
                                    icon={XCircle}
                                    style={styles.flex}
                                    disabled={!note.trim()}
                                    label={t('mobile.adminQuick.marketplace.rejectBtn')}
                                    onPress={() =>
                                        mutations.processPayout.mutate(
                                            {id: payout.id, payload: {approve: false, adminNote: note.trim()}},
                                            {onError: showErr},
                                        )
                                    }
                                />
                            </View>
                        </Card>
                    );
                })
            )}
        </>
    );
}

const styles = StyleSheet.create({
    row: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    flex: {flex: 1},
});
