'use client';

import {useState} from 'react';
import Link from 'next/link';
import {
    Boxes,
    Clock,
    Edit3,
    MapPin,
    PauseCircle,
    PlayCircle,
    Plus,
    RefreshCw,
    ShieldAlert,
    Sparkles,
    Trash2,
} from 'lucide-react';
import {Button, OptionalMark, RequiredMark} from '@/components/ui';
import {ProviderStudioShell} from '@/components/marketplace/provider/ProviderStudioShell';
import {
    useMyProviderListings,
    useMyProviderProfile,
    useProviderListingActions,
    useServiceTemplates,
} from '@/hooks/marketplace/useMarketplace';
import {useSiteInfo} from '@/hooks/settings/useSiteInfo';
import {
    extractActionableError,
    formatVndCompact,
    initialListingForm,
    LISTING_TYPE_CODES,
    listingFormFromTemplate,
    PRICING_MODEL_CODES,
    sanitizeMarketplaceText,
} from '@/forms/marketplace/marketplace-forms';
import {useI18n} from '@/providers/I18nContext';
import type {UavService} from '@/types/mission/mission.types';
import type {
    ListingType,
    MarketplaceListing,
    MarketplaceListingUpsertInput,
    PricingModel,
} from '@/types/marketplace/marketplace.types';

