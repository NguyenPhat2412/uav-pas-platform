import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {CalendarClock, CheckCircle2, FolderKanban, Repeat} from 'lucide-react-native';
import {AppText, Card, ScaledText, SectionTitle, TextField} from '@/components/ui';
import {GlassSelectCards, type GlassOption} from '@/components/ui/GlassSelect';
import {useI18n} from '@/providers/I18nContext';
import {
    estimateBookingSubtotal,
    formatVndCompact,
    pricingUnitLabel,
} from '@/shared/forms/marketplace/marketplace-forms';
import type {MarketplaceListing} from '@/shared/types/marketplace/marketplace.types';
import type {ProjectScheduleType} from '@/shared/types/project/project.types';
import {colors, font, radius, spacing} from '@/styles/tokens';

export type WizardStep = 1 | 2 | 3;

export function isoDatePlusDays(days: number): string {
    const dt = new Date();
    dt.setDate(dt.getDate() + days);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export function SubscriptionWizardStepper({
    step,
    onSelectStep,
}: {
    step: WizardStep;
    onSelectStep: (target: WizardStep) => void;
}) {
    const {t} = useI18n();
    const steps: { id: WizardStep; label: string }[] = [
        {id: 1, label: t('mobile.overnight.subStep1')},
        {id: 2, label: t('mobile.overnight.subStep2')},
        {id: 3, label: t('mobile.overnight.subStep3')},
    ];

    return (
        <View style={styles.stepperRow}>
            {steps.map(item => {
                const active = item.id === step;
                const done = item.id < step;
                return (
                    <Pressable
                        key={item.id}
                        disabled={item.id > step}
                        accessibilityRole="tab"
                        accessibilityLabel={item.label}
                        accessibilityState={{selected: active}}
                        onPress={() => onSelectStep(item.id)}
                        style={[
                            styles.stepPill,
                            active && styles.stepPillActive,
                            done && styles.stepPillDone,
                        ]}>
                        {done ? <CheckCircle2 size={13} color={colors.primary}/> : null}
                        <ScaledText
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.82}
                            style={[
                                styles.stepLabel,
                                active && styles.stepLabelActive,
                                done && styles.stepLabelDone,
                            ]}>
                            {item.label}
                        </ScaledText>
                    </Pressable>
                );
            })}
        </View>
    );
}

/**
 * Step 3 of the Project Subscription Wizard: cadence (`ONCE` / `WEEKLY` / `MONTHLY`),
 * start date quick-chips + input, booking units, and illustrative subtotal card.
 */
export function SubscriptionScheduleConfirmCard({
    listing,
    projectName,
    scheduleType,
    onChangeSchedule,
    startDate,
    onChangeStartDate,
    unitsInput,
    onChangeUnits,
}: {
    listing: MarketplaceListing;
    projectName: string;
    scheduleType: ProjectScheduleType;
    onChangeSchedule: (next: ProjectScheduleType) => void;
    startDate: string;
    onChangeStartDate: (next: string) => void;
    unitsInput: string;
    onChangeUnits: (next: string) => void;
}) {
    const {t} = useI18n();
    const minUnits = Number(listing.minBookingUnits || 1);
    const parsedUnits = Number(unitsInput);
    const effectiveUnits =
        Number.isFinite(parsedUnits) && parsedUnits >= minUnits ? parsedUnits : minUnits;
    const subtotal = estimateBookingSubtotal(Number(listing.basePriceVnd), effectiveUnits, minUnits);
    const unitLabel = pricingUnitLabel(listing.pricingModel);

    const scheduleOptions: GlassOption<ProjectScheduleType>[] = [
        {value: 'ONCE', label: t('mobile.overnight.scheduleOnce'), icon: CalendarClock},
        {value: 'WEEKLY', label: t('mobile.overnight.scheduleWeekly'), icon: Repeat},
        {value: 'MONTHLY', label: t('mobile.overnight.scheduleMonthly'), icon: Repeat},
    ];

    const datePresets = [
        {label: t('mobile.overnight.dateToday'), value: isoDatePlusDays(0)},
        {label: t('mobile.overnight.dateTomorrow'), value: isoDatePlusDays(1)},
        {label: t('mobile.overnight.dateNextWeek'), value: isoDatePlusDays(7)},
    ];

    return (
        <>
            <Card>
                <GlassSelectCards<ProjectScheduleType>
                    label={t('mobile.overnight.scheduleTypeLabel')}
                    required
                    columns={1}
                    value={scheduleType}
                    options={scheduleOptions}
                    onChange={onChangeSchedule}
                />

                <View style={styles.presetRow}>
                    {datePresets.map(preset => {
                        const active = startDate === preset.value;
                        return (
                            <Pressable
                                key={preset.value}
                                accessibilityRole="button"
                                accessibilityLabel={preset.label}
                                onPress={() => onChangeStartDate(preset.value)}
                                style={[styles.chip, active && styles.chipActive]}>
                                <ScaledText
                                    numberOfLines={1}
                                    style={[styles.chipText, active && styles.chipTextActive]}>
                                    {preset.label}
                                </ScaledText>
                            </Pressable>
                        );
                    })}
                </View>

                <TextField
                    label={t('mobile.overnight.startDateLabel')}
                    required
                    placeholder="YYYY-MM-DD"
                    value={startDate}
                    onChangeText={onChangeStartDate}
                />

                <TextField
                    label={t('mobile.marketplace.unitsInputLabel', {unit: unitLabel, min: minUnits})}
                    required
                    keyboardType="decimal-pad"
                    value={unitsInput}
                    onChangeText={onChangeUnits}
                />
            </Card>

            <Card>
                <SectionTitle title={t('mobile.shop.summaryCardTitle')}/>
                <View style={styles.summaryRow}>
                    <FolderKanban size={16} color={colors.primary}/>
                    <AppText variant="title" style={styles.flex} numberOfLines={1}>
                        {projectName}
                    </AppText>
                </View>
                <AppText variant="small" numberOfLines={2}>
                    {listing.title}
                </AppText>
                <View style={styles.totalRow}>
                    <AppText variant="caption" numberOfLines={1}>
                        {t('mobile.shop.illustrativePrice')}
                    </AppText>
                    <AppText variant="heading" style={styles.price} numberOfLines={1}>
                        {formatVndCompact(subtotal)}
                    </AppText>
                </View>
            </Card>
        </>
    );
}

const styles = StyleSheet.create({
    stepperRow: {flexDirection: 'row', gap: spacing.xs},
    stepPill: {
        flex: 1,
        minHeight: 38,
        borderRadius: radius.control,
        backgroundColor: colors.slateLight,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingHorizontal: spacing.xs,
    },
    stepPillActive: {backgroundColor: colors.primary, borderColor: colors.primary},
    stepPillDone: {backgroundColor: colors.primaryLight, borderColor: colors.primarySoftBorder},
    stepLabel: {fontSize: font.caption, fontWeight: '600', color: colors.slateDark},
    stepLabelActive: {color: colors.white, fontWeight: '700'},
    stepLabelDone: {color: colors.primary, fontWeight: '700'},
    presetRow: {flexDirection: 'row', gap: spacing.xs},
    chip: {
        flex: 1,
        minHeight: 36,
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: colors.inputBorder,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xs,
    },
    chipActive: {backgroundColor: colors.primary, borderColor: colors.primary},
    chipText: {fontSize: font.caption, fontWeight: '600', color: colors.text},
    chipTextActive: {color: colors.white},
    summaryRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    totalRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        paddingTop: spacing.xs,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
    },
    price: {color: colors.primary, fontWeight: '700'},
    flex: {flex: 1},
});
