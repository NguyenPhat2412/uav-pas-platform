import React from 'react';
import {StyleSheet, View} from 'react-native';
import {
    Compass,
    Database,
    Layers,
    Megaphone,
    Plane,
    ShieldCheck,
    Store,
    Video,
    type LucideIcon,
} from 'lucide-react-native';
import {AppText, Card, GlassSurface, LoadingState, SectionTitle, TextField} from '@/components/ui';
import {GlassSelectCards, GlassSelectField, type GlassOption} from '@/components/ui/GlassSelect';
import {usePublicListings} from '@/hooks/marketplace/useMarketplaceCatalog';
import {useSiteInfo} from '@/hooks/settings/useSiteInfo';
import {useI18n} from '@/providers/I18nContext';
import {
    estimateBookingSubtotal,
    formatVndCompact,
    pricingUnitLabel,
} from '@/shared/forms/marketplace/marketplace-forms';
import {
    missionTypeForService,
    missionTypes,
    type MissionFormErrors,
} from '@/shared/forms/mission/mission-form';
import {displayLabel, serviceName} from '@/shared/lib/presentation';
import type {MarketplaceListing} from '@/shared/types/marketplace/marketplace.types';
import type {MissionInput, MissionType, UavService} from '@/shared/types/mission/mission.types';
import {colors, radius, spacing} from '@/styles/tokens';

type BookingMode = 'STANDARD' | 'MARKETPLACE' | 'RFQ';

const MISSION_TYPE_ICON: Record<MissionType, LucideIcon> = {
    UAV_RENTAL: Plane,
    AREA_INSPECTION: Compass,
    AERIAL_RECORDING: Video,
    DATA_COLLECTION: Database,
    OTHER: Layers,
};

