'use client';

import {MapPin} from 'lucide-react';
import {Button, OptionalMark, RequiredMark} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import type {ProviderOnboardingInput} from '@/types/marketplace.types';

const INPUT_CLASS =
    'h-11 w-full rounded-control border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-primary';

interface ProviderOnboardingAreaStepProps {
    form: ProviderOnboardingInput;
    defaultServiceRadiusKm: number;
    isPending: boolean;
    onFormChange: (updater: (prev: ProviderOnboardingInput) => ProviderOnboardingInput) => void;
    onBack: () => void;
    onSave: (submitForReview: boolean) => void;
}

export function ProviderOnboardingAreaStep({
    form,
    defaultServiceRadiusKm,
    isPending,
    onFormChange,
    onBack,
    onSave,
}: ProviderOnboardingAreaStepProps) {
    const {t} = useI18n();

    return (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-center gap-2">
                <MapPin size={18} className="text-primary" aria-hidden="true"/>
                <h2 className="m-0 text-base font-semibold text-slate-900">
                    {t('opsMarketplace.onboarding.steps.area')}
                </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                    <span>
                        {t('opsMarketplace.onboarding.fields.province')}
                        <RequiredMark/>
                    </span>
                    <input
                        required
                        className={INPUT_CLASS}
                        value={form.province}
                        onChange={e => onFormChange(s => ({...s, province: e.target.value}))}
                        placeholder={t('opsMarketplace.onboarding.fields.provincePlaceholder')}
                    />
                </label>

                <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                    <span>
                        {t('opsMarketplace.onboarding.fields.serviceRadiusKm')}
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

                <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                    <span>
                        {t('opsMarketplace.onboarding.fields.bankName')}
                        <OptionalMark/>
                    </span>
                    <input
                        className={INPUT_CLASS}
                        value={form.bankName ?? ''}
                        onChange={e => onFormChange(s => ({...s, bankName: e.target.value}))}
                    />
                </label>

                <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                    <span>
                        {t('opsMarketplace.onboarding.fields.bankAccountNumber')}
                        <OptionalMark/>
                    </span>
                    <input
                        className={INPUT_CLASS}
                        value={form.bankAccountNumber ?? ''}
                        onChange={e => onFormChange(s => ({...s, bankAccountNumber: e.target.value}))}
                    />
                </label>

                <label className="grid gap-1.5 text-xs font-semibold text-slate-700 sm:col-span-2">
                    <span>
                        {t('opsMarketplace.onboarding.fields.bankAccountHolder')}
                        <OptionalMark/>
                    </span>
                    <input
                        className={INPUT_CLASS}
                        value={form.bankAccountHolder ?? ''}
                        onChange={e => onFormChange(s => ({...s, bankAccountHolder: e.target.value}))}
                    />
                </label>
            </div>

            <div className="flex flex-wrap justify-between gap-2.5 border-t border-slate-100 pt-4">
                <Button type="button" variant="secondary" onClick={onBack}>
                    {t('opsMarketplace.common.back')}
                </Button>
                <div className="flex flex-wrap gap-2.5">
                    <Button type="button" variant="secondary" disabled={isPending} onClick={() => onSave(false)}>
                        {t('opsMarketplace.onboarding.actions.saveDraft')}
                    </Button>
                    <Button type="button" disabled={isPending} onClick={() => onSave(true)}>
                        {isPending
                            ? t('opsMarketplace.onboarding.actions.submitting')
                            : t('opsMarketplace.onboarding.actions.submitReview')}
                    </Button>
                </div>
            </div>
        </section>
    );
}
