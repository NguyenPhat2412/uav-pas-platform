import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import {Award, CheckCircle2, Layers, MapPin, Star, Store} from 'lucide-react-native';
import {MarketplaceListingCard} from '@/components/marketplace/catalog/MarketplaceListingCard';
import {
    AppText,
    Badge,
    Card,
    EmptyState,
    ErrorState,
    LoadingState,
    Screen,
    SectionTitle,
} from '@/components/ui';
import {usePublicProvider} from '@/hooks/marketplace/useMarketplaceCatalog';
import {useI18n} from '@/providers/I18nContext';
import {colors, radius, spacing} from '@/styles/tokens';

export function ProviderStorefrontScreen() {
    const {t, formatNumber} = useI18n();
    const {slug} = useLocalSearchParams<{ slug: string }>();
    const query = usePublicProvider(slug);

    if (query.isPending) {
        return (
            <Screen>
                <LoadingState label={t('services.loading')}/>
            </Screen>
        );
    }

    const storefront = query.data;
    if (query.isError || !storefront) {
        return (
            <Screen>
                <ErrorState
                    message={t('mobile.marketplace.storefrontNotFound')}
                    retryLabel={t('common.retry')}
                    onRetry={() => void query.refetch()}
                />
            </Screen>
        );
    }

    const {provider, listings, reviews} = storefront;

    return (
        <Screen
            onRefresh={() => void query.refetch()}
            refreshing={query.isRefetching}>
            <Card style={styles.shopBanner}>
                <View style={styles.topRow}>
                    <View style={styles.iconCircle}>
                        <Store size={24} color={colors.white}/>
                    </View>
                    <View style={styles.flex}>
                        <AppText variant="heading" style={styles.shopTitle}>
                            {provider.displayName}
                        </AppText>
                        <View style={styles.metaRow}>
                            <Badge
                                icon={CheckCircle2}
                                label={t('mobile.marketplace.verifiedPartnerBadge')}
                                background={colors.primaryLight}
                                color={colors.primary}
                            />
                            <View style={styles.metaChip}>
                                <MapPin size={13} color={colors.border}/>
                                <AppText variant="caption" style={styles.shopSub}>
                                    {provider.province} · {provider.serviceRadiusKm} km
                                </AppText>
                            </View>
                        </View>
                    </View>
                </View>

                {provider.bio ? (
                    <AppText variant="small" style={styles.shopBio}>
                        {provider.bio}
                    </AppText>
                ) : null}

                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Star size={15} color={colors.warning}/>
                        <AppText variant="title">
                            {provider.reviewCount > 0
                                ? Number(provider.ratingAvg).toFixed(1)
                                : '—'}
                        </AppText>
                        <AppText variant="caption">
                            {t('mobile.marketplace.reviewsShort', {
                                count: formatNumber(provider.reviewCount),
                            })}
                        </AppText>
                    </View>
                    <View style={styles.statBox}>
                        <Award size={15} color={colors.primary}/>
                        <AppText variant="title">
                            {formatNumber(provider.completedMissionsCount)}
                        </AppText>
                        <AppText variant="caption">
                            {t('mobile.marketplace.completedFlights')}
                        </AppText>
                    </View>
                </View>
            </Card>

            <SectionTitle
                title={t('mobile.marketplace.storefrontListings', {count: listings.length})}
            />
            {listings.length === 0 ? (
                <EmptyState icon={Layers} message={t('mobile.marketplace.emptyListings')}/>
            ) : (
                listings.map(item => <MarketplaceListingCard key={item.id} item={item}/>)
            )}

            {reviews.length > 0 ? (
                <>
                    <SectionTitle
                        title={t('mobile.marketplace.reviewsTitle', {count: reviews.length})}
                    />
                    {reviews.slice(0, 8).map(rev => (
                        <Card key={rev.id}>
                            <View style={styles.topRow}>
                                <AppText variant="small" style={styles.bold}>
                                    {rev.customerName}
                                </AppText>
                                <Badge
                                    icon={Star}
                                    label={`${rev.overallRating ?? 5}/5`}
                                    background={colors.warningLight}
                                    color={colors.warning}
                                />
                            </View>
                            {rev.comment ? <AppText variant="small">{rev.comment}</AppText> : null}
                        </Card>
                    ))}
                </>
            ) : null}
        </Screen>
    );
}

const styles = StyleSheet.create({
    shopBanner: {
        backgroundColor: colors.slate900,
        borderColor: colors.slateDark,
        gap: spacing.md,
    },
    topRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm},
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: radius.card,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
    },
    shopTitle: {color: colors.white},
    shopSub: {color: colors.border},
    shopBio: {color: colors.border},
    metaRow: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs, marginTop: 4},
    metaChip: {flexDirection: 'row', alignItems: 'center', gap: 4},
    statsRow: {flexDirection: 'row', gap: spacing.sm},
    statBox: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.control,
        padding: spacing.sm,
        alignItems: 'center',
        gap: 2,
    },
    bold: {fontWeight: '700', color: colors.text},
    flex: {flex: 1},
});