export function MissionBookingOptionsCard({
    form,
    errors,
    services,
    servicesLoading,
    initialListing,
    isEditing,
    onChange,
}: {
    form: MissionInput;
    errors: MissionFormErrors;
    services: UavService[];
    servicesLoading: boolean;
    initialListing?: MarketplaceListing | null;
    isEditing: boolean;
    onChange: (updater: (prev: MissionInput) => MissionInput) => void;
}) {
    const {t} = useI18n();
    const {rfqEnabled, invoiceDueDays, requireEscrowBeforeStart} = useSiteInfo();
    const catalogQuery = usePublicListings({size: 24}, !isEditing);

    const mode: BookingMode = form.openRfq
        ? 'RFQ'
        : form.listingId != null
          ? 'MARKETPLACE'
          : 'STANDARD';

    const allListings = React.useMemo(() => {
        const items = catalogQuery.data?.content ?? [];
        if (initialListing && !items.some(item => item.id === initialListing.id)) {
            return [initialListing, ...items];
        }
        return items;
    }, [catalogQuery.data?.content, initialListing]);

    const selectedListing =
        allListings.find(item => item.id === form.listingId) ?? initialListing ?? null;

    const selectListing = (listing: MarketplaceListing) => {
        const minUnits = Number(listing.minBookingUnits || 1);
        onChange(prev => ({
            ...prev,
            openRfq: false,
            listingId: listing.id,
            bookingUnits: Math.max(Number(prev.bookingUnits || minUnits), minUnits),
            serviceId: listing.categoryServiceId ?? undefined,
            missionType: listing.missionType,
            title: prev.title.trim() ? prev.title : listing.title,
        }));
    };

    const handleModeChange = (next: BookingMode) => {
        if (next === 'RFQ') {
            onChange(prev => ({
                ...prev,
                openRfq: true,
                listingId: undefined,
                bookingUnits: undefined,
            }));
            return;
        }
        if (next === 'MARKETPLACE') {
            const first = selectedListing ?? allListings[0];
            if (first) selectListing(first);
            return;
        }
        onChange(prev => ({
            ...prev,
            openRfq: false,
            listingId: undefined,
            bookingUnits: undefined,
        }));
    };

    const modeOptions: GlassOption<BookingMode>[] = [
        {
            value: 'STANDARD',
            label: t('mobile.booking.modeStandard'),
            description: t('mobile.booking.modeStandardDesc'),
            icon: Plane,
        },
        {
            value: 'MARKETPLACE',
            label: t('mobile.booking.modeMarketplace'),
            description: t('mobile.booking.modeMarketplaceDesc'),
            badge: 'Escrow',
            icon: Store,
        },
        ...(rfqEnabled
            ? [
                  {
                      value: 'RFQ' as const,
                      label: t('mobile.booking.modeRfq'),
                      description: t('mobile.booking.modeRfqDesc'),
                      icon: Megaphone,
                  },
              ]
            : []),
    ];

    const serviceOptions: GlassOption<string>[] = [
        {
            value: '',
            label: t('missionCreate.noService'),
            description: t('mobile.booking.customServiceDesc'),
            icon: Layers,
        },
        ...services
            .filter(item => item.active)
            .map(item => ({
                value: String(item.id),
                label: serviceName(item),
                description: displayLabel(missionTypeForService(item.code, 'OTHER')),
                badge: `${item.defaultDurationMinutes}p`,
                icon: MISSION_TYPE_ICON[missionTypeForService(item.code, 'OTHER')],
            })),
    ];

    const listingOptions: GlassOption<string>[] = allListings.map(item => ({
        value: String(item.id),
        label: item.title,
        description: item.province,
        badge: `${formatVndCompact(item.basePriceVnd)}/${pricingUnitLabel(item.pricingModel)}`,
        icon: Store,
    }));

    const missionTypeOptions: GlassOption<MissionType>[] = missionTypes.map(type => ({
        value: type,
        label: displayLabel(type),
        description: t(`mobile.booking.typeDesc.${type}`),
        icon: MISSION_TYPE_ICON[type],
    }));

    const minUnits = Number(selectedListing?.minBookingUnits || 1);
    const currentUnits = Number(form.bookingUnits ?? minUnits);
    const unitLabel = pricingUnitLabel(selectedListing?.pricingModel);
    const estimatedVnd = selectedListing
        ? estimateBookingSubtotal(Number(selectedListing.basePriceVnd), currentUnits, minUnits)
        : 0;

    return (
        <Card>
            <SectionTitle title={t('mobile.booking.optionsSectionTitle')}/>

            {!isEditing ? (
                <GlassSelectCards<BookingMode>
                    label={t('mobile.booking.modeLabel')} required
                    columns={modeOptions.length === 2 ? 2 : 1}
                    value={mode}
                    options={modeOptions}
                    onChange={handleModeChange}
                />
            ) : null}

            {!isEditing && mode === 'MARKETPLACE' ? (
                <View style={styles.subGroup}>
                    {catalogQuery.isPending && !allListings.length ? (
                        <LoadingState/>
                    ) : (
                        <GlassSelectField<string>
                            label={t('mobile.booking.packageSelectLabel')} required
                            sheetTitle={t('mobile.booking.packageSelectLabel')}
                            placeholder={t('mobile.booking.packagePlaceholder')}
                            value={selectedListing ? String(selectedListing.id) : ''}
                            options={listingOptions}
                            showTriggerDescription
                            onChange={val => {
                                const found = allListings.find(item => String(item.id) === val);
                                if (found) selectListing(found);
                            }}
                        />
                    )}
                    {selectedListing ? (
                        <GlassSurface style={styles.escrowPreview} fallback={styles.escrowFallback}>
                            <TextField
                                label={t('mobile.marketplace.unitsInputLabel', {
                                    unit: unitLabel,
                                    min: minUnits,
                                })} required
                                keyboardType="decimal-pad"
                                value={String(form.bookingUnits ?? minUnits)}
                                onChangeText={txt => {
                                    const num = Number(txt.replace(',', '.'));
                                    onChange(prev => ({
                                        ...prev,
                                        bookingUnits: Number.isFinite(num) && num > 0 ? num : minUnits,
                                    }));
                                }}
                            />
                            <View style={styles.escrowRow}>
                                <ShieldCheck size={16} color={colors.primary}/>
                                <AppText variant="small" style={styles.flex}>
                                    {t('mobile.marketplace.estimatedEscrow')}
                                </AppText>
                                <AppText variant="title" style={styles.price}>
                                    {formatVndCompact(estimatedVnd)}
                                </AppText>
                            </View>
                            <AppText variant="caption">
                                {requireEscrowBeforeStart
                                    ? t('mobile.booking.escrowRequiredHint', {days: invoiceDueDays})
                                    : t('mobile.marketplace.escrowDueHint', {days: invoiceDueDays})}
                            </AppText>
                        </GlassSurface>
                    ) : null}
                </View>
            ) : servicesLoading ? (
                <LoadingState/>
            ) : (
                <GlassSelectField<string>
                    label={t('missionCreate.serviceOptional')} optional
                    sheetTitle={t('missionCreate.serviceOptional')}
                    value={form.serviceId != null ? String(form.serviceId) : ''}
                    options={serviceOptions}
                    disabled={isEditing}
                    onChange={val => {
                        const found = services.find(item => String(item.id) === val);
                        onChange(prev => ({
                            ...prev,
                            serviceId: found?.id,
                            missionType: missionTypeForService(found?.code, prev.missionType),
                        }));
                    }}
                />
            )}

            <GlassSelectCards<MissionType>
                label={t('missions.type')} required
                columns={2}
                value={form.missionType}
                options={missionTypeOptions}
                error={errors.missionType ?? null}
                onChange={nextType => onChange(prev => ({...prev, missionType: nextType}))}
            />
        </Card>
    );
}

const styles = StyleSheet.create({
    subGroup: {gap: spacing.sm},
    escrowPreview: {
        borderRadius: radius.card,
        padding: spacing.md,
        gap: spacing.xs,
        borderWidth: 1,
        borderColor: colors.glassBorderSelected,
    },
    escrowFallback: {backgroundColor: colors.glassSurfaceSelected},
    escrowRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    price: {color: colors.primary, fontWeight: '700'},
    flex: {flex: 1},
});
