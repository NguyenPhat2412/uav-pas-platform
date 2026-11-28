'use client';

import {useState} from 'react';
import {
    AlertCircle,
    CheckCircle2,
    CircleDashed,
    ClipboardCheck,
    Clock,
    ExternalLink,
    FileCheck2,
    FileText,
    MessageSquareWarning,
} from 'lucide-react';
import {Button} from '@/components/ui';
import {sanitizeMarketplaceText} from '@/forms/admin-marketplace-form';
import {computeProviderDocumentChecklist} from '@/forms/provider-verification-checklist';
import {useI18n} from '@/providers/I18nContext';
import type {AdminProviderDocument, AdminProviderProfile} from '@/types/marketplace.types';

const CHECKLIST_KEYS = ['identity', 'flight', 'fleet', 'payout'] as const;
const QUICK_REASON_KEYS = ['missingFlight', 'unclearDoc', 'missingFleet', 'bankMismatch'] as const;

export function ProviderDocumentReviewList({
    provider,
    canModerate,
    isModeratingDoc = false,
    onOpenDoc,
    onModerateDoc,
    onAppendReason,
}: {
    provider: AdminProviderProfile;
    canModerate: boolean;
    isModeratingDoc?: boolean;
    onOpenDoc: (doc: AdminProviderDocument) => void;
    onModerateDoc?: (doc: AdminProviderDocument, status: 'APPROVED' | 'REJECTED') => void;
    onAppendReason: (reason: string) => void;
}) {
    const {t, formatDate} = useI18n();
    const docs = provider.documents ?? [];
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

    const docTypeLabel = (code: string) => {
        const key = `adminCommerce.marketplace.docType.${code}`;
        const val = t(key);
        return val === key ? code : val;
    };

    const docStatusLabel = (code: string) => {
        const key = `adminCommerce.marketplace.docStatus.${code}`;
        const val = t(key);
        return val === key ? code : val;
    };

    const summary = computeProviderDocumentChecklist(provider.providerType, docs);
    const checkedCount = CHECKLIST_KEYS.filter(k => checkedItems[k]).length;

    const renderDocumentCard = (doc: AdminProviderDocument) => {
        const resolvedUrl = doc.downloadUrl || doc.fileUrl;
        const canOpen = Boolean(
            (resolvedUrl && /^https?:\/\//i.test(resolvedUrl)) || doc.mediaAssetId,
        );
        const isImagePreview = Boolean(
            resolvedUrl && /^https?:\/\/.+\.(?:png|jpe?g|webp)(\?.*)?$/i.test(resolvedUrl),
        );
        const upperStatus = (doc.status || 'PENDING').toUpperCase();
        const statusTone =
            upperStatus === 'APPROVED' || upperStatus === 'VERIFIED'
                ? 'border-slate-900 bg-slate-900 text-white'
                : upperStatus === 'REJECTED'
                  ? 'border-rose-200 bg-rose-100 text-danger'
                  : 'border-amber-200 bg-amber-100 text-amber-800';

        return (
            <div key={doc.id} className="space-y-2 rounded-control border border-border bg-card p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <FileText size={14} className="shrink-0 text-primary" aria-hidden="true"/>
                            <strong className="text-xs font-semibold text-on-surface">
                                {sanitizeMarketplaceText(doc.title)}
                            </strong>
                            <span className={`rounded-badge border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${statusTone}`}>
                                {docStatusLabel(doc.status)}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted">
                            <span className="font-mono">
                                {doc.documentNumber
                                    ? t('adminCommerce.marketplace.providers.docNumber', {
                                          num: doc.documentNumber,
                                      })
                                    : t('adminCommerce.marketplace.providers.docNoNumber')}
                            </span>
                            {doc.createdAt && (
                                <span>
                                    {t('adminCommerce.marketplace.providers.docSubmittedAt', {
                                        at: formatDate(doc.createdAt),
                                    })}
                                </span>
                            )}
                        </div>
                        {doc.reviewerNote && (
                            <p className="m-0 flex items-center gap-1 text-xs text-amber-800">
                                <MessageSquareWarning size={12} className="shrink-0" aria-hidden="true"/>
                                <span>
                                    {t('adminCommerce.marketplace.providers.docReviewerNote', {
                                        note: doc.reviewerNote,
                                    })}
                                </span>
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        {canOpen ? (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => onOpenDoc(doc)}
                                rightIcon={<ExternalLink size={12} aria-hidden="true"/>}
                                className="whitespace-nowrap"
                            >
                                {t('adminCommerce.marketplace.providers.docDownloadBtn')}
                            </Button>
                        ) : (
                            <span className="rounded-badge border border-border px-2 py-1 text-[11px] text-muted">
                                {t('adminCommerce.marketplace.providers.docNoLink')}
                            </span>
                        )}
                        {canModerate && onModerateDoc && upperStatus !== 'APPROVED' && (
                            <Button
                                type="button"
                                size="sm"
                                disabled={isModeratingDoc}
                                onClick={() => onModerateDoc(doc, 'APPROVED')}
                                className="whitespace-nowrap"
                            >
                                {docStatusLabel('APPROVED')}
                            </Button>
                        )}
                        {canModerate && onModerateDoc && upperStatus !== 'REJECTED' && (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isModeratingDoc}
                                onClick={() => onModerateDoc(doc, 'REJECTED')}
                                className="whitespace-nowrap"
                            >
                                {docStatusLabel('REJECTED')}
                            </Button>
                        )}
                    </div>
                </div>
                {isImagePreview && resolvedUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={resolvedUrl}
                        alt={doc.title}
                        className="max-h-52 w-auto rounded-control border border-border object-contain"
                    />
                )}
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Document Completeness Checklist across all 8 types */}
            <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="m-0 flex items-center gap-2 text-sm font-semibold text-on-surface">
                        <FileCheck2 size={16} className="text-primary" aria-hidden="true"/>
                        {t('adminCommerce.marketplace.providers.docCoverageTitle', {
                            done: summary.requiredUploaded,
                            total: summary.requiredTotal,
                        })}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] tabular-nums">
                        <span className="rounded-badge bg-slate-900 px-2 py-0.5 font-semibold text-white">
                            {t('adminCommerce.marketplace.docStatus.APPROVED')}: {summary.approvedCount}
                        </span>
                        <span className="rounded-badge bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">
                            {t('adminCommerce.marketplace.docStatus.PENDING')}: {summary.pendingCount}
                        </span>
                        {summary.rejectedCount > 0 && (
                            <span className="rounded-badge bg-rose-50 px-2 py-0.5 font-semibold text-rose-700">
                                {t('adminCommerce.marketplace.docStatus.REJECTED')}: {summary.rejectedCount}
                            </span>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    {summary.items.map(item => {
                        const label = docTypeLabel(item.requirement.code);
                        const isRequired = item.level === 'REQUIRED';
                        const isNotApplicable = item.level === 'NOT_APPLICABLE';

                        if (isNotApplicable && !item.uploaded) {
                            return null;
                        }

                        const statusIcon = item.hasApproved ? (
                            <CheckCircle2 size={15} className="shrink-0 text-slate-900" aria-hidden="true"/>
                        ) : item.hasRejected ? (
                            <AlertCircle size={15} className="shrink-0 text-danger" aria-hidden="true"/>
                        ) : item.hasPending ? (
                            <Clock size={15} className="shrink-0 text-amber-600" aria-hidden="true"/>
                        ) : (
                            <CircleDashed
                                size={15}
                                className={`shrink-0 ${isRequired ? 'text-rose-500' : 'text-slate-400'}`}
                                aria-hidden="true"
                            />
                        );

                        return (
                            <div
                                key={item.requirement.code}
                                className={`space-y-2 rounded-panel border p-3 ${
                                    !item.uploaded && isRequired
                                        ? 'border-amber-200 bg-amber-50/40'
                                        : 'border-border bg-surface-container-low/40'
                                }`}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                                        {statusIcon}
                                        <span className="text-xs font-semibold text-on-surface">{label}</span>
                                        <span
                                            className={`rounded-badge px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${
                                                isRequired
                                                    ? 'bg-rose-50 text-rose-700'
                                                    : 'bg-slate-100 text-slate-600'
                                            }`}
                                        >
                                            {isRequired
                                                ? t('adminCommerce.marketplace.providers.docRequiredTag')
                                                : t('adminCommerce.marketplace.providers.docConditionalTag')}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span
                                            className={`rounded-badge px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
                                                item.uploaded
                                                    ? 'bg-slate-900 text-white'
                                                    : isRequired
                                                      ? 'bg-amber-100 text-amber-800'
                                                      : 'bg-slate-100 text-muted'
                                            }`}
                                        >
                                            {item.uploaded
                                                ? `${t('adminCommerce.marketplace.providers.docUploadedHint')} (${item.documents.length})`
                                                : t('adminCommerce.marketplace.providers.docMissingHint')}
                                        </span>
                                        {canModerate && !item.uploaded && isRequired && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onAppendReason(
                                                        t('adminCommerce.marketplace.providers.docMissingReasonText', {
                                                            doc: label,
                                                        }),
                                                    )
                                                }
                                                className="rounded-badge border border-amber-300 bg-card px-2 py-0.5 text-[11px] font-semibold text-amber-900 transition-colors hover:border-primary hover:text-primary"
                                            >
                                                {t('adminCommerce.marketplace.providers.docAppendMissing')}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {item.documents.length > 0 && (
                                    <div className="space-y-2 pl-5">
                                        {item.documents.map(renderDocumentCard)}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {summary.otherDocuments.length > 0 && (
                        <div className="space-y-2 rounded-panel border border-border bg-surface-container-low/40 p-3">
                            <span className="text-xs font-semibold text-on-surface">
                                {t('adminCommerce.marketplace.docType.OTHER')} ({summary.otherDocuments.length})
                            </span>
                            <div className="space-y-2">
                                {summary.otherDocuments.map(renderDocumentCard)}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Quick Admin Cross-Check Checklist + Quick Reason Chips */}
            {canModerate && (
                <section className="space-y-3 rounded-panel border border-border bg-surface-container-low/60 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                        <h4 className="m-0 flex items-center gap-1.5 text-xs font-semibold text-on-surface">
                            <ClipboardCheck size={14} className="text-primary" aria-hidden="true"/>
                            {t('adminCommerce.marketplace.providers.checklistTitle', {
                                checked: checkedCount,
                                total: CHECKLIST_KEYS.length,
                            })}
                        </h4>
                    </div>
                    <ul className="m-0 grid list-none grid-cols-1 gap-1.5 p-0">
                        {CHECKLIST_KEYS.map(key => {
                            const checked = Boolean(checkedItems[key]);
                            return (
                                <li key={key}>
                                    <label className="flex cursor-pointer items-start gap-2 rounded-control px-2 py-1.5 text-xs transition-colors hover:bg-card">
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() =>
                                                setCheckedItems(prev => ({...prev, [key]: !prev[key]}))
                                            }
                                            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-primary"
                                        />
                                        <span className={checked ? 'font-medium text-on-surface' : 'text-muted'}>
                                            {t(`adminCommerce.marketplace.providers.checklistItems.${key}`)}
                                        </span>
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                    <div className="space-y-1.5 border-t border-border pt-2.5">
                        <p className="m-0 text-[11px] font-semibold text-muted">
                            {t('adminCommerce.marketplace.providers.quickReasonsLabel')}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {QUICK_REASON_KEYS.map(reasonKey => {
                                const text = t(`adminCommerce.marketplace.providers.quickReasons.${reasonKey}`);
                                return (
                                    <button
                                        key={reasonKey}
                                        type="button"
                                        onClick={() => onAppendReason(text)}
                                        className="rounded-badge border border-slate-200 bg-card px-2.5 py-1 text-[11px] font-medium text-on-surface transition-colors hover:border-primary hover:text-primary"
                                    >
                                        + {text}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
