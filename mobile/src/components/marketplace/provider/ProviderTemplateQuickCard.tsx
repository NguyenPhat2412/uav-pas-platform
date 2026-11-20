import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Layers, Send, Tag} from 'lucide-react-native';
import {Button, TextField} from '@/components/ui';
import {GlassSelectField, type GlassOption} from '@/components/ui/GlassSelect';
import {useServices} from '@/hooks/mission/useCustomerMissions';
import {type CreateListingFromTemplateInput} from '@/hooks/marketplace/useProviderStudio';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {PRICING_MODEL_OPTIONS} from '@/shared/forms/marketplace/marketplace-forms';
import type {PricingModel} from '@/shared/types/marketplace/marketplace.types';
import {spacing} from '@/styles/tokens';

/**
 * Quick listing creation from platform `ServiceOffering` templates
 * (`POST /api/v1/marketplace/provider/listings/from-template`, CONTRACT.md §3).
 */
export function ProviderTemplateQuickCard({
    defaultProvince,
    defaultRadiusKm,
    loading,
    onSubmit,
}: {
    defaultProvince: string;
    defaultRadiusKm: number;
    loading: boolean;
    onSubmit: (payload: CreateListingFromTemplateInput) => void;
}) {
    const {t} = useI18n();
    const toast = useToast();
    const servicesQuery = useServices();
    const [templateId, setTemplateId] = useState('');
    const [pricingModel, setPricingModel] = useState<PricingModel>('PER_HOUR');
    const [basePriceVnd, setBasePriceVnd] = useState('2500000');
    const [province, setProvince] = useState(defaultProvince);

    const services = servicesQuery.data ?? [];
    const templateOptions: GlassOption<string>[] = services.map(svc => ({
        value: String(svc.id),
        label: svc.name,
        description: svc.code,
        icon: Layers,
    }));

    const pricingOptions: GlassOption<PricingModel>[] = PRICING_MODEL_OPTIONS.map(opt => ({
        value: opt.value,
        label: opt.label,
        badge: `/${opt.unitShort}`,
        icon: Tag,
    }));

    const handleSubmit = () => {
        const parsedId = Number(templateId || services[0]?.id || 0);
        if (!parsedId) {
            toast.show(t('mobile.provider.saveError'), 'error');
            return;
        }
        onSubmit({
            serviceOfferingId: parsedId,
            province: province.trim() || defaultProvince,
            serviceRadiusKm: defaultRadiusKm,
            pricingModel,
            basePriceVnd: Math.max(100_000, Number(basePriceVnd) || 2_500_000),
            submitForReview: true,
        });
    };

    return (
        <View style={styles.stack}>
            <GlassSelectField<string>
                label={t('mobile.overnight.templateSelectLabel')}
                required
                placeholder={t('mobile.overnight.templateSelectPlaceholder')}
                sheetTitle={t('mobile.overnight.templateSelectLabel')}
                value={templateId || (services[0] ? String(services[0].id) : '')}
                options={templateOptions}
                onChange={setTemplateId}
            />
            <GlassSelectField<PricingModel>
                label={t('mobile.provider.pricingModelLabel')}
                required
                sheetTitle={t('mobile.provider.pricingModelLabel')}
                value={pricingModel}
                options={pricingOptions}
                onChange={setPricingModel}
            />
            <View style={styles.row}>
                <View style={styles.flex}>
                    <TextField
                        label={t('mobile.provider.basePriceLabel')}
                        required
                        keyboardType="number-pad"
                        value={basePriceVnd}
                        onChangeText={setBasePriceVnd}
                    />
                </View>
                <View style={styles.flex}>
                    <TextField
                        label={t('mobile.overnight.projectProvinceLabel')}
                        optional
                        value={province}
                        onChangeText={setProvince}
                    />
                </View>
            </View>
            <Button
                icon={Send}
                loading={loading}
                label={t('mobile.provider.publishListingBtn')}
                onPress={handleSubmit}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    stack: {gap: spacing.sm},
    row: {flexDirection: 'row', gap: spacing.sm},
    flex: {flex: 1},
});
