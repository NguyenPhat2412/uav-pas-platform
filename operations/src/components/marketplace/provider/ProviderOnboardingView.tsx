'use client';

import {useState} from 'react';
import {
    Building2,
    CheckCircle2,
    Clock,
    ExternalLink,
    FileCheck2,
    FileText,
    MapPin,
    Plus,
    RefreshCw,
    ShieldAlert,
    Star,
    Trash2,
} from 'lucide-react';
import {Button, OptionalMark, RequiredMark} from '@/components/ui';
import {ProviderStudioShell} from '@/components/marketplace/provider/ProviderStudioShell';
import {
    ProviderDocumentChecklist,
    ProviderVerificationStepper,
} from '@/components/marketplace/provider/ProviderVerificationStepper';
import {useMyProviderProfile, useProviderOnboardingActions} from '@/hooks/marketplace/useMarketplace';
import {useSiteInfo} from '@/hooks/settings/useSiteInfo';
import {
    DOCUMENT_TYPE_CODES,
    extractActionableError,
    initialOnboardingForm,
} from '@/forms/marketplace/marketplace-forms';
import {useI18n} from '@/providers/I18nContext';
import type {
    ProviderDocumentInput,
    ProviderDocumentType,
    ProviderOnboardingInput,
    ProviderProfile,
    ProviderType,
} from '@/types/marketplace/marketplace.types';

const INPUT_CLASS =
    'h-11 w-full rounded-control border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-primary';

export function ProviderOnboardingView() {
    const {t} = useI18n();
    const profileQuery = useMyProviderProfile();

    return (
        <ProviderStudioShell
            title={t('opsMarketplace.onboarding.title')}
            subtitle={t('opsMarketplace.onboarding.subtitle')}
            activeResource="providerOnboarding"
        >
            {profileQuery.isLoading ? (
                <div className="mx-auto max-w-4xl space-y-4" role="status" aria-label={t('opsMarketplace.common.loading')}>
                    <div className="h-24 animate-pulse rounded-2xl bg-slate-200/70"/>
                    <div className="h-14 animate-pulse rounded-2xl bg-slate-200/70"/>
                    <div className="h-72 animate-pulse rounded-2xl bg-slate-200/70"/>
                </div>
            ) : profileQuery.isError ? (
                <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-white p-6 text-center" role="alert">
                    <ShieldAlert size={28} className="mx-auto text-danger" aria-hidden="true"/>
                    <p className="m-0 mt-2 text-sm font-semibold text-slate-900">
                        {extractActionableError(profileQuery.error, t('opsMarketplace.common.loading'))}
                    </p>
                    <Button
                        type="button"
                        variant="secondary"
                        className="mt-4"
                        onClick={() => void profileQuery.refetch()}
                    >
                        <RefreshCw size={14} className="mr-1.5 inline" aria-hidden="true"/>
                        {t('opsMarketplace.common.retry')}
                    </Button>
                </div>
            ) : (
                <OnboardingWizard key={profileQuery.data?.id ?? 'new'} profile={profileQuery.data ?? null}/>
            )}
        </ProviderStudioShell>
    );
}