const INPUT_CLASS =
    'h-11 w-full rounded-control border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-primary';

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
        setForm(
            listingFormFromTemplate(
                tpl,
                profile?.province || 'Hà Nội',
                profile?.serviceRadiusKm ?? defaultServiceRadiusKm,
            ),
        );
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
            title: item.title,
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
                                                <span className="rounded-md bg-white px-2 py-0.5 font-mono text-xs font-semibold whitespace-nowrap text-slate-600">
                                                    {tpl.code}
                                                </span>
                                            </div>
                                            <h3 className="m-0 line-clamp-2 text-sm font-semibold text-slate-900">
                                                {tpl.name}
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
                        <form
                            onSubmit={e => {
                                e.preventDefault();
                                void handleSave(true);
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
                                <span className="rounded-full bg-uav-red-light px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-primary">
                                    {t('opsMarketplace.common.illustrationBadge')}
                                </span>
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
                                        onChange={e => setForm(s => ({...s, title: e.target.value}))}
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
                                        onChange={e => setForm(s => ({...s, listingType: e.target.value as ListingType}))}
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
                                        onChange={e => setForm(s => ({...s, basePriceVnd: Number(e.target.value)}))}
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
                                        onChange={e => setForm(s => ({...s, pricingModel: e.target.value as PricingModel}))}
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
                                        onChange={e => setForm(s => ({...s, minBookingUnits: Number(e.target.value)}))}
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
                                        onChange={e => setForm(s => ({...s, province: e.target.value}))}
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
                                        onChange={e => setForm(s => ({...s, serviceRadiusKm: Number(e.target.value)}))}
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
                                        onChange={e => setForm(s => ({...s, deliverySlaHours: Number(e.target.value)}))}
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
                                        onChange={e => setForm(s => ({...s, equipmentSpecs: e.target.value}))}
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
                                        onChange={e => setForm(s => ({...s, deliverablesSummary: e.target.value}))}
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
                                        onChange={e => setForm(s => ({...s, coverImageUrl: e.target.value}))}
                                        placeholder="https://..."
                                    />
                                </label>
                            </div>

                            <div className="flex flex-wrap justify-end gap-2.5 border-t border-slate-100 pt-4">
                                <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
                                    {t('opsMarketplace.common.cancel')}
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    disabled={
                                        createListing.isPending ||
                                        createFromTemplate.isPending ||
                                        updateListing.isPending
                                    }
                                    onClick={() => void handleSave(false)}
                                >
                                    {t('opsMarketplace.listings.actions.saveDraft')}
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={
                                        createListing.isPending ||
                                        createFromTemplate.isPending ||
                                        updateListing.isPending
                                    }
                                >
                                    {editingId === 'template'
                                        ? t('opsMarketplace.listings.actions.createFromTemplate')
                                        : t('opsMarketplace.listings.actions.submitReview')}
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* Khối 2: Danh sách dịch vụ của tôi */}
                    <section className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="m-0 text-base font-semibold text-slate-900">
                                {t('opsMarketplace.listings.myListingsTitle')} ({listings.length})
                            </h2>
                        </div>

                        {listings.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                                <Boxes size={28} className="mx-auto text-slate-400" aria-hidden="true"/>
                                <p className="m-0 mt-2 text-sm text-slate-600">{t('opsMarketplace.listings.empty')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {listings.map(item => (
                                    <article
                                        key={item.id}
                                        className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
                                    >
                                        <div className="space-y-2.5">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-slate-700">
                                                    {t(`opsMarketplace.listings.types.${item.listingType}`)}
                                                </span>
                                                <span
                                                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${
                                                        item.moderationStatus === 'PUBLISHED'
                                                            ? 'bg-slate-900 text-white'
                                                            : item.moderationStatus === 'PENDING_REVIEW'
                                                              ? 'bg-amber-100 text-amber-800'
                                                              : item.moderationStatus === 'REJECTED'
                                                                ? 'bg-rose-100 text-danger'
                                                                : 'bg-slate-100 text-slate-700'
                                                    }`}
                                                >
                                                    {t(`opsMarketplace.listings.status.${item.moderationStatus}`)}
                                                </span>
                                            </div>

                                            <h3 className="m-0 line-clamp-2 text-base font-semibold text-slate-900">
                                                {sanitizeMarketplaceText(item.title)}
                                            </h3>

                                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                                    <MapPin size={13} className="text-primary" aria-hidden="true"/>
                                                    {item.province} · {item.serviceRadiusKm} km
                                                </span>
                                                {item.deliverySlaHours != null && (
                                                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                                        <Clock size={13} aria-hidden="true"/>
                                                        {item.deliverySlaHours}h
                                                    </span>
                                                )}
                                                <span className="whitespace-nowrap">
                                                    {t('opsMarketplace.listings.actions.bookings', {
                                                        count: item.bookingCount,
                                                    })}
                                                </span>
                                            </div>

                                            {item.moderationNote && (
                                                <p className="m-0 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
                                                    {t('opsMarketplace.listings.actions.moderationNote', {
                                                        note: item.moderationNote,
                                                    })}
                                                </p>
                                            )}
                                        </div>

                                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                                            <div className="flex items-center gap-1.5">
                                                <strong className="text-base font-bold text-primary tabular-nums">
                                                    {formatVndCompact(item.basePriceVnd)}
                                                </strong>
                                                <span className="text-xs text-slate-500">
                                                    / {t(`opsMarketplace.listings.pricing.${item.pricingModel}`)}
                                                </span>
                                                <span className="rounded bg-uav-red-light px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-primary">
                                                    {t('opsMarketplace.common.illustrationBadge')}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(item)}
                                                    className="inline-flex min-h-9 items-center gap-1 rounded-control border border-slate-200 px-2.5 text-xs font-semibold whitespace-nowrap text-slate-700 hover:border-primary hover:text-primary"
                                                >
                                                    <Edit3 size={13} aria-hidden="true"/>
                                                    {t('opsMarketplace.listings.actions.edit')}
                                                </button>
                                                {(item.moderationStatus === 'PUBLISHED' ||
                                                    item.moderationStatus === 'PAUSED') && (
                                                    <button
                                                        type="button"
                                                        onClick={() => togglePause.mutate(item.id)}
                                                        className="inline-flex min-h-9 items-center gap-1 rounded-control border border-slate-200 px-2.5 text-xs font-semibold whitespace-nowrap text-slate-700 hover:bg-slate-50"
                                                    >
                                                        {item.moderationStatus === 'PUBLISHED' ? (
                                                            <>
                                                                <PauseCircle size={13} aria-hidden="true"/>
                                                                {t('opsMarketplace.listings.actions.pause')}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <PlayCircle size={13} aria-hidden="true"/>
                                                                {t('opsMarketplace.listings.actions.resume')}
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => deleteListing.mutate(item.id)}
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-control text-slate-400 hover:bg-rose-50 hover:text-danger"
                                                    aria-label={t('opsMarketplace.listings.actions.delete')}
                                                >
                                                    <Trash2 size={14} aria-hidden="true"/>
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}
        </ProviderStudioShell>
    );
}
export default ProviderListingsView;
