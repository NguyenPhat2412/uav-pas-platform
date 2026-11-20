import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Award, Layers, Package, Pause, Plane, Play, Plus, Send, Tag, Trash2, X} from 'lucide-react-native';
import {ProviderTemplateQuickCard} from '@/components/marketplace/provider/ProviderTemplateQuickCard';
import {
    IllustrativeBadge,
    IllustrativeFooterNote,
} from '@/components/shared/IllustrativeDisclaimer';
import {cleanEntityName} from '@/utils/marketplace/clean-text';
import {
    AppText,
    Badge,
    Button,
    Card,
    ChipGroup,
    EmptyState,
    ErrorState,
    LoadingState,
    Screen,
    SectionTitle,
    TextField,
} from '@/components/ui';
import {GlassSelectCards, GlassSelectField, type GlassOption} from '@/components/ui/GlassSelect';
import {
    useMyProviderListings,
    useMyProviderProfile,
    useProviderStudioMutations,
} from '@/hooks/marketplace/useProviderStudio';
import {useSiteInfo} from '@/hooks/settings/useSiteInfo';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {
    extractActionableError,
    formatVndCompact,
    initialListingForm,
    LISTING_TYPE_OPTIONS,
    listingTypeLabel,
    moderationStatusLabel,
    PRICING_MODEL_OPTIONS,
    pricingUnitLabel,
} from '@/shared/forms/marketplace/marketplace-forms';
import {missionTypes} from '@/shared/forms/mission/mission-form';
import {displayLabel} from '@/shared/lib/presentation';
import type {
    ListingType,
    MarketplaceListingUpsertInput,
    PricingModel,
} from '@/shared/types/marketplace/marketplace.types';
import type {MissionType} from '@/shared/types/mission/mission.types';
import {colors, spacing} from '@/styles/tokens';

type CreateMode = 'TEMPLATE' | 'CUSTOM';