function OnboardingWizard({profile}: { profile: ProviderProfile | null }) {
    const {t} = useI18n();
    const {defaultServiceRadiusKm} = useSiteInfo();
    const {upsertProfile, addDocument, deleteDocument} = useProviderOnboardingActions();

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [form, setForm] = useState<ProviderOnboardingInput>(() =>
        initialOnboardingForm(profile, defaultServiceRadiusKm),
    );
    const [docForm, setDocForm] = useState<ProviderDocumentInput>({
        documentType: 'PILOT_CERTIFICATE',
        title: '',
        documentNumber: '',
        fileUrl: '',
    });
    const [savedBanner, setSavedBanner] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const step1Done = Boolean(form.displayName.trim());
    const step2Done = Boolean((profile?.documents?.length ?? 0) > 0);
    const step3Done = Boolean(form.province.trim());

    const saveProfile = async (submitForReview: boolean, nextStep?: 1 | 2 | 3) => {
        setSavedBanner('');
        setErrorMsg('');
        const effectiveProvince = form.province.trim() || 'Hà Nội';
        if (!form.displayName.trim()) {
            setErrorMsg(t('opsMarketplace.onboarding.actions.errorMissing'));
            return;
        }
        try {
            await upsertProfile.mutateAsync({
                ...form,
                displayName: form.displayName.trim(),
                province: effectiveProvince,
                submitForReview,
            });
            setSavedBanner(
                submitForReview
                    ? t('opsMarketplace.onboarding.actions.submitted')
                    : t('opsMarketplace.onboarding.actions.savedDraft'),
            );
            if (nextStep) setStep(nextStep);
        } catch (err) {
            setErrorMsg(extractActionableError(err, t('opsMarketplace.onboarding.actions.errorMissing')));
        }
    };

    const handleAddDocument = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setSavedBanner('');
        if (!docForm.title.trim()) return;
        const trimmedUrl = docForm.fileUrl?.trim() || undefined;
        if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) {
            setErrorMsg(t('opsMarketplace.onboarding.actions.errorUrl'));
            return;
        }
        try {
            if (!profile) {
                await upsertProfile.mutateAsync({
                    ...form,
                    displayName: form.displayName.trim() || 'Đội bay UAV PAS',
                    province: form.province.trim() || 'Hà Nội',
                    submitForReview: false,
                });
            }
            await addDocument.mutateAsync({
                ...docForm,
                title: docForm.title.trim(),
                documentNumber: docForm.documentNumber?.trim() || undefined,
                fileUrl: trimmedUrl,
            });
            setDocForm({documentType: 'PILOT_CERTIFICATE', title: '', documentNumber: '', fileUrl: ''});
        } catch (err) {
            setErrorMsg(extractActionableError(err, t('opsMarketplace.onboarding.documents.saveFirstHint')));
        }
    };

    const status = profile?.verificationStatus ?? 'DRAFT';

    return (
        <div className="mx-auto max-w-4xl space-y-5">
            {/* Trạng thái chờ duyệt / xác minh */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex items-start gap-3">
                    <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                            status === 'VERIFIED'
                                ? 'bg-slate-900 text-white'
                                : status === 'PENDING_REVIEW'
                                  ? 'bg-uav-red-light text-primary'
                                  : status === 'REJECTED'
                                    ? 'bg-rose-100 text-danger'
                                    : 'bg-slate-100 text-slate-700'
                        }`}
                    >
                        {status === 'PENDING_REVIEW' ? (
                            <Clock size={20} aria-hidden="true"/>
                        ) : status === 'REJECTED' ? (
                            <ShieldAlert size={20} aria-hidden="true"/>
                        ) : (
                            <CheckCircle2 size={20} aria-hidden="true"/>
                        )}
                    </span>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <strong className="text-base font-semibold text-slate-900">
                                {status === 'PENDING_REVIEW'
                                    ? t('opsMarketplace.onboarding.statusCard.pendingTitle')
                                    : status === 'VERIFIED'
                                      ? t('opsMarketplace.onboarding.statusCard.verifiedTitle')
                                      : status === 'REJECTED'
                                        ? t('opsMarketplace.onboarding.statusCard.rejectedTitle')
                                        : status === 'SUSPENDED'
                                          ? t('opsMarketplace.onboarding.statusCard.suspendedTitle')
                                          : t('opsMarketplace.onboarding.statusCard.draftTitle')}
                            </strong>
                            <span className="rounded-full bg-uav-red-light px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-primary">
                                {t(`opsMarketplace.studio.verification.${status}`)}
                            </span>
                        </div>
                        <p className="m-0 mt-0.5 text-[13px] text-slate-600">
                            {status === 'PENDING_REVIEW'
                                ? t('opsMarketplace.onboarding.statusCard.pendingDesc')
                                : status === 'VERIFIED'
                                  ? t('opsMarketplace.onboarding.statusCard.verifiedDesc')
                                  : profile?.reviewNote
                                    ? t('opsMarketplace.onboarding.statusCard.reviewNote', {note: profile.reviewNote})
                                    : status === 'SUSPENDED'
                                      ? t('opsMarketplace.onboarding.statusCard.suspendedDesc')
                                      : t('opsMarketplace.onboarding.subtitle')}
                        </p>
                    </div>
                </div>

                {profile && (
                    <div className="flex items-center gap-4 text-xs text-slate-600 tabular-nums">
                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                            <Star size={14} className="text-primary" aria-hidden="true"/>
                            {t('opsMarketplace.onboarding.statusCard.rating')}:{' '}
                            <strong className="text-slate-900">{Number(profile.ratingAvg || 0).toFixed(1)}</strong>
                        </span>
                        <span className="whitespace-nowrap">
                            {t('opsMarketplace.onboarding.statusCard.completed')}:{' '}
                            <strong className="text-slate-900">{profile.completedMissionsCount}</strong>
                        </span>
                    </div>
                )}
            </div>

            {/* Tiến trình xác minh 5 bước */}
            <ProviderVerificationStepper
                profile={profile}
                providerType={form.providerType}
                profileDone={step1Done && step3Done}
            />

            {/* Thanh tiến trình 3 bước kiểu Shopee */}
            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white p-2" role="tablist">
                {[
                    {id: 1 as const, label: t('opsMarketplace.onboarding.steps.profile'), icon: Building2, done: step1Done},
                    {id: 2 as const, label: t('opsMarketplace.onboarding.steps.documents'), icon: FileCheck2, done: step2Done},
                    {id: 3 as const, label: t('opsMarketplace.onboarding.steps.area'), icon: MapPin, done: step3Done},
                ].map(item => {
                    const Icon = item.icon;
                    const active = step === item.id;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setStep(item.id)}
                            className={`flex min-h-11 min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-xl px-2 py-2 text-xs font-semibold whitespace-nowrap transition-colors sm:gap-2 sm:px-3 ${
                                active
                                    ? 'bg-primary text-white'
                                    : item.done
                                      ? 'bg-uav-red-light text-primary'
                                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <Icon size={15} className="shrink-0" aria-hidden="true"/>
                            <span className="line-clamp-2 break-words leading-tight">{item.label}</span>
                        </button>
                    );
                })}
            </div>

            {savedBanner && (
                <div className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-xs font-semibold text-slate-900" role="status">
                    {savedBanner}
                </div>
            )}
            {errorMsg && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-danger" role="alert">
                    {errorMsg}
                </div>
            )}

            {/* Bước 1: Hồ sơ */}
            {step === 1 && (
                <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                    <div className="flex items-center gap-2">
                        <Building2 size={18} className="text-primary" aria-hidden="true"/>
                        <h2 className="m-0 text-base font-semibold text-slate-900">
                            {t('opsMarketplace.onboarding.steps.profile')}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                            <span>
                                {t('opsMarketplace.onboarding.fields.displayName')}
                                <RequiredMark/>
                            </span>
                            <input
                                required
                                className={INPUT_CLASS}
                                value={form.displayName}
                                onChange={e => setForm(s => ({...s, displayName: e.target.value}))}
                                placeholder={t('opsMarketplace.onboarding.fields.displayNamePlaceholder')}
                            />
                        </label>

                        <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                            <span>
                                {t('opsMarketplace.onboarding.fields.providerType')}
                                <RequiredMark/>
                            </span>
                            <select
                                className={INPUT_CLASS}
                                value={form.providerType}
                                onChange={e => setForm(s => ({...s, providerType: e.target.value as ProviderType}))}
                            >
                                <option value="COMPANY">{t('opsMarketplace.onboarding.fields.typeCompany')}</option>
                                <option value="INDIVIDUAL">{t('opsMarketplace.onboarding.fields.typeIndividual')}</option>
                            </select>
                        </label>

                        <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                            <span>
                                {t('opsMarketplace.onboarding.fields.taxOrIdNumber')}
                                <OptionalMark/>
                            </span>
                            <input
                                className={INPUT_CLASS}
                                value={form.taxOrIdNumber ?? ''}
                                onChange={e => setForm(s => ({...s, taxOrIdNumber: e.target.value}))}
                            />
                        </label>

                        <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                            <span>
                                {t('opsMarketplace.onboarding.fields.flightLicenseNumber')}
                                <OptionalMark/>
                            </span>
                            <input
                                className={INPUT_CLASS}
                                value={form.flightLicenseNumber ?? ''}
                                onChange={e => setForm(s => ({...s, flightLicenseNumber: e.target.value}))}
                            />
                        </label>

                        <label className="grid gap-1.5 text-xs font-semibold text-slate-700 sm:col-span-2">
                            <span>
                                {t('opsMarketplace.onboarding.fields.contactPhone')}
                                <OptionalMark/>
                            </span>
                            <input
                                className={INPUT_CLASS}
                                value={form.contactPhone ?? ''}
                                onChange={e => setForm(s => ({...s, contactPhone: e.target.value}))}
                            />
                        </label>

                        <label className="grid gap-1.5 text-xs font-semibold text-slate-700 sm:col-span-2">
                            <span>
                                {t('opsMarketplace.onboarding.fields.bio')}
                                <OptionalMark/>
                            </span>
                            <textarea
                                rows={3}
                                className="w-full rounded-control border border-slate-300 bg-white p-3 text-sm font-medium text-slate-900 outline-none focus:border-primary"
                                value={form.bio ?? ''}
                                onChange={e => setForm(s => ({...s, bio: e.target.value}))}
                                placeholder={t('opsMarketplace.onboarding.fields.bioPlaceholder')}
                            />
                        </label>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2.5 border-t border-slate-100 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={upsertProfile.isPending}
                            onClick={() => void saveProfile(false)}
                        >
                            {t('opsMarketplace.onboarding.actions.saveDraft')}
                        </Button>
                        <Button
                            type="button"
                            disabled={upsertProfile.isPending}
                            onClick={() => void saveProfile(false, 2)}
                        >
                            {t('opsMarketplace.onboarding.actions.saveAndNext')}
                        </Button>
                    </div>
                </section>
            )}

            {/* Bước 2: Giấy tờ */}
            {step === 2 && (
                <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                    <div className="flex items-center gap-2">
                        <FileCheck2 size={18} className="text-primary" aria-hidden="true"/>
                        <div>
                            <h2 className="m-0 text-base font-semibold text-slate-900">
                                {t('opsMarketplace.onboarding.documents.title')}
                            </h2>
                            <p className="m-0 text-xs text-slate-500">
                                {t('opsMarketplace.onboarding.documents.subtitle')}
                            </p>
                        </div>
                    </div>

                    <ProviderDocumentChecklist
                        providerType={form.providerType}
                        documents={profile?.documents ?? []}
                        onSelectType={code =>
                            setDocForm(prev => ({
                                ...prev,
                                documentType: code,
                            }))
                        }
                    />

                    <form onSubmit={handleAddDocument} className="grid grid-cols-1 items-end gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="grid gap-1 text-xs font-semibold text-slate-700">
                            <span>
                                {t('opsMarketplace.onboarding.documents.type')}
                                <RequiredMark/>
                            </span>
                            <select
                                className={INPUT_CLASS}
                                value={docForm.documentType}
                                onChange={e => setDocForm(s => ({...s, documentType: e.target.value as ProviderDocumentType}))}
                            >
                                {DOCUMENT_TYPE_CODES.map(code => (
                                    <option key={code} value={code}>
                                        {t(`opsMarketplace.onboarding.documents.types.${code}`)}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="grid gap-1 text-xs font-semibold text-slate-700">
                            <span>
                                {t('opsMarketplace.onboarding.documents.docTitle')}
                                <RequiredMark/>
                            </span>
                            <input
                                required
                                className={INPUT_CLASS}
                                value={docForm.title}
                                onChange={e => setDocForm(s => ({...s, title: e.target.value}))}
                                placeholder={t('opsMarketplace.onboarding.documents.docTitlePlaceholder')}
                            />
                        </label>

                        <label className="grid gap-1 text-xs font-semibold text-slate-700">
                            <span>
                                {t('opsMarketplace.onboarding.documents.docNumber')}
                                <OptionalMark/>
                            </span>
                            <input
                                className={INPUT_CLASS}
                                value={docForm.documentNumber ?? ''}
                                onChange={e => setDocForm(s => ({...s, documentNumber: e.target.value}))}
                            />
                        </label>

                        <label className="grid gap-1 text-xs font-semibold text-slate-700">
                            <span>
                                {t('opsMarketplace.onboarding.documents.fileUrl')}
                                <OptionalMark/>
                            </span>
                            <input
                                type="url"
                                className={INPUT_CLASS}
                                value={docForm.fileUrl ?? ''}
                                onChange={e => setDocForm(s => ({...s, fileUrl: e.target.value}))}
                                placeholder="https://..."
                            />
                        </label>

                        <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                            <Button type="submit" variant="secondary" disabled={addDocument.isPending || upsertProfile.isPending}>
                                <Plus size={14} className="mr-1 inline" aria-hidden="true"/>
                                {t('opsMarketplace.onboarding.documents.add')}
                            </Button>
                        </div>
                    </form>

                    {!profile || profile.documents.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center text-xs text-slate-500">
                            {t('opsMarketplace.onboarding.documents.empty')}
                        </div>
                    ) : (
                        <ul className="m-0 list-none divide-y divide-slate-100 p-0">
                            {profile.documents.map(doc => {
                                const safeHref = doc.fileUrl && /^https?:\/\//i.test(doc.fileUrl) ? doc.fileUrl : null;
                                const isApproved = doc.status === 'APPROVED';
                                const statusTone =
                                    doc.status === 'APPROVED'
                                        ? 'bg-slate-900 text-white'
                                        : doc.status === 'REJECTED'
                                          ? 'bg-rose-100 text-danger'
                                          : 'bg-amber-100 text-amber-800';
                                return (
                                    <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <FileText size={18} className="shrink-0 text-primary" aria-hidden="true"/>
                                            <div className="min-w-0">
                                                {safeHref ? (
                                                    <a
                                                        href={safeHref}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:text-primary"
                                                    >
                                                        <span className="truncate">{doc.title}</span>
                                                        <ExternalLink size={12} aria-hidden="true"/>
                                                    </a>
                                                ) : (
                                                    <strong className="font-semibold text-slate-900">{doc.title}</strong>
                                                )}
                                                <div className="text-slate-500">
                                                    {t(`opsMarketplace.onboarding.documents.types.${doc.documentType}`)}
                                                    {doc.documentNumber ? ` · ${doc.documentNumber}` : ''}
                                                </div>
                                                {doc.reviewerNote && (
                                                    <div className="mt-0.5 text-amber-800">
                                                        {t('opsMarketplace.onboarding.workflow.reviewerNoteLabel', {
                                                            note: doc.reviewerNote,
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${statusTone}`}>
                                                {t(`opsMarketplace.onboarding.documents.status.${doc.status}`)}
                                            </span>
                                            <button
                                                type="button"
                                                disabled={isApproved || deleteDocument.isPending}
                                                title={isApproved ? t('opsMarketplace.onboarding.workflow.approvedLockedHint') : undefined}
                                                onClick={() => deleteDocument.mutate(doc.id)}
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-control text-slate-400 hover:bg-rose-50 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                                                aria-label={t('opsMarketplace.common.delete')}
                                            >
                                                <Trash2 size={15} aria-hidden="true"/>
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    <div className="flex flex-wrap justify-between gap-2.5 border-t border-slate-100 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                            {t('opsMarketplace.common.back')}
                        </Button>
                        <Button type="button" onClick={() => setStep(3)}>
                            {t('opsMarketplace.common.next')}
                        </Button>
                    </div>
                </section>
            )}

            {/* Bước 3: Khu vực phục vụ & Đối soát */}
            {step === 3 && (
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
                                onChange={e => setForm(s => ({...s, province: e.target.value}))}
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
                                onChange={e => setForm(s => ({...s, serviceRadiusKm: Number(e.target.value)}))}
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
                                onChange={e => setForm(s => ({...s, bankName: e.target.value}))}
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
                                onChange={e => setForm(s => ({...s, bankAccountNumber: e.target.value}))}
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
                                onChange={e => setForm(s => ({...s, bankAccountHolder: e.target.value}))}
                            />
                        </label>
                    </div>

                    <div className="flex flex-wrap justify-between gap-2.5 border-t border-slate-100 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setStep(2)}>
                            {t('opsMarketplace.common.back')}
                        </Button>
                        <div className="flex flex-wrap gap-2.5">
                            <Button
                                type="button"
                                variant="secondary"
                                disabled={upsertProfile.isPending}
                                onClick={() => void saveProfile(false)}
                            >
                                {t('opsMarketplace.onboarding.actions.saveDraft')}
                            </Button>
                            <Button
                                type="button"
                                disabled={upsertProfile.isPending}
                                onClick={() => void saveProfile(true)}
                            >
                                {upsertProfile.isPending
                                    ? t('opsMarketplace.onboarding.actions.submitting')
                                    : t('opsMarketplace.onboarding.actions.submitReview')}
                            </Button>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
export default ProviderOnboardingView;
