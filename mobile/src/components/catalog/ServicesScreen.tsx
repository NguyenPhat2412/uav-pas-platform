import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {Stack, useLocalSearchParams, useRouter} from 'expo-router';
import {AssistantMascot} from '@/components/assistant/AssistantMascot';
import {
    ArrowUpDown,
    Award,
    Camera,
    Layers,
    Megaphone,
    Package,
    Plane,
    Plus,
    ShieldCheck,
    SlidersHorizontal,
    Sparkles,
    Star,
} from 'lucide-react-native';
import {
    AppText,
    Badge,
    Button,
    Card,
    ChipGroup,
    EmptyState,
    ErrorState,
    GlassSurface,
    LoadingState,
    Screen,
    SectionTitle,
    TextField,
} from '@/components/ui';
import {GlassSelectField, type GlassOption} from '@/components/ui/GlassSelect';
import {MarketplaceListingCard} from '@/components/marketplace/catalog/MarketplaceListingCard';
import {usePublicListings} from '@/hooks/marketplace/useMarketplaceCatalog';
import {useServices} from '@/hooks/mission/useCustomerMissions';
import {useSiteInfo} from '@/hooks/settings/useSiteInfo';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {displayLabel, serviceName} from '@/shared/lib/presentation';
import type {ListingSortOption, ListingType} from '@/shared/types/marketplace/marketplace.types';
import {colors, radius, spacing} from '@/styles/tokens';

type LeaseFilter = ListingType | 'ALL';
const VALID_LEASE_FILTERS: readonly LeaseFilter[] = ['ALL', 'FLIGHT_SERVICE', 'WET_LEASE', 'DRY_LEASE'];

