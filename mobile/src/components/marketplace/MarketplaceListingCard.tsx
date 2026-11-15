import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {Building2, CheckCircle2, MapPin, Plus, ShieldCheck, Star} from 'lucide-react-native';
import {AppText, Badge, Button, Card} from '@/components/ui';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {
    formatVndCompact,
    listingTypeLabel,
    pricingUnitLabel,
} from '@/shared/forms/marketplace/marketplace-forms';
import type {MarketplaceListing} from '@/shared/types/marketplace/marketplace.types';
import {colors, radius, spacing} from '@/styles/tokens';

export function MarketplaceListingCard({item}: { item: MarketplaceListing }) {
    const {t} = useI18n();
    const {can} = useAuth();
    const router = useRouter();
    const unit = pricingUnitLabel(item.pricingModel);
    const minUnits = Number(item.minBookingUnits || 1);

    return (
        <Card
            onPress={() =>
                router.push({
                    pathname: '/customer/marketplace/[slug]',
                    params: {slug: item.slug},
                })
            }
            accessibilityLabel={`${item.title} ${formatVndCompact(item.basePriceVnd)}`}>
            <View style={styles.badgeRow}>
                <Badge
                    label={listingTypeLabel(item.listingType)}
                    background={colors.slateLight}
                    color={colors.slateDark}
                />
                <Badge
                    icon={item.officialPlatformListing ? ShieldCheck : CheckCircle2}
                    label={
                        item.officialPlatformListing
                            ? t('mobile.marketplace.officialBadge')
                            : t('mobile.marketplace.verifiedPartnerBadge')
                    }
                    background={colors.primaryLight}
                    color={colors.primary}
                />
            </View>

            <AppText variant="title" numberOfLines={2}>
                {item.title}
            </AppText>
            {item.summary ? (
                <AppText variant="small" numberOfLines={1}>
                    {item.summary}
                </AppText>
            ) : null}

            <View style={styles.metaWrap}>
                <View style={styles.metaChip}>
                    <Building2 size={13} color={colors.slateDark}/>
                    <AppText variant="caption" numberOfLines={1}>
                        {item.providerDisplayName}
                    </AppText>
                </View>
                <View style={styles.metaChip}>
                    <MapPin size={13} color={colors.slate}/>
                    <AppText variant="caption" numberOfLines={1}>
                        {item.province} · {item.serviceRadiusKm} km
                    </AppText>
                </View>
                <View style={styles.metaChip}>
                    <Star size={13} color={colors.warning}/>
                    <AppText variant="caption">
                        {item.reviewCount > 0
                            ? `${Number(item.ratingAvg).toFixed(1)} (${item.reviewCount})`
                            : t('mobile.marketplace.newListing')}
                    </AppText>
                </View>
            </View>

            {item.equipmentSpecs ? (
                <View style={styles.equipBox}>
                    <AppText variant="caption" numberOfLines={1}>
                        {item.equipmentSpecs}
                    </AppText>
                </View>
            ) : null}

            <View style={styles.priceFooter}>
                <View style={styles.flex}>
                    <AppText variant="title" style={styles.priceText}>
                        {formatVndCompact(item.basePriceVnd)} / {unit}
                    </AppText>
                    <AppText variant="caption">
                        {t('mobile.marketplace.minUnits', {units: minUnits, unit})}
                    </AppText>
                </View>
                {can('MISSION_CREATE') ? (
                    <Button
                        size="sm"
                        icon={Plus}
                        label={t('mobile.marketplace.bookNow')}
                        onPress={() =>
                            router.push({
                                pathname: '/customer/mission/create',
                                params: {
                                    listingSlug: item.slug,
                                    units: String(minUnits),
                                },
                            })
                        }
                    />
                ) : null}
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.xs,
    },
    metaWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
    metaChip: {flexDirection: 'row', alignItems: 'center', gap: 4},
    equipBox: {
        backgroundColor: colors.slateLight,
        borderRadius: radius.control,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    priceFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingTop: spacing.xs,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
    },
    priceText: {color: colors.primary, fontWeight: '700'},
    flex: {flex: 1},
});
