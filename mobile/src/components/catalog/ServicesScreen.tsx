import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {Stack, useLocalSearchParams, useRouter} from 'expo-router';
import {AssistantMascot} from '@/components/assistant/AssistantMascot';
import {
    ArrowUpDown, Award, Camera, Layers, Package, Plane, Plus, ShieldCheck, SlidersHorizontal, Sparkles, Star,
} from 'lucide-react-native';
import {IllustrativeFooterNote} from '@/components/shared/IllustrativeDisclaimer';
import {
    AppText, Badge, Button, Card, ChipGroup, EmptyState, ErrorState, GlassSurface, LoadingState, Screen, SectionTitle, TextField,
} from '@/components/ui';
import {GlassSelectField, type GlassOption} from '@/components/ui/GlassSelect';
import {MarketplaceListingGrid} from '@/components/marketplace/catalog/MarketplaceListingGrid';
import {usePublicListings} from '@/hooks/useMarketplaceCatalog';
import {useServices} from '@/hooks/useCustomerMissions';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {
    SERVICE_CATEGORIES,
    WEB_SERVICE_CATEGORIES,
} from '@/shared/lib/marketplace/service-categories';
import {displayLabel, serviceName} from '@/shared/lib/presentation';
import type {ListingSortOption, ListingType} from '@/shared/types/marketplace.types';
import type {MissionType} from '@/shared/types/mission.types';
import {colors, radius, spacing} from '@/styles/tokens';
import {cleanDescriptionText, cleanEntityName} from '@/utils/clean-text';

type LeaseFilter = ListingType | 'ALL';
const VALID_LEASE_FILTERS: readonly LeaseFilter[] = ['ALL', 'FLIGHT_SERVICE', 'WET_LEASE', 'DRY_LEASE'];
const VALID_MISSION_TYPES: readonly MissionType[] = [
    'AREA_INSPECTION',
    'DATA_COLLECTION',
    'AERIAL_RECORDING',
    'UAV_RENTAL',
];

