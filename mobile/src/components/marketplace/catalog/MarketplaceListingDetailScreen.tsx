import React, {useState} from 'react';
import {Image, Pressable, StyleSheet, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {
    CheckCircle2,
    Clock3,
    MapPin,
    ShieldCheck,
    Star,
} from 'lucide-react-native';
import {
    LISTING_CATEGORY_ICONS,
    resolveListingCategoryIconName,
    resolveListingCoverSource,
} from '@/components/marketplace/catalog/listing-cover';
import {ListingSpecsAndReviews} from '@/components/marketplace/catalog/ListingSpecsAndReviews';
import {ListingStickyActionBar} from '@/components/marketplace/catalog/ListingStickyActionBar';
import {
    IllustrativeBadge,
    IllustrativeFooterNote,
} from '@/components/shared/IllustrativeDisclaimer';
import {
    AppText,
    Badge,
    Card,
    ErrorState,
    LoadingState,
    ScaledText,
    Screen,
    SectionTitle,
    TextField,
} from '@/components/ui';
import {usePublicListingDetail} from '@/hooks/useMarketplaceCatalog';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {
    estimateBookingSubtotal,
    formatVndCompact,
    listingTypeLabel,
    pricingUnitLabel,
} from '@/shared/forms/marketplace-forms';
import {displayLabel} from '@/shared/lib/presentation';
import {cleanDescriptionText, cleanEntityName} from '@/utils/clean-text';
import {colors, font, radius, spacing} from '@/styles/tokens';

export function MarketplaceListingDetailScreen() {
    const {t} = useI18n();
    const {status, can} = useAuth();
    const toast = useToast();
    const router = useRouter();
    const {slug} = useLocalSearchParams<{ slug: string }>();
    const query = usePublicListingDetail(slug);
    const [unitsInput, setUnitsInput] = useState('');

    if (query.isPending) {
        return (
            <Screen>
                <LoadingState label={t('services.loading')}/>
            </Screen>
        );
    }

    const listing = query.data?.listing;
    const reviews = query.data?.reviews ?? [];

    if (query.isError || !listing) {
        return (
            <Screen>
                <ErrorState
                    message={t('mobile.marketplace.listingNotFound')}
                    retryLabel={t('common.retry')}
                    onRetry={() => void query.refetch()}
                />
            </Screen>
        );
    }

    const minUnits = Number(listing.minBookingUnits || 1);
    const parsedUnits = unitsInput.trim() === '' ? minUnits : Number(unitsInput);
    const effectiveUnits =
        Number.isFinite(parsedUnits) && parsedUnits >= minUnits ? parsedUnits : minUnits;
    const subtotal = estimateBookingSubtotal(Number(listing.basePriceVnd), effectiveUnits, minUnits);
    const unitLabel = pricingUnitLabel(listing.pricingModel);
    const canBook = status !== 'signed-in' || can('MISSION_CREATE');
    const coverSource = resolveListingCoverSource(listing);
    const CategoryIcon = LISTING_CATEGORY_ICONS[resolveListingCategoryIconName(listing)];
    const presets = Array.from(
        new Set([
            minUnits,
            Math.max(minUnits * 2, 2),
            Math.max(minUnits * 5, 5),
            Math.max(minUnits * 10, 10),
        ]),
    );

    const handleSubscribeForProject = () => {
        if (status !== 'signed-in') {
            toast.show(t('mobile.shop.loginToBookToast'), 'info');
            router.push('/login');
            return;
        }
        router.push({
            pathname: '/customer/marketplace/subscribe',
            params: {slug: listing.slug, units: String(effectiveUnits)},
        });
    };

    const cleanTitle = cleanEntityName(listing.title);

    return (
        <View style={styles.root}>
            <Screen
                onRefresh={() => void query.refetch()}
                refreshing={query.isRefetching}
                contentStyle={styles.scrollPad}>
                <Card style={styles.coverCard}>
                    <View style={styles.coverWrap}>
                        {coverSource ? (
                            <Image
                                source={coverSource}
                                style={styles.coverImg}
                                resizeMode="cover"
                                accessibilityLabel={cleanTitle}
                            />
                        ) : (
                            <View style={styles.coverFallback}>
                                <CategoryIcon size={44} color={colors.primary} strokeWidth={1.8}/>
                            </View>
                        )}
                    </View>

                    <View style={styles.heroBody}>
                        <View style={styles.badgeRow}>
                            <Badge
                                label={listingTypeLabel(listing.listingType)}
                                background={colors.slateLight}
                                color={colors.slateDark}
                            />
                            <Badge
                                icon={listing.officialPlatformListing ? ShieldCheck : CheckCircle2}
                                label={
                                    listing.officialPlatformListing
                                        ? t('mobile.marketplace.officialBadge')
                                        : t('mobile.marketplace.verifiedPartnerBadge')
                                }
                                background={colors.primaryLight}
                                color={colors.primary}
                            />
                        </View>

                        <View style={styles.priceHeadRow}>
                            <AppText
                                variant="display"
                                style={styles.priceText}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.8}>
                                {formatVndCompact(listing.basePriceVnd)} / {unitLabel}
                            </AppText>
                            <IllustrativeBadge/>
                        </View>

                        <AppText variant="heading" numberOfLines={2}>
                            {cleanTitle}
                        </AppText>
                        {listing.summary ? (
                            <AppText variant="small">{cleanDescriptionText(listing.summary)}</AppText>
                        ) : null}

                        <View style={styles.metaRow}>
                            <View style={styles.metaItem}>
                                <Star size={14} color={colors.warning}/>
                                <AppText variant="caption" style={styles.bold} numberOfLines={1}>
                                    {(listing.providerBadge?.reviewCount ?? listing.reviewCount) > 0
                                        ? `${Number(listing.providerBadge?.ratingAvg ?? listing.ratingAvg).toFixed(1)} (${listing.providerBadge?.reviewCount ?? listing.reviewCount})`
                                        : t('mobile.marketplace.newListing')}
                                </AppText>
                            </View>
                            <View style={styles.metaItem}>
                                <MapPin size={14} color={colors.slate}/>
                                <AppText variant="caption" numberOfLines={1}>
                                    {listing.province} · {listing.serviceRadiusKm}km
                                </AppText>
                            </View>
                            <View style={styles.metaItem}>
                                <Clock3 size={14} color={colors.slate}/>
                                <AppText variant="caption" numberOfLines={1}>
                                    {listing.deliverySlaHours ?? 48}h
                                </AppText>
                            </View>
                            <Badge
                                label={displayLabel(listing.missionType)}
                                background={colors.slateLight}
                                color={colors.slateDark}
                            />
                        </View>
                    </View>
                </Card>

                <Card>
                    <SectionTitle title={t('mobile.marketplace.quickUnitsLabel')}/>
                    <View style={styles.presetRow}>
                        {presets.map(val => {
                            const active = effectiveUnits === val;
                            return (
                                <Pressable
                                    key={val}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${val} ${unitLabel}`}
                                    accessibilityState={{selected: active}}
                                    onPress={() => setUnitsInput(String(val))}
                                    style={({pressed}) => [
                                        styles.presetChip,
                                        active && styles.presetChipActive,
                                        pressed && styles.pressed,
                                    ]}>
                                    <ScaledText
                                        numberOfLines={1}
                                        style={[styles.presetText, active && styles.presetTextActive]}>
                                        {val} {unitLabel}
                                    </ScaledText>
                                </Pressable>
                            );
                        })}
                    </View>

                    <TextField
                        label={t('mobile.marketplace.unitsInputLabel', {unit: unitLabel, min: minUnits})}
                        required
                        keyboardType="decimal-pad"
                        value={unitsInput}
                        placeholder={String(minUnits)}
                        onChangeText={setUnitsInput}
                    />

                    <View style={styles.totalBox}>
                        <View style={styles.totalRow}>
                            <AppText variant="small" numberOfLines={1}>
                                {t('mobile.marketplace.estimatedEscrow')}
                            </AppText>
                            <View style={styles.subtotalInline}>
                                <AppText variant="title" style={styles.priceText} numberOfLines={1}>
                                    {formatVndCompact(subtotal)}
                                </AppText>
                                <IllustrativeBadge/>
                            </View>
                        </View>
                    </View>
                </Card>

                <ListingSpecsAndReviews listing={listing} reviews={reviews}/>
                <IllustrativeFooterNote/>
            </Screen>

            <ListingStickyActionBar
                priceLabel={formatVndCompact(subtotal)}
                hasShop={false}
                canBook={canBook}
                onChatPress={() => router.navigate('/customer/support')}
                onCheckoutPress={handleSubscribeForProject}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: {flex: 1, backgroundColor: colors.canvas},
    scrollPad: {paddingBottom: spacing.xl},
    coverCard: {padding: 0, overflow: 'hidden', gap: 0},
    coverWrap: {width: '100%', aspectRatio: 16 / 10, backgroundColor: colors.primaryLight},
    coverImg: {width: '100%', height: '100%'},
    coverFallback: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight},
    heroBody: {padding: spacing.md, gap: spacing.sm},
    badgeRow: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs},
    metaRow: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, paddingTop: 2},
    metaItem: {flexDirection: 'row', alignItems: 'center', gap: 4},
    priceHeadRow: {flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: spacing.xs},
    bold: {fontWeight: '700', color: colors.text},
    priceText: {color: colors.primary, fontWeight: '700'},
    presetRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    presetChip: {minHeight: 38, justifyContent: 'center', borderRadius: radius.control, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm},
    presetChipActive: {backgroundColor: colors.primary, borderColor: colors.primary},
    presetText: {fontSize: font.caption, fontWeight: '600', color: colors.text},
    presetTextActive: {color: colors.white},
    totalBox: {backgroundColor: colors.slateLight, borderRadius: radius.control, padding: spacing.md, gap: 4, borderWidth: 1, borderColor: colors.border},
    totalRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs},
    subtotalInline: {flexDirection: 'row', alignItems: 'center', gap: 6},
    pressed: {opacity: 0.75},
});
