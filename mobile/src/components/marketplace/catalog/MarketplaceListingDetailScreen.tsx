import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {
    Building2,
    CheckCircle2,
    ChevronRight,
    Clock3,
    MapPin,
    Plus,
    ShieldCheck,
    Star,
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
    ScaledText,
    Screen,
    SectionTitle,
    TextField,
} from '@/components/ui';
import {usePublicListingDetail} from '@/hooks/marketplace/useMarketplaceCatalog';
import {useSiteInfo} from '@/hooks/settings/useSiteInfo';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {
    estimateBookingSubtotal,
    formatVndCompact,
    listingTypeLabel,
    pricingUnitLabel,
} from '@/shared/forms/marketplace/marketplace-forms';
import {displayLabel} from '@/shared/lib/presentation';
import {colors, font, radius, spacing} from '@/styles/tokens';

export function MarketplaceListingDetailScreen() {
    const {t, formatDate} = useI18n();
    const {can} = useAuth();
    const router = useRouter();
    const {slug} = useLocalSearchParams<{ slug: string }>();
    const {invoiceDueDays, rfqEnabled} = useSiteInfo();
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
    const presets = Array.from(
        new Set([
            minUnits,
            Math.max(minUnits * 2, 2),
            Math.max(minUnits * 5, 5),
            Math.max(minUnits * 10, 10),
        ]),
    );

    return (
        <Screen
            onRefresh={() => void query.refetch()}
            refreshing={query.isRefetching}>
            <Card>
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

                <AppText variant="heading">{listing.title}</AppText>
                {listing.summary ? <AppText variant="small">{listing.summary}</AppText> : null}

                {listing.providerSlug ? (
                    <Pressable
                        accessibilityRole="button"
                        onPress={() =>
                            router.push({
                                pathname: '/customer/providers/[slug]',
                                params: {slug: listing.providerSlug!},
                            })
                        }
                        style={({pressed}) => [styles.providerRow, pressed && styles.pressed]}>
                        <Building2 size={16} color={colors.primary}/>
                        <AppText variant="small" style={styles.providerLink}>
                            {listing.providerDisplayName}
                        </AppText>
                        <ChevronRight size={16} color={colors.muted}/>
                    </Pressable>
                ) : (
                    <View style={styles.providerRow}>
                        <Building2 size={16} color={colors.primary}/>
                        <AppText variant="small" style={styles.providerStatic}>
                            {listing.providerDisplayName}
                        </AppText>
                    </View>
                )}

                <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                        <MapPin size={14} color={colors.slate}/>
                        <AppText variant="caption">
                            {listing.province} ({listing.serviceRadiusKm} km)
                        </AppText>
                    </View>
                    <View style={styles.metaItem}>
                        <Clock3 size={14} color={colors.slate}/>
                        <AppText variant="caption">
                            SLA {listing.onSiteSlaHours ?? 24}h / {listing.deliverySlaHours ?? 48}h
                        </AppText>
                    </View>
                    <View style={styles.metaItem}>
                        <Star size={14} color={colors.warning}/>
                        <AppText variant="caption">
                            {listing.reviewCount > 0
                                ? `${Number(listing.ratingAvg).toFixed(1)} (${listing.reviewCount})`
                                : t('mobile.marketplace.newListing')}
                        </AppText>
                    </View>
                </View>

                {listing.description ? (
                    <View style={styles.sectionBlock}>
                        <AppText variant="small" style={styles.bold}>
                            {t('mobile.marketplace.scopeTitle')}
                        </AppText>
                        <AppText variant="small">{listing.description}</AppText>
                    </View>
                ) : null}
            </Card>

            <GlassSurface style={styles.calcGlass} fallback={styles.calcFallback}>
                <AppText variant="caption">{displayLabel(listing.missionType)}</AppText>
                <AppText variant="heading" style={styles.priceText}>
                    {formatVndCompact(listing.basePriceVnd)} / {unitLabel}
                </AppText>

                <AppText variant="caption">{t('mobile.marketplace.quickUnitsLabel')}</AppText>
                <View style={styles.presetRow}>
                    {presets.map(val => {
                        const active = effectiveUnits === val;
                        return (
                            <Pressable
                                key={val}
                                accessibilityRole="button"
                                accessibilityState={{selected: active}}
                                onPress={() => setUnitsInput(String(val))}
                                style={({pressed}) => [
                                    styles.presetChip,
                                    active && styles.presetChipActive,
                                    pressed && styles.pressed,
                                ]}>
                                <ScaledText
                                    style={[
                                        styles.presetText,
                                        active && styles.presetTextActive,
                                    ]}>
                                    {val} {unitLabel}
                                </ScaledText>
                            </Pressable>
                        );
                    })}
                </View>

                <TextField
                    label={t('mobile.marketplace.unitsInputLabel', {unit: unitLabel, min: minUnits})} required
                    keyboardType="decimal-pad"
                    value={unitsInput}
                    placeholder={String(minUnits)}
                    onChangeText={setUnitsInput}
                />

                <View style={styles.totalBox}>
                    <View style={styles.totalRow}>
                        <AppText variant="small">{t('mobile.marketplace.estimatedEscrow')}</AppText>
                        <AppText variant="title" style={styles.priceText}>
                            {formatVndCompact(subtotal)}
                        </AppText>
                    </View>
                    <AppText variant="caption">
                        {t('mobile.marketplace.escrowDueHint', {days: invoiceDueDays})}
                    </AppText>
                </View>

                {can('MISSION_CREATE') ? (
                    <View style={styles.actionsCol}>
                        <Button
                            icon={Plus}
                            label={t('mobile.marketplace.bookPackageCta')}
                            onPress={() =>
                                router.push({
                                    pathname: '/customer/mission/create',
                                    params: {
                                        listingSlug: listing.slug,
                                        units: String(effectiveUnits),
                                    },
                                })
                            }
                        />
                        {rfqEnabled ? (
                            <Button
                                tone="secondary"
                                size="sm"
                                label={t('mobile.marketplace.needCustomQuote')}
                                onPress={() =>
                                    router.push({
                                        pathname: '/customer/mission/create',
                                        params: {rfq: '1'},
                                    })
                                }
                            />
                        ) : null}
                    </View>
                ) : null}
            </GlassSurface>

            <Card>
                <SectionTitle title={t('mobile.marketplace.specsAndDeliverables')}/>
                <AppText variant="small" style={styles.bold}>
                    {t('mobile.marketplace.equipmentLabel')}
                </AppText>
                <AppText variant="small">
                    {listing.equipmentSpecs || t('mobile.marketplace.defaultEquipment')}
                </AppText>
                <AppText variant="small" style={styles.bold}>
                    {t('mobile.marketplace.deliverablesLabel')}
                </AppText>
                <AppText variant="small">
                    {listing.deliverablesSummary || t('mobile.marketplace.defaultDeliverables')}
                </AppText>
            </Card>

            <SectionTitle title={t('mobile.marketplace.reviewsTitle', {count: reviews.length})}/>
            {reviews.length === 0 ? (
                <EmptyState icon={Star} message={t('mobile.marketplace.noReviews')}/>
            ) : (
                reviews.map(rev => (
                    <Card key={rev.id}>
                        <View style={styles.badgeRow}>
                            <AppText variant="small" style={styles.bold}>
                                {rev.customerName} · {rev.missionTitle}
                            </AppText>
                            <Badge icon={Star} label={`${rev.overallRating ?? 5}/5`} background={colors.warningLight} color={colors.warning}/>
                        </View>
                        {rev.comment ? <AppText variant="small">{rev.comment}</AppText> : null}
                        {rev.updatedAt ? <AppText variant="caption">{formatDate(rev.updatedAt, {dateStyle: 'medium'})}</AppText> : null}
                    </Card>
                ))
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    badgeRow: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs},
    providerRow: {minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs},
    providerLink: {flex: 1, fontWeight: '700', color: colors.primary},
    providerStatic: {flex: 1, fontWeight: '700', color: colors.text},
    metaRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
    metaItem: {flexDirection: 'row', alignItems: 'center', gap: 4},
    sectionBlock: {gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border},
    bold: {fontWeight: '700', color: colors.text},
    calcGlass: {borderRadius: radius.card, padding: spacing.md, gap: spacing.sm, borderWidth: 1.5, borderColor: colors.glassBorderSelected},
    calcFallback: {backgroundColor: colors.glassSurfaceSelected},
    priceText: {color: colors.primary, fontWeight: '700'},
    presetRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    presetChip: {minHeight: 38, justifyContent: 'center', borderRadius: radius.control, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm},
    presetChipActive: {backgroundColor: colors.primary, borderColor: colors.primary},
    presetText: {fontSize: font.caption, fontWeight: '600', color: colors.text},
    presetTextActive: {color: colors.white},
    totalBox: {backgroundColor: colors.surface, borderRadius: radius.control, padding: spacing.sm, gap: 4, borderWidth: 1, borderColor: colors.border},
    totalRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    actionsCol: {gap: spacing.xs},
    pressed: {opacity: 0.75},
});