export function ServicesScreen() {
    const {t, formatNumber} = useI18n();
    const {status, can} = useAuth();
    const toast = useToast();
    const router = useRouter();
    const params = useLocalSearchParams<{ q?: string; type?: string }>();
    const {rfqEnabled} = useSiteInfo();

    const requestedQ = typeof params.q === 'string' ? params.q : '';
    const requestedType: LeaseFilter = VALID_LEASE_FILTERS.includes(params.type as LeaseFilter)
        ? (params.type as LeaseFilter)
        : 'ALL';
    const [chosenQ, setChosenQ] = useState<{ from: string | undefined; value: string }>({
        from: params.q,
        value: requestedQ,
    });
    const [chosenType, setChosenType] = useState<{ from: string | undefined; value: LeaseFilter }>({
        from: params.type,
        value: requestedType,
    });
    const keyword = chosenQ.from === params.q ? chosenQ.value : requestedQ;
    const leaseFilter = chosenType.from === params.type ? chosenType.value : requestedType;
    const setKeyword = (value: string) => setChosenQ({from: params.q, value});
    const setLeaseFilter = (value: LeaseFilter) => setChosenType({from: params.type, value});
    const [sortBy, setSortBy] = useState<ListingSortOption>('featured');
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const [showStandard, setShowStandard] = useState(false);

    const listingsQuery = usePublicListings({
        keyword: keyword.trim() || undefined,
        listingType: leaseFilter === 'ALL' ? '' : leaseFilter,
        sortBy,
        size: 20,
    });
    const services = useServices();

    const leaseOptions: GlassOption<LeaseFilter>[] = [
        {
            value: 'ALL',
            label: t('mobile.marketplace.filterAll'),
            description: t('mobile.marketplace.filterAllDesc'),
            icon: Layers,
        },
        {
            value: 'FLIGHT_SERVICE',
            label: t('mobile.marketplace.typeFlightService'),
            description: t('mobile.marketplace.typeFlightServiceDesc'),
            icon: Plane,
        },
        {
            value: 'WET_LEASE',
            label: t('mobile.marketplace.typeWetLease'),
            description: t('mobile.marketplace.typeWetLeaseDesc'),
            icon: Award,
        },
        {
            value: 'DRY_LEASE',
            label: t('mobile.marketplace.typeDryLease'),
            description: t('mobile.marketplace.typeDryLeaseDesc'),
            icon: Package,
        },
    ];

    const sortOptions: GlassOption<ListingSortOption>[] = [
        {value: 'featured', label: t('mobile.marketplace.sortFeatured'), icon: Sparkles},
        {value: 'rating', label: t('mobile.marketplace.sortRating'), icon: Star},
        {value: 'price_asc', label: t('mobile.marketplace.sortPriceAsc'), icon: ArrowUpDown},
        {value: 'price_desc', label: t('mobile.marketplace.sortPriceDesc'), icon: ArrowUpDown},
    ];

    const quickLeaseChips = leaseOptions.map(opt => ({value: opt.value, label: opt.label}));
    const listings = listingsQuery.data?.content ?? [];
    const activeStandard = (services.data ?? []).filter(service => service.active);
    const canBook = status !== 'signed-in' || can('MISSION_CREATE');

    const handleRefresh = () => {
        void listingsQuery.refetch();
        if (status === 'signed-in') void services.refetch();
    };

    const handleOpenRfq = () => {
        if (status !== 'signed-in') {
            toast.show(t('mobile.shop.loginToBookToast'), 'info');
            router.push('/login');
            return;
        }
        router.push({pathname: '/customer/mission/create', params: {rfq: '1'}});
    };

    return (
        <Screen
            onRefresh={handleRefresh}
            refreshing={listingsQuery.isRefetching || services.isRefetching}>
            <Stack.Screen
                options={{
                    headerRight: () => (
                        <Pressable
                            onPress={() => router.push('/customer/assistant')}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel={t('admin.assistant.open')}
                            style={({pressed}) => [pressed && styles.pressed]}>
                            <GlassSurface
                                interactive
                                style={styles.assistantBtn}
                                fallback={styles.assistantBtnFallback}>
                                <AssistantMascot size={24}/>
                            </GlassSurface>
                        </Pressable>
                    ),
                }}
            />

            <View style={styles.topControls}>
                <View style={styles.searchRow}>
                    <View style={styles.flex}>
                        <TextField
                            placeholder={t('mobile.marketplace.searchPlaceholder')}
                            value={keyword}
                            onChangeText={setKeyword}
                            clearButtonMode="while-editing"
                        />
                    </View>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('mobile.shop.filterToggleBtn')}
                        onPress={() => setFiltersExpanded(prev => !prev)}
                        style={({pressed}) => [
                            styles.filterBtn,
                            filtersExpanded && styles.filterBtnActive,
                            pressed && styles.pressed,
                        ]}>
                        <SlidersHorizontal
                            size={18}
                            color={filtersExpanded ? colors.white : colors.slateDark}
                        />
                        <AppText
                            variant="caption"
                            style={[
                                styles.filterBtnText,
                                filtersExpanded && styles.filterBtnTextActive,
                            ]}>
                            {t('mobile.shop.filterToggleBtn')}
                        </AppText>
                    </Pressable>
                </View>

                <ChipGroup
                    options={quickLeaseChips}
                    value={leaseFilter}
                    onChange={setLeaseFilter}
                />

                {filtersExpanded && (
                    <Card style={styles.filterDrawer}>
                        <GlassSelectField<LeaseFilter>
                            label={t('mobile.marketplace.leaseTypeLabel')}
                            sheetTitle={t('mobile.marketplace.leaseTypeLabel')}
                            value={leaseFilter}
                            options={leaseOptions}
                            onChange={setLeaseFilter}
                        />
                        <GlassSelectField<ListingSortOption>
                            label={t('mobile.marketplace.sortLabel')}
                            sheetTitle={t('mobile.marketplace.sortLabel')}
                            value={sortBy}
                            options={sortOptions}
                            onChange={setSortBy}
                        />
                        {rfqEnabled && canBook ? (
                            <Button
                                size="sm"
                                tone="secondary"
                                icon={Megaphone}
                                label={t('mobile.marketplace.postRfq')}
                                onPress={handleOpenRfq}
                            />
                        ) : null}
                    </Card>
                )}

                <Pressable
                    accessibilityRole="button"
                    onPress={rfqEnabled && canBook ? handleOpenRfq : undefined}
                    style={({pressed}) => [styles.escrowBar, pressed && styles.pressed]}>
                    <ShieldCheck size={15} color={colors.primary}/>
                    <AppText variant="caption" style={styles.escrowText} numberOfLines={1}>
                        {t('mobile.shop.escrowMicroHint')}
                    </AppText>
                    {rfqEnabled && canBook ? (
                        <AppText variant="caption" style={styles.rfqInlineLink}>
                            RFQ
                        </AppText>
                    ) : null}
                </Pressable>
            </View>

            <SectionTitle
                title={t('mobile.marketplace.catalogTitle', {
                    count: formatNumber(listingsQuery.data?.totalElements ?? listings.length),
                })}
            />

            {listingsQuery.isPending ? (
                <LoadingState label={t('services.loading')}/>
            ) : listingsQuery.isError ? (
                <ErrorState
                    message={t('services.loadError')}
                    retryLabel={t('common.retry')}
                    onRetry={() => void listingsQuery.refetch()}
                />
            ) : listings.length === 0 ? (
                <EmptyState icon={Layers} message={t('mobile.marketplace.emptyListings')}/>
            ) : (
                listings.map(item => <MarketplaceListingCard key={item.id} item={item}/>)
            )}

            {status === 'signed-in' && activeStandard.length > 0 ? (
                <Button
                    tone="ghost"
                    size="sm"
                    icon={Camera}
                    label={
                        showStandard
                            ? t('mobile.marketplace.hideStandardCatalog')
                            : t('mobile.marketplace.showStandardCatalog')
                    }
                    onPress={() => setShowStandard(prev => !prev)}
                />
            ) : null}

            {showStandard &&
                activeStandard.map(service => (
                    <Card key={service.id}>
                        <Badge
                            label={displayLabel(service.code)}
                            background={colors.slateLight}
                            color={colors.slateDark}
                        />
                        <AppText variant="title">{serviceName(service)}</AppText>
                        <AppText variant="small">
                            {service.description || t('services.defaultDescription')}
                        </AppText>
                        {can('MISSION_CREATE') ? (
                            <Button
                                size="sm"
                                tone="secondary"
                                icon={Plus}
                                label={t('services.book')}
                                onPress={() =>
                                    router.push({
                                        pathname: '/customer/mission/create',
                                        params: {serviceId: String(service.id)},
                                    })
                                }
                            />
                        ) : null}
                    </Card>
                ))}
        </Screen>
    );
}

const styles = StyleSheet.create({
    topControls: {gap: spacing.sm},
    searchRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    filterBtn: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.md,
        borderRadius: radius.control,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.inputBorder,
    },
    filterBtnActive: {
        backgroundColor: colors.slate900,
        borderColor: colors.slate900,
    },
    filterBtnText: {color: colors.slateDark, fontWeight: '600'},
    filterBtnTextActive: {color: colors.white},
    filterDrawer: {gap: spacing.sm, padding: spacing.md},
    escrowBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.sm,
        paddingVertical: 7,
        borderRadius: radius.control,
        backgroundColor: colors.primaryLight,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.primarySoftBorder,
    },
    escrowText: {flex: 1, color: colors.slateDark, fontWeight: '600'},
    rfqInlineLink: {color: colors.primary, fontWeight: '700'},
    assistantBtn: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
    assistantBtnFallback: {
        backgroundColor: colors.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
    },
    pressed: {opacity: 0.72},
    flex: {flex: 1},
});
