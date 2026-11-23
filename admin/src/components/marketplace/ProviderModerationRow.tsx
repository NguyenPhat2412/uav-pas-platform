'use client';

import {CheckCircle2, Eye, FileText, MapPin, PauseCircle, Star, XCircle} from 'lucide-react';
import {Button, OptionalMark} from '@/components/ui';
import {IllustrativeTag} from '@/components/marketplace/MarketplaceShared';
import {resolveVerificationStepNumber} from '@/components/marketplace/ProviderVerificationWorkflowCard';
import {sanitizeMarketplaceText} from '@/forms/marketplace/admin-marketplace-form';
import {computeProviderDocumentChecklist} from '@/forms/marketplace/provider-verification-checklist';
import {useI18n} from '@/providers/I18nContext';
import type {
    AdminProviderDocument,
    AdminProviderProfile,
    ProviderVerificationStatus,
} from '@/types/marketplace/marketplace.types';

export function ProviderModerationRow({
    provider,
    defaultFeePct,
    noteValue,
    feeValue,
    canModerate,
    isPending,
    onNoteChange,
    onFeeChange,
    onInspect,
    onOpenDoc,
    onModerate,
}: {
    provider: AdminProviderProfile;
    defaultFeePct: string;
    noteValue: string;
    feeValue: string;
    canModerate: boolean;
    isPending: boolean;
    onNoteChange: (val: string) => void;
    onFeeChange: (val: string) => void;
    onInspect: () => void;
    onOpenDoc: (doc: AdminProviderDocument) => void;
    onModerate: (status: ProviderVerificationStatus) => void;
}) {
    const {t} = useI18n();
    const docs = provider.documents ?? [];
    const checklist = computeProviderDocumentChecklist(provider.providerType, docs);
    const feeDisplay =
        provider.commissionRateOverride != null
            ? `${(Number(provider.commissionRateOverride) * 100).toFixed(1)}%`
            : t('adminCommerce.marketplace.providers.defaultFee', {pct: defaultFeePct});

    return (
        <div className="space-y-3 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <strong className="line-clamp-2 text-base font-semibold text-on-surface">
                            {sanitizeMarketplaceText(provider.displayName)}
                        </strong>
                        <span className="rounded-badge bg-surface-container-low px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-on-surface">
                            {t(`adminCommerce.marketplace.providerType.${provider.providerType}`)}
                        </span>
                        <span
                            className={`rounded-badge px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
                                provider.verificationStatus === 'VERIFIED'
                                    ? 'bg-slate-900 text-white'
                                    : provider.verificationStatus === 'PENDING_REVIEW'
                                      ? 'bg-amber-100 text-amber-800'
                                      : provider.verificationStatus === 'DRAFT'
                                        ? 'bg-slate-100 text-slate-700'
                                        : 'bg-rose-100 text-danger'
                            }`}
                        >
                            {t(`adminCommerce.marketplace.providerStatus.${provider.verificationStatus}`)}
                        </span>
                        <span className="rounded-badge border border-border bg-card px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-muted tabular-nums">
                            {t('adminCommerce.marketplace.providers.stepProgressChip', {
                                step: resolveVerificationStepNumber(provider.verificationStatus),
                            })}
                        </span>
                        <span
                            className={`rounded-badge px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap tabular-nums ${
                                checklist.requiredMissing.length === 0
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-amber-50 text-amber-800'
                            }`}
                        >
                            {t('adminCommerce.marketplace.providers.completenessChip', {
                                uploaded: checklist.requiredUploaded,
                                total: checklist.requiredTotal,
                            })}
                        </span>
                    </div>
                    {provider.reviewNote && (
                        <p className="m-0 text-xs text-muted">
                            {t('adminCommerce.marketplace.providers.reviewNoteCurrent', {
                                note: sanitizeMarketplaceText(provider.reviewNote),
                            })}
                        </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted tabular-nums">
                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                            <MapPin size={13} aria-hidden="true"/>
                            {provider.province || '—'} · {t('adminCommerce.marketplace.providers.radiusKm', {km: provider.serviceRadiusKm ?? 0})}
                        </span>
                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                            <Star size={13} className="text-amber-500" aria-hidden="true"/>
                            {Number(provider.ratingAvg ?? 0).toFixed(1)} ·{' '}
                            {t('adminCommerce.marketplace.providers.completedFlights', {count: provider.completedMissionsCount ?? 0})}
                        </span>
                        {provider.taxOrIdNumber && (
                            <span className="whitespace-nowrap">
                                {t('adminCommerce.marketplace.providers.taxId')}: {provider.taxOrIdNumber}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 sm:justify-end">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted tabular-nums whitespace-nowrap">
                        <strong className="text-on-surface">{feeDisplay}</strong>
                        <IllustrativeTag/>
                    </span>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        leftIcon={<Eye size={14} aria-hidden="true"/>}
                        onClick={onInspect}
                        className="whitespace-nowrap"
                    >
                        {t('adminCommerce.marketplace.providers.viewDocs', {count: docs.length})}
                    </Button>
                </div>
            </div>

            {docs.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {docs.map(doc => {
                        const typeKey = `adminCommerce.marketplace.docType.${doc.documentType}`;
                        const typeLabel = t(typeKey) === typeKey ? doc.documentType : t(typeKey);
                        const statusKey = `adminCommerce.marketplace.docStatus.${doc.status}`;
                        const statusLabel = t(statusKey) === statusKey ? doc.status : t(statusKey);
                        return (
                            <button
                                key={doc.id}
                                type="button"
                                onClick={() => onOpenDoc(doc)}
                                className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-control border border-slate-200 bg-surface-container-low px-2.5 py-1 text-xs text-on-surface transition-colors hover:border-slate-400"
                            >
                                <FileText size={13} className="shrink-0 text-primary" aria-hidden="true"/>
                                <strong className="truncate">{sanitizeMarketplaceText(doc.title)}</strong>
                                <span className="text-[11px] text-muted">· {typeLabel}</span>
                                <span className="rounded-badge bg-card px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                                    {statusLabel}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {canModerate && (
                <div className="uav-bezel">
                    <div className="uav-bezel-core flex flex-wrap items-end justify-between gap-3 p-3.5">
                        <div className="flex flex-1 flex-wrap items-end gap-2.5">
                            <label className="min-w-[200px] flex-1 space-y-1 text-xs font-semibold text-on-surface">
                                <span className="block">
                                    {t('adminCommerce.marketplace.providers.noteLabel')}
                                    <OptionalMark/>
                                </span>
                                <input
                                    type="text"
                                    aria-label={`${t('adminCommerce.marketplace.providers.noteLabel')} ${provider.displayName}`}
                                    value={noteValue}
                                    onChange={e => onNoteChange(e.target.value)}
                                    placeholder={t('adminCommerce.marketplace.providers.notePlaceholder')}
                                    className="h-9 w-full rounded-control border border-border-input bg-card px-3 text-xs font-normal"
                                />
                            </label>
                            <label className="w-full space-y-1 text-xs font-semibold text-on-surface sm:w-48">
                                <span className="block leading-snug">
                                    {t('adminCommerce.marketplace.providers.feeInputLabel')}
                                    <OptionalMark/>
                                </span>
                                <input
                                    type="number"
                                    aria-label={`${t('adminCommerce.marketplace.providers.feeInputLabel')} ${provider.displayName}`}
                                    min={0}
                                    max={50}
                                    step={0.5}
                                    value={feeValue}
                                    onChange={e => onFeeChange(e.target.value)}
                                    placeholder={t('adminCommerce.marketplace.providers.feePlaceholder')}
                                    className="h-9 w-full rounded-control border border-border-input bg-card px-3 text-xs font-normal tabular-nums"
                                />
                            </label>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                size="sm"
                                disabled={isPending}
                                leftIcon={<CheckCircle2 size={14} aria-hidden="true"/>}
                                onClick={() => onModerate('VERIFIED')}
                                className="whitespace-nowrap"
                            >
                                {t('adminCommerce.marketplace.providers.approveBtn')}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isPending}
                                leftIcon={<XCircle size={14} aria-hidden="true"/>}
                                onClick={() => onModerate('REJECTED')}
                                className="whitespace-nowrap"
                            >
                                {t('adminCommerce.marketplace.providers.rejectBtn')}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="danger"
                                disabled={isPending}
                                leftIcon={<PauseCircle size={14} aria-hidden="true"/>}
                                onClick={() => onModerate('SUSPENDED')}
                                className="whitespace-nowrap"
                            >
                                {t('adminCommerce.marketplace.providers.suspendBtn')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
