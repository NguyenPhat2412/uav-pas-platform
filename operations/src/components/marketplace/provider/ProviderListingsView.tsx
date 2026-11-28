'use client';

import {useState} from 'react';
import Link from 'next/link';
import {
    Boxes,
    Plus,
    RefreshCw,
    ShieldAlert,
    Sparkles,
} from 'lucide-react';
import {Button} from '@/components/ui';
import {IllustrativeFooterNote} from '@/components/marketplace/provider/IllustrativeDisclaimer';
import {ProviderListingEditorForm} from '@/components/marketplace/provider/ProviderListingEditorForm';
import {ProviderListingGrid} from '@/components/marketplace/provider/ProviderListingGrid';
import {ProviderStudioShell} from '@/components/marketplace/provider/ProviderStudioShell';
import {
    useMyProviderListings,
    useMyProviderProfile,
    useProviderListingActions,
    useServiceTemplates,
} from '@/hooks/useMarketplace';
import {useSiteInfo} from '@/hooks/useSiteInfo';
import {
    extractActionableError,
    initialListingForm,
    listingFormFromTemplate,
    sanitizeEntityName,
} from '@/forms/marketplace-forms';
import {displayLabel, serviceName} from '@/lib/presentation';
import {useI18n} from '@/providers/I18nContext';
import type {UavService} from '@/types/mission.types';
import type {
    MarketplaceListing,
    MarketplaceListingUpsertInput,
} from '@/types/marketplace.types';

