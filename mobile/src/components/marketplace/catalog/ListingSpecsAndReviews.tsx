import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Star} from 'lucide-react-native';
import {AppText, Badge, Card, EmptyState, SectionTitle} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import type {MarketplaceListing, MarketplaceReview} from '@/shared/types/marketplace/marketplace.types';
import {colors, spacing} from '@/styles/tokens';

/**
 * Equipment specs, deliverables summary, and customer review list for a Flight Service listing.
 */
export function ListingSpecsAndReviews({
    listing,
    reviews,
}: {
    listing: MarketplaceListing;
    reviews: MarketplaceReview[];
}) {
    const {t, formatDate} = useI18n();

    return (
        <>
            <Card>
                <SectionTitle title={t('mobile.marketplace.specsAndDeliverables')}/>
                {listing.description ? (
                    <View style={styles.sectionBlock}>
                        <AppText variant="small" style={styles.bold}>
                            {t('mobile.marketplace.scopeTitle')}
                        </AppText>
                        <AppText variant="small">{listing.description}</AppText>
                    </View>
                ) : null}
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
                            <Badge
                                icon={Star}
                                label={`${rev.overallRating ?? 5}/5`}
                                background={colors.warningLight}
                                color={colors.warning}
                            />
                        </View>
                        {rev.comment ? <AppText variant="small">{rev.comment}</AppText> : null}
                        {rev.updatedAt ? (
                            <AppText variant="caption">
                                {formatDate(rev.updatedAt, {dateStyle: 'medium'})}
                            </AppText>
                        ) : null}
                    </Card>
                ))
            )}
        </>
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
    sectionBlock: {
        gap: spacing.xs,
        paddingBottom: spacing.xs,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    bold: {fontWeight: '700', color: colors.text},
});