export function ServicesScreen() {
    const {t, formatNumber} = useI18n();
    const {status, can} = useAuth();
    const router = useRouter();
    const params = useLocalSearchParams<{ q?: string; type?: string; category?: string }>();

    const requestedQ = typeof params.q === 'string' ? params.q : '';
    const requestedType: LeaseFilter = VALID_LEASE_FILTERS.includes(params.type as LeaseFilter)
        ? (params.type as LeaseFilter)
        : 'ALL';
    const requestedMission: MissionType | '' = VALID_MISSION_TYPES.includes(params.category as MissionType)
        ? (params.category as MissionType)
        : '';
    const paramSignature = `${requestedQ}|${requestedType}|${requestedMission}`;

    const [filterState, setFilterState] = useState<{
        sig: string;
        keyword: string;
        leaseFilter: LeaseFilter;
        missionFilter: MissionType | '';
    }>({
        sig: paramSignature,
        keyword: requestedQ,
        leaseFilter: requestedType,
        missionFilter: requestedMission,
    });

    const active =
        filterState.sig === paramSignature
            ? filterState
            : {
                  sig: paramSignature,
                  keyword: requestedQ,
                  leaseFilter: requestedType,
                  missionFilter: requestedMission,
              };

    const setKeyword = (keyword: string) =>
        setFilterState({...active, sig: paramSignature, keyword});
    const setLeaseFilter = (leaseFilter: LeaseFilter) =>
        setFilterState({
            ...active,
            sig: paramSignature,
            leaseFilter,
            missionFilter: leaseFilter === 'WET_LEASE' || leaseFilter === 'DRY_LEASE' ? '' : active.missionFilter,
        });
    const handleSelectCategoryKey = (key: string) => {
        if (key === 'all') {
            setFilterState({...active, sig: paramSignature, leaseFilter: 'ALL', missionFilter: ''});
            return;
        }
        const cat = SERVICE_CATEGORIES.find(item => item.key === key);
        if (!cat) return;
        setFilterState({
            ...active,
            sig: paramSignature,
            leaseFilter: cat.listingType ?? 'ALL',
            missionFilter: cat.missionType ?? '',
        });
    };

    const {keyword, leaseFilter, missionFilter} = active;
    const activeCategoryKey = missionFilter
        ? missionFilter
        : leaseFilter === 'WET_LEASE' || leaseFilter === 'DRY_LEASE'
          ? leaseFilter
          : 'all';

    const [sortBy, setSortBy] = useState<ListingSortOption>('featured');
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const [showStandard, setShowStandard] = useState(false);

    const listingsQuery = usePublicListings({
        keyword: keyword.trim() || undefined,
        listingType: leaseFilter === 'ALL' ? '' : leaseFilter,
        missionType: missionFilter || '',
        sortBy,
        size: 20,
    });
    const services = useServices();

    const leaseOptions: GlassOption<LeaseFilter>[] = [
        {value: 'ALL', label: t('mobile.marketplace.filterAll'), description: t('mobile.marketplace.filterAllDesc'), icon: Layers},
        {value: 'FLIGHT_SERVICE', label: t('mobile.marketplace.typeFlightService'), description: t('mobile.marketplace.typeFlightServiceDesc'), icon: Plane},
        {value: 'WET_LEASE', label: t('mobile.marketplace.typeWetLease'), description: t('mobile.marketplace.typeWetLeaseDesc'), icon: Award},
        {value: 'DRY_LEASE', label: t('mobile.marketplace.typeDryLease'), description: t('mobile.marketplace.typeDryLeaseDesc'), icon: Package},
    ];

    const sortOptions: GlassOption<ListingSortOption>[] = [
        {value: 'featured', label: t('mobile.marketplace.sortFeatured'), icon: Sparkles},
        {value: 'rating', label: t('mobile.marketplace.sortRating'), icon: Star},
        {value: 'price_asc', label: t('mobile.marketplace.sortPriceAsc'), icon: ArrowUpDown},
        {value: 'price_desc', label: t('mobile.marketplace.sortPriceDesc'), icon: ArrowUpDown},
    ];

    const categoryChips = WEB_SERVICE_CATEGORIES.map(cat => ({
        value: cat.key,
        label: t(cat.labelKey),
    }));
    const listings = listingsQuery.data?.content ?? [];
    const activeStandard = (services.data ?? []).filter(service => service.active);

    const handleRefresh = () => {
        void listingsQuery.refetch();
        if (status === 'signed-in') void services.refetch();
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
                    options={categoryChips}
                    value={activeCategoryKey}
                    onChange={handleSelectCategoryKey}
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
                    </Card>
                )}

                <View style={styles.escrowBar}>
                    <ShieldCheck size={15} color={colors.primary}/>
                    <AppText variant="caption" style={styles.escrowText} numberOfLines={1}>
                        {t('mobile.shop.escrowMicroHint')}
                    </AppText>
                </View>
            </View>

            <SectionTitle
                title={t('mobile.marketplace.catalogTitle', {
                    count: formatNumber(listingsQuery.data?.totalElements ?? listings.length),
                })}
            />

            {listingsQuery.isPending && !listings.length ? (
                <LoadingState label={t('services.loading')}/>
            ) : listingsQuery.isError && !listings.length ? (
                <ErrorState
                    message={t('services.loadError')}
                    retryLabel={t('common.retry')}
                    onRetry={() => void listingsQuery.refetch()}
                />
            ) : listings.length === 0 ? (
                <EmptyState
                    icon={Layers}
                    message={t('mobile.marketplace.emptyListings')}
                    action={
                        keyword.trim() || leaseFilter !== 'ALL' || Boolean(missionFilter) ? (
                            <Button
                                size="sm"
                                tone="secondary"
                                label={t('mobile.marketplace.filterAll')}
                                onPress={() =>
                                    setFilterState({
                                        sig: paramSignature,
                                        keyword: '',
                                        leaseFilter: 'ALL',
                                        missionFilter: '',
                                    })
                                }
                            />
                        ) : undefined
                    }
                />
            ) : (
                <MarketplaceListingGrid items={listings}/>
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
                        <AppText variant="title">{cleanEntityName(serviceName(service))}</AppText>
                        <AppText variant="small">
                            {cleanDescriptionText(service.description || t('services.defaultDescription'))}
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
            <IllustrativeFooterNote/>
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
    filterBtnActive: {backgroundColor: colors.slate900, borderColor: colors.slate900},
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
    assistantBtn: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
    assistantBtnFallback: {
        backgroundColor: colors.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
    },
    pressed: {opacity: 0.72},
    flex: {flex: 1},
});
