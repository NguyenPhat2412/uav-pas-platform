'use client';

import {Button, OptionalMark, RequiredMark} from '@/components/ui';
import {IllustrativeBadge} from '@/components/marketplace/provider/IllustrativeDisclaimer';
import {LISTING_TYPE_CODES, PRICING_MODEL_CODES} from '@/forms/marketplace-forms';
import {useI18n} from '@/providers/I18nContext';
import type {
    ListingType,
    MarketplaceListingUpsertInput,
    PricingModel,
} from '@/types/marketplace.types';

const INPUT_CLASS =
    'h-11 w-full rounded-control border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-primary';

interface ProviderListingEditorFormProps {
    editingId: number | 'new' | 'template';
    form: MarketplaceListingUpsertInput;
    defaultServiceRadiusKm: number;
    isPending: boolean;
    onFormChange: (updater: (prev: MarketplaceListingUpsertInput) => MarketplaceListingUpsertInput) => void;
    onCancel: () => void;
    onSave: (submitForReview: boolean) => void;
}

export function ProviderListingEditorForm({
    editingId,
    form,
    defaultServiceRadiusKm,
    isPending,
    onFormChange,
    onCancel,
    onSave,
}: ProviderListingEditorFormProps) {
    const {t} = useI18n();

    return (
        <form
            onSubmit={e => {
                e.preventDefault();
                onSave(true);
            }}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
        >
            <div className="flex items-center justify-between gap-2">
                <h2 className="m-0 text-base font-semibold text-slate-900">
                    {editingId === 'template'
                        ? t('opsMarketplace.listings.actions.createFromTemplate')
                        : editingId === 'new'
                          ? t('opsMarketplace.listings.customCreate')
                          : t('opsMarketplace.listings.actions.edit')}
                </h2>
                <IllustrativeBadge/>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="grid gap-1 text-xs font-semibold text-slate-700 sm:col-span-2">
                    <span>
                        {t('opsMarketplace.listings.fields.title')}
                        <RequiredMark/>
                    </span>
                    <input
                        required
                        className={INPUT_CLASS}
                        value={form.title}
                        onChange={e => onFormChange(s => ({...s, title: e.target.value}))}
                    />
                </label>

                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    <span>
                        {t('opsMarketplace.listings.fields.listingType')}
                        <RequiredMark/>
                    </span>
                    <select
                        className={INPUT_CLASS}
                        value={form.listingType}
                        onChange={e => onFormChange(s => ({...s, listingType: e.target.value as ListingType}))}
                    >
                        {LISTING_TYPE_CODES.map(code => (
                            <option key={code} value={code}>
                                {t(`opsMarketplace.listings.types.${code}`)}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    <span>
                        {t('opsMarketplace.listings.fields.basePriceVnd')}
                        <RequiredMark/>
                    </span>
                    <input
                        required
                        type="number"
                        min={50000}
                        step={50000}
                        className={INPUT_CLASS}
                        value={form.basePriceVnd}
                        onChange={e => onFormChange(s => ({...s, basePriceVnd: Number(e.target.value)}))}
                    />
                </label>

                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    <span>
                        {t('opsMarketplace.listings.fields.pricingModel')}
                        <RequiredMark/>
                    </span>
                    <select
                        className={INPUT_CLASS}
                        value={form.pricingModel}
                        onChange={e => onFormChange(s => ({...s, pricingModel: e.target.value as PricingModel}))}
                    >
                        {PRICING_MODEL_CODES.map(code => (
                            <option key={code} value={code}>
                                {t(`opsMarketplace.listings.pricing.${code}`)}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    <span>
                        {t('opsMarketplace.listings.fields.minBookingUnits')}
                        <OptionalMark/>
                    </span>
                    <input
                        type="number"
                        min={1}
                        className={INPUT_CLASS}
                        value={form.minBookingUnits ?? 1}
                        onChange={e => onFormChange(s => ({...s, minBookingUnits: Number(e.target.value)}))}
                    />
                </label>

                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    <span>
                        {t('opsMarketplace.listings.fields.province')}
                        <RequiredMark/>
                    </span>
                    <input
                        required
                        className={INPUT_CLASS}
                        value={form.province}
                        onChange={e => onFormChange(s => ({...s, province: e.target.value}))}
                    />
                </label>

                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    <span>
                        {t('opsMarketplace.listings.fields.serviceRadiusKm')}
                        <OptionalMark/>
                    </span>
                    <input
                        type="number"
                        min={5}
                        max={2000}
                        className={INPUT_CLASS}
                        value={form.serviceRadiusKm ?? defaultServiceRadiusKm}
                        onChange={e => onFormChange(s => ({...s, serviceRadiusKm: Number(e.target.value)}))}
                    />
                </label>

                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    <span>
                        {t('opsMarketplace.listings.fields.deliveryHours')}
                        <OptionalMark/>
                    </span>
                    <input
                        type="number"
                        min={1}
                        className={INPUT_CLASS}
                        value={form.deliverySlaHours ?? 48}
                        onChange={e => onFormChange(s => ({...s, deliverySlaHours: Number(e.target.value)}))}
                    />
                </label>

                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    <span>
                        {t('opsMarketplace.listings.fields.equipmentSpecs')}
                        <OptionalMark/>
                    </span>
                    <input
                        className={INPUT_CLASS}
                        value={form.equipmentSpecs ?? ''}
                        onChange={e => onFormChange(s => ({...s, equipmentSpecs: e.target.value}))}
                    />
                </label>

                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    <span>
                        {t('opsMarketplace.listings.fields.deliverablesSummary')}
                        <OptionalMark/>
                    </span>
                    <input
                        className={INPUT_CLASS}
                        value={form.deliverablesSummary ?? ''}
                        onChange={e => onFormChange(s => ({...s, deliverablesSummary: e.target.value}))}
                    />
                </label>

                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    <span>
                        {t('opsMarketplace.listings.fields.coverImageUrl')}
                        <OptionalMark/>
                    </span>
                    <input
                        type="url"
                        className={INPUT_CLASS}
                        value={form.coverImageUrl ?? ''}
                        onChange={e => onFormChange(s => ({...s, coverImageUrl: e.target.value}))}
                        placeholder="https://..."
                    />
                </label>
            </div>

            <div className="flex flex-wrap justify-end gap-2.5 border-t border-slate-100 pt-4">
                <Button type="button" variant="secondary" onClick={onCancel}>
                    {t('opsMarketplace.common.cancel')}
                </Button>
                <Button type="button" variant="secondary" disabled={isPending} onClick={() => onSave(false)}>
                    {t('opsMarketplace.listings.actions.saveDraft')}
                </Button>
                <Button type="submit" disabled={isPending}>
                    {editingId === 'template'
                        ? t('opsMarketplace.listings.actions.createFromTemplate')
                        : t('opsMarketplace.listings.actions.submitReview')}
                </Button>
            </div>
        </form>
    );
}