export function ProviderListingsScreen() {
    const {t} = useI18n();
    const toast = useToast();
    const {defaultServiceRadiusKm} = useSiteInfo();
    const profileQuery = useMyProviderProfile();
    const listingsQuery = useMyProviderListings();
    const mutations = useProviderStudioMutations();

    const [showCreate, setShowCreate] = useState(false);
    const [createMode, setCreateMode] = useState<CreateMode>('TEMPLATE');
    const [form, setForm] = useState<MarketplaceListingUpsertInput>(() =>
        initialListingForm(profileQuery.data?.province ?? 'Hà Nội', defaultServiceRadiusKm),
    );

    const set = <K extends keyof MarketplaceListingUpsertInput>(
        key: K,
        value: MarketplaceListingUpsertInput[K],
    ) => setForm(prev => ({...prev, [key]: value}));

    const typeOptions: GlassOption<ListingType>[] = LISTING_TYPE_OPTIONS.map(opt => ({
        value: opt.value,
        label: opt.label,
        description: opt.hint,
        icon: opt.value === 'FLIGHT_SERVICE' ? Plane : opt.value === 'WET_LEASE' ? Award : Package,
    }));

    const missionOptions: GlassOption<MissionType>[] = missionTypes.map(type => ({
        value: type,
        label: displayLabel(type),
        icon: Layers,
    }));

    const pricingOptions: GlassOption<PricingModel>[] = PRICING_MODEL_OPTIONS.map(opt => ({
        value: opt.value,
        label: opt.label,
        badge: `/${opt.unitShort}`,
        icon: Tag,
    }));

    const submitListing = () => {
        if (!form.title.trim()) {
            toast.show(t('mobile.provider.listingTitleRequired'), 'error');
            return;
        }
        mutations.createListing.mutate(
            {...form, title: form.title.trim(), province: form.province.trim() || 'Hà Nội', submitForReview: true},
            {
                onSuccess: () => {
                    setShowCreate(false);
                    setForm(initialListingForm(profileQuery.data?.province ?? 'Hà Nội', defaultServiceRadiusKm));
                    toast.show(t('mobile.provider.listingCreatedToast'), 'success');
                },
                onError: err => toast.show(extractActionableError(err, t('mobile.provider.saveError')), 'error'),
            },
        );
    };

    const listings = listingsQuery.data ?? [];

    return (
        <Screen
            onRefresh={() => void listingsQuery.refetch()}
            refreshing={listingsQuery.isRefetching}>
            <Button
                icon={showCreate ? X : Plus}
                tone={showCreate ? 'secondary' : 'primary'}
                label={
                    showCreate
                        ? t('common.cancel')
                        : t('mobile.provider.newListingBtn')
                }
                onPress={() => setShowCreate(prev => !prev)}
            />

            {showCreate ? (
                <Card>
                    <SectionTitle title={t('mobile.provider.newListingBtn')}/>
                    <ChipGroup<CreateMode>
                        value={createMode}
                        onChange={setCreateMode}
                        options={[
                            {value: 'TEMPLATE', label: t('mobile.overnight.fromTemplateBtn')},
                            {value: 'CUSTOM', label: t('mobile.overnight.customListingBtn')},
                        ]}
                    />

                    {createMode === 'TEMPLATE' ? (
                        <ProviderTemplateQuickCard
                            defaultProvince={profileQuery.data?.province ?? 'Hà Nội'}
                            defaultRadiusKm={defaultServiceRadiusKm}
                            loading={mutations.createListingFromTemplate.isPending}
                            onSubmit={payload =>
                                mutations.createListingFromTemplate.mutate(payload, {
                                    onSuccess: () => {
                                        setShowCreate(false);
                                        toast.show(t('mobile.provider.listingCreatedToast'), 'success');
                                    },
                                    onError: err =>
                                        toast.show(
                                            extractActionableError(err, t('mobile.provider.saveError')),
                                            'error',
                                        ),
                                })
                            }
                        />
                    ) : (
                        <>
                            <GlassSelectCards<ListingType>
                                label={t('mobile.marketplace.leaseTypeLabel')} required
                                columns={1}
                                value={form.listingType}
                                options={typeOptions}
                                onChange={val => set('listingType', val)}
                            />
                            <GlassSelectField<MissionType>
                                label={t('missions.type')} required
                                sheetTitle={t('missions.type')}
                                value={form.missionType}
                                options={missionOptions}
                                onChange={val => set('missionType', val)}
                            />
                            <GlassSelectField<PricingModel>
                                label={t('mobile.provider.pricingModelLabel')} required
                                sheetTitle={t('mobile.provider.pricingModelLabel')}
                                value={form.pricingModel}
                                options={pricingOptions}
                                onChange={val => set('pricingModel', val)}
                            />
                            <TextField
                                label={t('missionForm.title')} required
                                value={form.title}
                                onChangeText={val => set('title', val)}
                                maxLength={160}
                            />
                            <TextField
                                label={t('mobile.provider.summaryLabel')} optional
                                value={form.summary ?? ''}
                                onChangeText={val => set('summary', val)}
                                maxLength={280}
                            />
                            <View style={styles.row}>
                                <View style={styles.flex}>
                                    <TextField
                                        label={t('mobile.provider.basePriceLabel')} required
                                        keyboardType="number-pad"
                                        value={String(form.basePriceVnd)}
                                        onChangeText={val => set('basePriceVnd', Number(val) || 0)}
                                    />
                                </View>
                                <View style={styles.flex}>
                                    <TextField
                                        label={t('mobile.provider.minUnitsLabel')} optional
                                        keyboardType="decimal-pad"
                                        value={String(form.minBookingUnits ?? 1)}
                                        onChangeText={val => set('minBookingUnits', Number(val) || 1)}
                                    />
                                </View>
                            </View>
                            <TextField
                                label={t('mobile.marketplace.equipmentLabel')} optional
                                value={form.equipmentSpecs ?? ''}
                                onChangeText={val => set('equipmentSpecs', val)}
                            />
                            <TextField
                                label={t('mobile.marketplace.deliverablesLabel')} optional
                                value={form.deliverablesSummary ?? ''}
                                onChangeText={val => set('deliverablesSummary', val)}
                            />
                            <Button
                                icon={Send}
                                loading={mutations.createListing.isPending}
                                label={t('mobile.provider.publishListingBtn')}
                                onPress={submitListing}
                            />
                        </>
                    )}
                </Card>
            ) : null}

            <SectionTitle
                title={t('mobile.provider.myListingsTitle', {count: listings.length})}
            />

            {listingsQuery.isPending && !listings.length ? (
                <LoadingState/>
            ) : listingsQuery.isError && !listings.length ? (
                <ErrorState
                    message={t('services.loadError')}
                    retryLabel={t('common.retry')}
                    onRetry={() => void listingsQuery.refetch()}
                />
            ) : listings.length === 0 ? (
                <EmptyState
                    icon={Layers}
                    message={t('mobile.provider.noListings')}
                    action={
                        <Button
                            size="sm"
                            icon={Plus}
                            label={t('mobile.provider.newListingBtn')}
                            onPress={() => setShowCreate(true)}
                        />
                    }
                />
            ) : (
                listings.map(item => (
                    <Card key={item.id}>
                        <View style={styles.badgeRow}>
                            <Badge
                                label={listingTypeLabel(item.listingType)}
                                background={colors.slateLight}
                                color={colors.slateDark}
                            />
                            <Badge
                                label={moderationStatusLabel(item.moderationStatus)}
                                background={
                                    item.moderationStatus === 'PUBLISHED'
                                        ? colors.primaryLight
                                        : item.moderationStatus === 'REJECTED'
                                          ? colors.dangerLight
                                          : colors.warningLight
                                }
                                color={
                                    item.moderationStatus === 'PUBLISHED'
                                        ? colors.primary
                                        : item.moderationStatus === 'REJECTED'
                                          ? colors.danger
                                          : colors.warning
                                }
                            />
                        </View>
                        <AppText variant="title" numberOfLines={2}>
                            {cleanEntityName(item.title)}
                        </AppText>
                        <View style={styles.priceRow}>
                            <AppText variant="title" style={styles.price} numberOfLines={1}>
                                {formatVndCompact(item.basePriceVnd)} / {pricingUnitLabel(item.pricingModel)}
                            </AppText>
                            <IllustrativeBadge/>
                        </View>
                        {item.moderationNote ? (
                            <AppText variant="caption" style={styles.danger}>
                                {item.moderationNote}
                            </AppText>
                        ) : null}
                        <View style={styles.row}>
                            {(item.moderationStatus === 'PUBLISHED' ||
                                item.moderationStatus === 'PAUSED') && (
                                <Button
                                    size="sm"
                                    tone="secondary"
                                    style={styles.flex}
                                    icon={item.moderationStatus === 'PAUSED' ? Play : Pause}
                                    loading={mutations.toggleListingPause.isPending && mutations.toggleListingPause.variables === item.id}
                                    label={item.moderationStatus === 'PAUSED' ? t('mobile.provider.resumeListingBtn') : t('mobile.provider.pauseListingBtn')}
                                    onPress={() => mutations.toggleListingPause.mutate(item.id)}
                                />
                            )}
                            <Button
                                size="sm"
                                tone="ghost"
                                icon={Trash2}
                                loading={mutations.deleteListing.isPending && mutations.deleteListing.variables === item.id}
                                label={t('mobile.overnight.deleteListingBtn')}
                                onPress={() =>
                                    mutations.deleteListing.mutate(item.id, {
                                        onSuccess: () => toast.show(t('mobile.overnight.listingDeletedToast'), 'info'),
                                        onError: err => toast.show(extractActionableError(err, t('mobile.provider.saveError')), 'error'),
                                    })
                                }
                            />
                        </View>
                    </Card>
                ))
            )}
            <IllustrativeFooterNote/>
        </Screen>
    );
}

const styles = StyleSheet.create({
    row: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    priceRow: {flexDirection: 'row', alignItems: 'baseline', gap: 6},
    flex: {flex: 1},
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: spacing.xs,
    },
    price: {color: colors.primary, fontWeight: '700'},
    danger: {color: colors.danger, fontWeight: '600'},
});
