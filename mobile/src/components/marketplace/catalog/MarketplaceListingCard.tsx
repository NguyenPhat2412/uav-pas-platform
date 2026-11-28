import React from 'react';
import {Image, StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {
    CheckCircle2,
    Clock3,
    MapPin,
    Star,
} from 'lucide-react-native';
import {
    LISTING_CATEGORY_ICONS,
    resolveListingCategoryIconName,
    resolveListingCoverSource,
} from '@/components/marketplace/catalog/listing-cover';
import {IllustrativeBadge} from '@/components/shared/IllustrativeDisclaimer';
import {AppText, Card, ScaledText} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import {
    formatVndCompact,
    pricingUnitLabel,
} from '@/shared/forms/marketplace-forms';
import type {MarketplaceListing} from '@/shared/types/marketplace.types';
import {cleanEntityName} from '@/utils/clean-text';
import {colors, font, spacing} from '@/styles/tokens';

/**
 * Shopee-style Flight Service Card (UI-GUIDE §3.2):
 * - 4:3 cover image (`coverImageUrl` / bundled WebP / `primaryLight` + Lucide icon)
 * - Max 2-line title (`numberOfLines={2}`)
 * - 1-line icon meta row, red price + "minh hoạ" caption, verified badge + rating
 * - Zero fleet/provider name exposed
 */
export function MarketplaceListingCard({
    item,
    compact = false,
}: {
    item: MarketplaceListing;
    compact?: boolean;
}) {
    const {t} = useI18n();
    const router = useRouter();
    const unit = pricingUnitLabel(item.pricingModel);
    const CategoryIcon = LISTING_CATEGORY_ICONS[resolveListingCategoryIconName(item)];
    const coverSource = resolveListingCoverSource(item);
    const ratingAvg = Number(item.providerBadge?.ratingAvg ?? item.ratingAvg ?? 0);
    const reviewCount = Number(item.providerBadge?.reviewCount ?? item.reviewCount ?? 0);
    const deliveryHours = item.deliverySlaHours ?? 48;
    const cleanTitle = cleanEntityName(item.title);

    return (
        <Card
            style={[styles.card, compact && styles.cardCompact]}
            onPress={() =>
                router.push({
                    pathname: '/customer/marketplace/[slug]',
                    params: {slug: item.slug},
                })
            }
            accessibilityLabel={`${cleanTitle} ${formatVndCompact(item.basePriceVnd)}`}>
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
                        <CategoryIcon size={compact ? 28 : 34} color={colors.primary} strokeWidth={1.8}/>
                    </View>
                )}
            </View>

            <View style={[styles.body, compact && styles.bodyCompact]}>
                <AppText variant="title" style={compact ? styles.titleCompact : undefined} numberOfLines={2}>
                    {cleanTitle}
                </AppText>

                <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                        <MapPin size={13} color={colors.slate}/>
                        <AppText variant="caption" numberOfLines={1} style={styles.shrink}>
                            {item.province}
                        </AppText>
                    </View>
                    <View style={styles.metaItem}>
                        <Clock3 size={13} color={colors.slate}/>
                        <AppText variant="caption" numberOfLines={1}>
                            {deliveryHours}h
                        </AppText>
                    </View>
                </View>

                <View style={styles.priceBlock}>
                    <ScaledText
                        style={styles.priceText}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.82}>
                        {formatVndCompact(item.basePriceVnd)}/{unit}
                    </ScaledText>
                    <IllustrativeBadge/>
                </View>

                <View style={styles.verifiedRow}>
                    <CheckCircle2 size={12} color={colors.primary}/>
                    <AppText variant="caption" style={styles.verifiedLabel} numberOfLines={1}>
                        {t('mobile.marketplace.verifiedPartnerBadge')}
                    </AppText>
                    {reviewCount > 0 ? (
                        <View style={styles.ratingInline}>
                            <Star size={11} color={colors.warning}/>
                            <AppText variant="caption" style={styles.ratingText} numberOfLines={1}>
                                {ratingAvg.toFixed(1)}
                            </AppText>
                        </View>
                    ) : null}
                </View>
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {padding: 0, overflow: 'hidden', gap: 0},
    cardCompact: {flex: 1},
    coverWrap: {
        width: '100%',
        aspectRatio: 4 / 3,
        backgroundColor: colors.primaryLight,
        overflow: 'hidden',
    },
    coverImg: {width: '100%', height: '100%'},
    coverFallback: {
        flex: 1,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    body: {padding: spacing.md, gap: 6},
    bodyCompact: {padding: spacing.sm, gap: 5},
    titleCompact: {fontSize: font.body, lineHeight: 20},
    metaRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    metaItem: {flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1},
    shrink: {flexShrink: 1},
    priceBlock: {flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2},
    priceText: {fontSize: font.body, color: colors.primary, fontWeight: '700', flexShrink: 1},
    verifiedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingTop: 6,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
    },
    verifiedLabel: {color: colors.slateDark, fontWeight: '600', flexShrink: 1},
    ratingInline: {flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 'auto'},
    ratingText: {color: colors.text, fontWeight: '600'},
});