export function ProviderListingsView() {
    const {t} = useI18n();
    const {defaultServiceRadiusKm} = useSiteInfo();
    const profileQuery = useMyProviderProfile();
    const profile = profileQuery.data;
    const templatesQuery = useServiceTemplates(Boolean(profile));
    const listingsQuery = useMyProviderListings(Boolean(profile));
    const {createListing, createFromTemplate, updateListing, togglePause, deleteListing} =
        useProviderListingActions();

    const templates = templatesQuery.data ?? [];
    const listings = listingsQuery.data ?? [];

    const [editingId, setEditingId] = useState<number | 'new' | 'template' | null>(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
    const [form, setForm] = useState<MarketplaceListingUpsertInput>(() =>
        initialListingForm(profile?.province || 'Hà Nội', defaultServiceRadiusKm),
    );
    const [errorMsg, setErrorMsg] = useState('');

    const openFromTemplate = (tpl: UavService) => {
        setErrorMsg('');
        setSelectedTemplateId(tpl.id);
        setForm({
            ...listingFormFromTemplate(
                tpl,
                profile?.province || 'Hà Nội',
                profile?.serviceRadiusKm ?? defaultServiceRadiusKm,
            ),
            title: sanitizeEntityName(serviceName(tpl)),
        });
        setEditingId('template');
    };

    const openCustomCreate = () => {
        setErrorMsg('');
        setSelectedTemplateId(null);
        setForm(
            initialListingForm(
                profile?.province || 'Hà Nội',
                profile?.serviceRadiusKm ?? defaultServiceRadiusKm,
            ),
        );
        setEditingId('new');
    };

    const openEdit = (item: MarketplaceListing) => {
        setErrorMsg('');
        setSelectedTemplateId(item.categoryServiceId ?? null);
        setForm({
            categoryServiceId: item.categoryServiceId ?? undefined,
            title: sanitizeEntityName(item.title),
            summary: item.summary ?? '',
            description: item.description ?? '',
            listingType: item.listingType,
            missionType: item.missionType,
            pricingModel: item.pricingModel,
            basePriceVnd: Number(item.basePriceVnd),
            minBookingUnits: Number(item.minBookingUnits || 1),
            securityDepositVnd: Number(item.securityDepositVnd || 0),
            province: item.province,
            serviceRadiusKm: item.serviceRadiusKm,
            equipmentSpecs: item.equipmentSpecs ?? '',
            deliverablesSummary: item.deliverablesSummary ?? '',
            onSiteSlaHours: item.onSiteSlaHours ?? 24,
            deliverySlaHours: item.deliverySlaHours ?? 48,
            coverImageUrl: item.coverImageUrl ?? '',
            submitForReview: true,
        });
        setEditingId(item.id);
    };

    const handleSave = async (submitForReview: boolean) => {
        setErrorMsg('');
        if (!form.title.trim() || !form.province.trim()) return;
        const trimmedCover = form.coverImageUrl?.trim() || undefined;
        if (trimmedCover && !/^https?:\/\//i.test(trimmedCover)) {
            setErrorMsg(t('opsMarketplace.onboarding.actions.errorUrl'));
            return;
        }
        try {
            if (editingId === 'template' && selectedTemplateId != null) {
                await createFromTemplate.mutateAsync({
                    serviceOfferingId: selectedTemplateId,
                    title: form.title.trim(),
                    summary: form.summary?.trim() || undefined,
                    province: form.province.trim(),
                    serviceRadiusKm: form.serviceRadiusKm,
                    basePriceVnd: Number(form.basePriceVnd),
                    pricingModel: form.pricingModel,
                    minBookingUnits: form.minBookingUnits,
                    deliverySlaHours: form.deliverySlaHours,
                    onSiteSlaHours: form.onSiteSlaHours,
                    equipmentSpecs: form.equipmentSpecs?.trim() || undefined,
                    deliverablesSummary: form.deliverablesSummary?.trim() || undefined,
                    coverImageUrl: trimmedCover,
                    submitForReview,
                });
            } else if (editingId === 'new') {
                await createListing.mutateAsync({
                    ...form,
                    title: form.title.trim(),
                    province: form.province.trim(),
                    coverImageUrl: trimmedCover,
                    submitForReview,
                });
            } else if (typeof editingId === 'number') {
                await updateListing.mutateAsync({
                    id: editingId,
                    payload: {
                        ...form,
                        title: form.title.trim(),
                        province: form.province.trim(),
                        coverImageUrl: trimmedCover,
                        submitForReview,
                    },
                });
            }
            setEditingId(null);
        } catch (err) {
            setErrorMsg(extractActionableError(err, t('opsMarketplace.common.retry')));
        }
    };

    return (
        <ProviderStudioShell
            title={t('opsMarketplace.listings.title')}
            subtitle={t('opsMarketplace.listings.subtitle')}
            activeResource="providerListings"
        >
            {profileQuery.isLoading || (Boolean(profile) && listingsQuery.isLoading) ? (
                <div className="mx-auto max-w-6xl space-y-4" role="status" aria-label={t('opsMarketplace.common.loading')}>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {[1, 2, 3].map(n => (
                            <div key={n} className="h-28 animate-pulse rounded-2xl bg-slate-200/70"/>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {[1, 2].map(n => (
                            <div key={n} className="h-44 animate-pulse rounded-2xl bg-slate-200/70"/>
                        ))}
                    </div>
                </div>
            ) : !profile ? (
                <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center" role="status">
                    <Boxes size={28} className="mx-auto text-primary" aria-hidden="true"/>
                    <h2 className="m-0 mt-2 text-base font-semibold text-slate-900">
                        {t('opsMarketplace.common.requiredOnboardingTitle')}
                    </h2>
                    <p className="m-0 mt-1 text-[13px] text-slate-600">
                        {t('opsMarketplace.common.requiredOnboardingDesc')}
                    </p>
                    <Link
                        href="/operations/provider/onboarding"
                        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-5 text-xs font-semibold whitespace-nowrap text-white"
                    >
                        {t('opsMarketplace.common.goToOnboarding')}
                    </Link>
                </div>
            ) : listingsQuery.isError ? (
                <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-white p-6 text-center" role="alert">
                    <ShieldAlert size={28} className="mx-auto text-danger" aria-hidden="true"/>
                    <p className="m-0 mt-2 text-sm font-semibold text-slate-900">
                        {extractActionableError(listingsQuery.error, t('opsMarketplace.common.retry'))}
                    </p>
                    <Button type="button" variant="secondary" className="mt-4" onClick={() => void listingsQuery.refetch()}>
                        <RefreshCw size={14} className="mr-1.5 inline" aria-hidden="true"/>
                        {t('opsMarketplace.common.retry')}
                    </Button>
                </div>
            ) : (
                <div className="mx-auto max-w-6xl space-y-6">
                    {/* Khối 1: Mẫu dịch vụ chuẩn (/listings/from-template) */}
                    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Sparkles size={18} className="text-primary" aria-hidden="true"/>
                                <h2 className="m-0 text-base font-semibold text-slate-900">
                                    {t('opsMarketplace.listings.templatesTitle')}
                                </h2>
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={openCustomCreate}
                                className="min-h-10 whitespace-nowrap"
                            >
                                <Plus size={14} className="mr-1 inline" aria-hidden="true"/>
                                {t('opsMarketplace.listings.customCreate')}
                            </Button>
                        </div>

                        {templates.length === 0 ? (
                            <p className="m-0 text-xs text-slate-500">{t('opsMarketplace.listings.templatesEmpty')}</p>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {templates.map(tpl => (
                                    <div
                                        key={tpl.id}
                                        className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                                    >
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-uav-red-light text-primary">
                                                    <Boxes size={18} aria-hidden="true"/>
                                                </span>
                                                <span className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-slate-600">
                                                    {displayLabel(tpl.code)}
                                                </span>
                                            </div>
                                            <h3 className="m-0 line-clamp-2 text-sm font-semibold text-slate-900">
                                                {sanitizeEntityName(serviceName(tpl))}
                                            </h3>
                                            {tpl.description && (
                                                <p className="m-0 line-clamp-1 text-xs text-slate-500">
                                                    {tpl.description}
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => openFromTemplate(tpl)}
                                            className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-control bg-primary px-3 text-xs font-semibold whitespace-nowrap text-white transition-colors hover:bg-primary-hover"
                                        >
                                            <Plus size={14} aria-hidden="true"/>
                                            {t('opsMarketplace.listings.useTemplate')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {(errorMsg || togglePause.isError || deleteListing.isError) && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-danger" role="alert">
                            {errorMsg ||
                                extractActionableError(
                                    togglePause.error ?? deleteListing.error,
                                    t('opsMarketplace.common.retry'),
                                )}
                        </div>
                    )}

                    {/* Form Tạo từ mẫu / Sửa dịch vụ */}
                    {editingId !== null && (
                        <ProviderListingEditorForm
                            editingId={editingId}
                            form={form}
                            defaultServiceRadiusKm={defaultServiceRadiusKm}
                            isPending={
                                createListing.isPending ||
                                createFromTemplate.isPending ||
                                updateListing.isPending
                            }
                            onFormChange={setForm}
                            onCancel={() => setEditingId(null)}
                            onSave={submitForReview => void handleSave(submitForReview)}
                        />
                    )}

                    {/* Khối 2: Danh sách dịch vụ của tôi */}
                    <ProviderListingGrid
                        listings={listings}
                        onEdit={openEdit}
                        onTogglePause={id => togglePause.mutate(id)}
                        onDelete={id => deleteListing.mutate(id)}
                    />

                    <IllustrativeFooterNote/>
                </div>
            )}
        </ProviderStudioShell>
    );
}
export default ProviderListingsView;
