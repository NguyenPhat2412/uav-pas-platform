'use client';

import {ExternalLink, FileCheck2, FileText, Plus, Trash2} from 'lucide-react';
import {Button, OptionalMark, RequiredMark} from '@/components/ui';
import {ProviderDocumentChecklist} from '@/components/marketplace/provider/ProviderVerificationStepper';
import {DOCUMENT_TYPE_CODES} from '@/forms/marketplace-forms';
import {useI18n} from '@/providers/I18nContext';
import type {
    ProviderDocumentInput,
    ProviderDocumentType,
    ProviderProfile,
    ProviderType,
} from '@/types/marketplace.types';

const INPUT_CLASS =
    'h-11 w-full rounded-control border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-primary';

interface ProviderOnboardingDocumentsStepProps {
    profile: ProviderProfile | null;
    providerType: ProviderType;
    docForm: ProviderDocumentInput;
    isSaving: boolean;
    isDeleting: boolean;
    onDocFormChange: (updater: (prev: ProviderDocumentInput) => ProviderDocumentInput) => void;
    onAddDocument: (e: React.FormEvent) => void;
    onDeleteDocument: (docId: number) => void;
    onBack: () => void;
    onNext: () => void;
}

export function ProviderOnboardingDocumentsStep({
    profile,
    providerType,
    docForm,
    isSaving,
    isDeleting,
    onDocFormChange,
    onAddDocument,
    onDeleteDocument,
    onBack,
    onNext,
}: ProviderOnboardingDocumentsStepProps) {
    const {t} = useI18n();

    return (
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
                providerType={providerType}
                documents={profile?.documents ?? []}
                onSelectType={code => onDocFormChange(prev => ({...prev, documentType: code}))}
            />

            <form
                onSubmit={onAddDocument}
                className="grid grid-cols-1 items-end gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4"
            >
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    <span>
                        {t('opsMarketplace.onboarding.documents.type')}
                        <RequiredMark/>
                    </span>
                    <select
                        className={INPUT_CLASS}
                        value={docForm.documentType}
                        onChange={e =>
                            onDocFormChange(s => ({
                                ...s,
                                documentType: e.target.value as ProviderDocumentType,
                            }))
                        }
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
                        onChange={e => onDocFormChange(s => ({...s, title: e.target.value}))}
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
                        onChange={e => onDocFormChange(s => ({...s, documentNumber: e.target.value}))}
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
                        onChange={e => onDocFormChange(s => ({...s, fileUrl: e.target.value}))}
                        placeholder="https://..."
                    />
                </label>

                <div className="flex justify-end sm:col-span-2 lg:col-span-4">
                    <Button type="submit" variant="secondary" disabled={isSaving}>
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
                                <div className="flex min-w-0 items-center gap-2.5">
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
                                        disabled={isApproved || isDeleting}
                                        title={isApproved ? t('opsMarketplace.onboarding.workflow.approvedLockedHint') : undefined}
                                        onClick={() => onDeleteDocument(doc.id)}
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
                <Button type="button" variant="secondary" onClick={onBack}>
                    {t('opsMarketplace.common.back')}
                </Button>
                <Button type="button" onClick={onNext}>
                    {t('opsMarketplace.common.next')}
                </Button>
            </div>
        </section>
    );
}
