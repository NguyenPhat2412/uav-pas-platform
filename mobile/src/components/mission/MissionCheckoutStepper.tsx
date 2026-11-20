import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {CalendarClock, Check, MapPin, ShieldCheck, Store} from 'lucide-react-native';
import {AppText, Badge, Card} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import {
    estimateBookingSubtotal,
    formatVndCompact,
    pricingUnitLabel,
} from '@/shared/forms/marketplace/marketplace-forms';
import {displayLabel} from '@/shared/lib/presentation';
import type {MarketplaceListing} from '@/shared/types/marketplace/marketplace.types';
import type {MissionInput} from '@/shared/types/mission/mission.types';
import {colors, font, radius, spacing} from '@/styles/tokens';

export type CheckoutStep = 1 | 2 | 3;

/**
 * Interactive 3-step checkout progress header for the Flight Service booking wizard.
 */
export function MissionCheckoutStepper({
    step,
    onSelectStep,
}: {
    step: CheckoutStep;
    onSelectStep: (next: CheckoutStep) => void;
}) {
    const {t} = useI18n();
    const steps: { id: CheckoutStep; label: string }[] = [
        {id: 1, label: t('mobile.shop.step1Title')},
        {id: 2, label: t('mobile.shop.step2Title')},
        {id: 3, label: t('mobile.shop.step3Title')},
    ];

    return (
        <View style={styles.bar}>
            {steps.map(item => {
                const active = step === item.id;
                const done = step > item.id;
                return (
                    <Pressable
                        key={item.id}
                        accessibilityRole="tab"
                        accessibilityState={{selected: active}}
                        onPress={() => onSelectStep(item.id)}
                        style={({pressed}) => [
                            styles.stepPill,
                            active && styles.stepPillActive,
                            done && styles.stepPillDone,
                            pressed && styles.pressed,
                        ]}>
                        <View
                            style={[
                                styles.dot,
                                active && styles.dotActive,
                                done && styles.dotDone,
                            ]}>
                            {done ? (
                                <Check size={11} color={colors.white}/>
                            ) : (
                                <AppText
                                    variant="caption"
                                    style={[
                                        styles.dotNum,
                                        active && styles.dotNumActive,
                                    ]}>
                                    {item.id}
                                </AppText>
                            )}
                        </View>
                        <AppText
                            variant="caption"
                            style={[
                                styles.stepLabel,
                                active && styles.stepLabelActive,
                            ]}
                            numberOfLines={1}>
                            {item.label.replace(/^\d+\.\s*/, '')}
                        </AppText>
                    </Pressable>
                );
            })}
        </View>
    );
}

/**
 * Step 3 order review summary card displaying selected package/RFQ, location, schedule, and Escrow subtotal.
 */
export function MissionCheckoutSummaryCard({
    form,
    listing,
}: {
    form: MissionInput;
    listing?: MarketplaceListing | null;
}) {
    const {t, formatDate} = useI18n();
    const minUnits = Number(listing?.minBookingUnits || 1);
    const units = Math.max(Number(form.bookingUnits || minUnits), minUnits);
    const subtotal = listing
        ? estimateBookingSubtotal(Number(listing.basePriceVnd), units, minUnits)
        : null;
    const unitLabel = listing ? pricingUnitLabel(listing.pricingModel) : '';

    return (
        <Card style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
                <AppText variant="title">{t('mobile.shop.summaryCardTitle')}</AppText>
                <Badge
                    icon={ShieldCheck}
                    label={t('mobile.shop.mallBadge')}
                    background={colors.primaryLight}
                    color={colors.primary}
                />
            </View>

            <AppText variant="body" style={styles.bold}>
                {form.title.trim() || displayLabel(form.missionType)}
            </AppText>

            {listing ? (
                <View style={styles.row}>
                    <Store size={15} color={colors.slateDark}/>
                    <AppText variant="small" style={styles.flex} numberOfLines={1}>
                        {listing.title} · {units} {unitLabel}
                    </AppText>
                </View>
            ) : null}

            <View style={styles.row}>
                <MapPin size={15} color={colors.slateDark}/>
                <AppText variant="small" style={styles.flex}>
                    {form.locationName.trim() || t('mobile.shop.summaryLocationUnset')}
                </AppText>
            </View>

            <View style={styles.row}>
                <CalendarClock size={15} color={colors.slateDark}/>
                <AppText variant="small" style={styles.flex}>
                    {formatDate(form.startTime, {dateStyle: 'medium', timeStyle: 'short'})}
                </AppText>
            </View>

            {subtotal != null ? (
                <View style={styles.totalRow}>
                    <AppText variant="small">{t('mobile.marketplace.estimatedEscrow')}</AppText>
                    <AppText variant="title" style={styles.price}>
                        {formatVndCompact(subtotal)}
                    </AppText>
                </View>
            ) : null}
        </Card>
    );
}

const styles = StyleSheet.create({
    bar: {flexDirection: 'row', gap: spacing.xs},
    stepPill: {
        flex: 1,
        minHeight: 40,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: spacing.xs,
        borderRadius: radius.control,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    stepPillActive: {
        backgroundColor: colors.slate900,
        borderColor: colors.slate900,
    },
    stepPillDone: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primarySoftBorder,
    },
    dot: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: colors.slateLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dotActive: {backgroundColor: colors.primary},
    dotDone: {backgroundColor: colors.primary},
    dotNum: {fontSize: 11, fontWeight: '700', color: colors.slateDark},
    dotNumActive: {color: colors.white},
    stepLabel: {fontSize: font.caption, fontWeight: '600', color: colors.slateDark, flexShrink: 1},
    stepLabelActive: {color: colors.white, fontWeight: '700'},
    summaryCard: {
        backgroundColor: colors.surface,
        borderColor: colors.primarySoftBorder,
        borderWidth: 1,
        gap: spacing.sm,
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.xs,
    },
    row: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    totalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
    },
    bold: {fontWeight: '700', color: colors.text},
    price: {color: colors.primary, fontWeight: '700'},
    flex: {flex: 1},
    pressed: {opacity: 0.75},
});
