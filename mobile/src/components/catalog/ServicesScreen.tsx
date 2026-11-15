import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {Stack, useRouter} from 'expo-router';
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
    Sparkles,
    Star,
    Store,
} from 'lucide-react-native';
import {
    AppText,
    Badge,
    Button,
    Card,
    EmptyState,
    ErrorState,
    GlassSurface,
    LoadingState,
    Screen,
    SectionTitle,
    TextField,
} from '@/components/ui';
import {GlassSelectField, type GlassOption} from '@/components/ui/GlassSelect';
import {MarketplaceListingCard} from '@/components/marketplace/MarketplaceListingCard';
import {usePublicListings} from '@/hooks/marketplace/useMarketplaceCatalog';
import {useServices} from '@/hooks/mission/useCustomerMissions';
import {useSiteInfo} from '@/hooks/settings/useSiteInfo';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {displayLabel, serviceName} from '@/shared/lib/presentation';
import type {ListingSortOption, ListingType} from '@/shared/types/marketplace/marketplace.types';
import {colors, radius, spacing} from '@/styles/tokens';

type LeaseFilter = ListingType | 'ALL';

export function ServicesScreen() {
    const {t, formatNumber} = useI18n();
    const {can} = useAuth();
    const router = useRouter();
    const {rfqEnabled} = useSiteInfo();
    const [keyword, setKeyword] = useState('');
    const [leaseFilter, setLeaseFilter] = useState<LeaseFilter>('ALL');
    const [sortBy, setSortBy] = useState<ListingSortOption>('featured');
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

    const listings = listingsQuery.data?.content ?? [];
    const activeStandard = (services.data ?? []).filter(service => service.active);

    const handleRefresh = () => {
        void listingsQuery.refetch();
        void services.refetch();
    };

    return (
        <Screen
            onRefresh={handleRefresh}
            refreshing={listingsQuery.isRefetching || services.isRefetching}>
            <Stack.Screen options={{
                headerRight: () => (
                    <Pressable
                        onPress={() => router.push('/customer/assistant')}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={t('admin.assistant.open')}
                        style={({pressed}) => [pressed && styles.pressed]}>
                        <GlassSurface interactive style={styles.assistantBtn} fallback={styles.assistantBtnFallback}>
                            <AssistantMascot size={26}/>
                        </GlassSurface>
                    </Pressable>
                ),
            }}/>
            <GlassSurface style={styles.trustGlass} fallback={styles.trustFallback}>
                <View style={styles.trustHeader}>
                    <ShieldCheck size={18} color={colors.primary}/>
                    <AppText variant="title" style={styles.flex}>
                        {t('mobile.marketplace.trustTitle')}
                    </AppText>
                </View>
                <AppText variant="caption">{t('mobile.marketplace.trustSubtitle')}</AppText>
                <View style={styles.ctaRow}>
                    {rfqEnabled && can('MISSION_CREATE') ? (
                        <Button
                            size="sm"
                            icon={Megaphone}
                            label={t('mobile.marketplace.postRfq')}
                            onPress={() =>
                                router.push({
                                    pathname: '/customer/mission/create',
                                    params: {rfq: '1'},
                                })
                            }
                            style={styles.flex}
                        />
                    ) : null}
                    <Button
                        size="sm"
                        tone="secondary"
                        icon={Store}
                        label={t('mobile.provider.hubEntry')}
                        onPress={() => router.push('/customer/provider')}
                        style={styles.flex}
                    />
                </View>
            </GlassSurface>

            <Card>
                <TextField
                    placeholder={t('mobile.marketplace.searchPlaceholder')}
                    value={keyword}
                    onChangeText={setKeyword}
                    clearButtonMode="while-editing"
                />
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
    trustGlass: {
        borderRadius: radius.card,
        padding: spacing.md,
        gap: spacing.xs,
        borderWidth: 1,
        borderColor: colors.glassBorderSelected,
    },
    trustFallback: {backgroundColor: colors.glassSurfaceSelected},
    trustHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    ctaRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs},
    assistantBtn: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
    assistantBtnFallback: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border},
    pressed: {opacity: 0.78},
    flex: {flex: 1},
});
