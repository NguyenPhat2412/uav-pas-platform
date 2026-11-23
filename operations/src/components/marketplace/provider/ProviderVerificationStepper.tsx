'use client';

import {
    AlertCircle,
    BadgeCheck,
    Building2,
    CheckCircle2,
    CircleDashed,
    Clock,
    FileCheck2,
    MessageSquareWarning,
    Rocket,
    ShieldAlert,
    Upload,
} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';
import type {
    ProviderDocument,
    ProviderDocumentType,
    ProviderProfile,
    ProviderType,
    ProviderVerificationStatus,
} from '@/types/marketplace/marketplace.types';

export type DocRequirementLevel = 'REQUIRED' | 'CONDITIONAL' | 'NOT_APPLICABLE';

export interface ProviderDocRule {
    code: ProviderDocumentType;
    individual: DocRequirementLevel;
    company: DocRequirementLevel;
}

export const PROVIDER_DOCUMENT_RULES: readonly ProviderDocRule[] = [
    {code: 'IDENTITY_CARD', individual: 'REQUIRED', company: 'REQUIRED'},
    {code: 'BUSINESS_LICENSE', individual: 'NOT_APPLICABLE', company: 'REQUIRED'},
    {code: 'PILOT_CERTIFICATE', individual: 'REQUIRED', company: 'REQUIRED'},
    {code: 'UAV_REGISTRATION', individual: 'REQUIRED', company: 'REQUIRED'},
    {code: 'INSURANCE_POLICY', individual: 'REQUIRED', company: 'REQUIRED'},
    {code: 'FLIGHT_OPERATION_PERMIT', individual: 'CONDITIONAL', company: 'CONDITIONAL'},
    {code: 'PLATFORM_FEE_AGREEMENT', individual: 'REQUIRED', company: 'REQUIRED'},
    {code: 'TAX_SETTLEMENT_DOSSIER', individual: 'CONDITIONAL', company: 'REQUIRED'},
] as const;

export function getRequiredDocStats(providerType: ProviderType, documents: ProviderDocument[]) {
    const uploadedTypes = new Set(documents.map(d => d.documentType));
    const requiredRules = PROVIDER_DOCUMENT_RULES.filter(
        r => (providerType === 'COMPANY' ? r.company : r.individual) === 'REQUIRED',
    );
    const uploadedCount = requiredRules.filter(r => uploadedTypes.has(r.code)).length;
    return {uploaded: uploadedCount, total: requiredRules.length};
}

function resolveStageStates(
    status: ProviderVerificationStatus,
    profileDone: boolean,
    requiredDocsDone: boolean,
): Array<'completed' | 'current' | 'blocked' | 'upcoming'> {
    if (status === 'VERIFIED') {
        return ['completed', 'completed', 'completed', 'completed', 'current'];
    }
    if (status === 'SUSPENDED') {
        return ['completed', 'completed', 'completed', 'blocked', 'upcoming'];
    }
    if (status === 'REJECTED') {
        return ['completed', 'blocked', 'upcoming', 'upcoming', 'upcoming'];
    }
    if (status === 'PENDING_REVIEW') {
        return ['completed', 'completed', 'current', 'upcoming', 'upcoming'];
    }
    // DRAFT
    if (!profileDone) return ['current', 'upcoming', 'upcoming', 'upcoming', 'upcoming'];
    if (!requiredDocsDone) return ['completed', 'current', 'upcoming', 'upcoming', 'upcoming'];
    return ['completed', 'completed', 'current', 'upcoming', 'upcoming'];
}

export function ProviderVerificationStepper({
    profile,
    providerType,
    profileDone,
}: {
    profile: ProviderProfile | null;
    providerType: ProviderType;
    profileDone: boolean;
}) {
    const {t} = useI18n();
    const status: ProviderVerificationStatus = profile?.verificationStatus ?? 'DRAFT';
    const docs = profile?.documents ?? [];
    const reqStats = getRequiredDocStats(providerType, docs);
    const states = resolveStageStates(status, profileDone, reqStats.uploaded >= reqStats.total && reqStats.total > 0);

    const steps = [
        {key: 'step1', icon: Building2, label: t('opsMarketplace.onboarding.progress.step1')},
        {key: 'step2', icon: FileCheck2, label: t('opsMarketplace.onboarding.progress.step2')},
        {key: 'step3', icon: Clock, label: t('opsMarketplace.onboarding.progress.step3')},
        {key: 'step4', icon: BadgeCheck, label: t('opsMarketplace.onboarding.progress.step4')},
        {key: 'step5', icon: Rocket, label: t('opsMarketplace.onboarding.progress.step5')},
    ];

    const nextKey =
        status === 'VERIFIED'
            ? 'nextVerified'
            : status === 'PENDING_REVIEW'
              ? 'nextPending'
              : status === 'REJECTED'
                ? 'nextRejected'
                : status === 'SUSPENDED'
                  ? 'nextSuspended'
                  : 'nextDraft';

    return (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-xs font-bold uppercase tracking-wide text-slate-800">
                    {t('opsMarketplace.onboarding.progress.title')}
                </strong>
                <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
                        reqStats.uploaded >= reqStats.total
                            ? 'bg-slate-900 text-white'
                            : 'bg-amber-50 text-amber-800'
                    }`}
                >
                    {t('opsMarketplace.onboarding.progress.requiredSummary', {
                        uploaded: reqStats.uploaded,
                        total: reqStats.total,
                    })}
                </span>
            </div>

            <ol className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-5">
                {steps.map((item, idx) => {
                    const state = states[idx];
                    const Icon = item.icon;
                    const cardClass =
                        state === 'current'
                            ? 'border-primary bg-uav-red-light text-primary'
                            : state === 'blocked'
                              ? 'border-rose-300 bg-rose-50 text-danger'
                              : state === 'completed'
                                ? 'border-slate-300 bg-slate-50 text-slate-900'
                                : 'border-slate-200 bg-white text-slate-500';
                    const dotClass =
                        state === 'current'
                            ? 'bg-primary text-white'
                            : state === 'blocked'
                              ? 'bg-danger text-white'
                              : state === 'completed'
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-100 text-slate-400';

                    return (
                        <li
                            key={item.key}
                            className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-xs font-semibold ${cardClass}`}
                        >
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${dotClass}`}>
                                {state === 'completed' ? (
                                    <CheckCircle2 size={13} aria-hidden="true"/>
                                ) : state === 'blocked' ? (
                                    <ShieldAlert size={13} aria-hidden="true"/>
                                ) : (
                                    <Icon size={13} aria-hidden="true"/>
                                )}
                            </span>
                            <span className="leading-tight">{item.label}</span>
                        </li>
                    );
                })}
            </ol>

            <p
                className={`m-0 rounded-xl px-3 py-2 text-xs ${
                    status === 'REJECTED' || status === 'SUSPENDED'
                        ? 'border border-rose-200 bg-rose-50 text-danger'
                        : status === 'VERIFIED'
                          ? 'border border-slate-300 bg-slate-100 text-slate-900'
                          : 'bg-slate-50 text-slate-700'
                }`}
            >
                <strong className="mr-1">{t('opsMarketplace.onboarding.progress.nextStepLabel')}</strong>
                {t(`opsMarketplace.onboarding.progress.${nextKey}`)}
            </p>
        </div>
    );
}

export function ProviderDocumentChecklist({
    providerType,
    documents,
    onSelectType,
}: {
    providerType: ProviderType;
    documents: ProviderDocument[];
    onSelectType: (code: ProviderDocumentType) => void;
}) {
    const {t} = useI18n();
    const docsByType = new Map<ProviderDocumentType, ProviderDocument[]>();
    for (const doc of documents) {
        const list = docsByType.get(doc.documentType) ?? [];
        list.push(doc);
        docsByType.set(doc.documentType, list);
    }

    const reqStats = getRequiredDocStats(providerType, documents);
    const visibleRules = PROVIDER_DOCUMENT_RULES.filter(rule => {
        const level = providerType === 'COMPANY' ? rule.company : rule.individual;
        return level !== 'NOT_APPLICABLE' || (docsByType.get(rule.code)?.length ?? 0) > 0;
    });

    return (
        <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h3 className="m-0 text-xs font-bold text-slate-900">
                        {t('opsMarketplace.onboarding.checklist.title', {
                            uploaded: reqStats.uploaded,
                            total: reqStats.total,
                        })}
                    </h3>
                    <p className="m-0 mt-0.5 text-[11px] text-slate-500">
                        {t('opsMarketplace.onboarding.checklist.subtitle')}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {visibleRules.map(rule => {
                    const level = providerType === 'COMPANY' ? rule.company : rule.individual;
                    const matched = docsByType.get(rule.code) ?? [];
                    const isRequired = level === 'REQUIRED';
                    const latest = matched[0];
                    const hasApproved = matched.some(d => d.status === 'APPROVED');
                    const hasRejected = matched.some(d => d.status === 'REJECTED');
                    const rejectedNote = matched.find(d => d.status === 'REJECTED' && d.reviewerNote)?.reviewerNote;

                    const badge = hasApproved ? (
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                            {t('opsMarketplace.onboarding.documents.status.APPROVED')}
                        </span>
                    ) : hasRejected ? (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-danger">
                            {t('opsMarketplace.onboarding.documents.status.REJECTED')}
                        </span>
                    ) : latest ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                            {t('opsMarketplace.onboarding.documents.status.PENDING')}
                        </span>
                    ) : (
                        <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            {t('opsMarketplace.onboarding.checklist.missing')}
                        </span>
                    );

                    return (
                        <div
                            key={rule.code}
                            className={`flex flex-col justify-between gap-2 rounded-xl border bg-white p-3 text-xs ${
                                hasRejected
                                    ? 'border-rose-300'
                                    : !latest && isRequired
                                      ? 'border-amber-200'
                                      : 'border-slate-200'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2 min-w-0">
                                    {hasApproved ? (
                                        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-slate-900" aria-hidden="true"/>
                                    ) : hasRejected ? (
                                        <AlertCircle size={15} className="mt-0.5 shrink-0 text-danger" aria-hidden="true"/>
                                    ) : latest ? (
                                        <Clock size={15} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true"/>
                                    ) : (
                                        <CircleDashed
                                            size={15}
                                            className={`mt-0.5 shrink-0 ${isRequired ? 'text-amber-600' : 'text-slate-400'}`}
                                            aria-hidden="true"
                                        />
                                    )}
                                    <div className="min-w-0">
                                        <div className="font-semibold text-slate-900 leading-snug">
                                            {t(`opsMarketplace.onboarding.documents.types.${rule.code}`)}
                                        </div>
                                        <span
                                            className={`mt-0.5 inline-block text-[10px] font-semibold ${
                                                isRequired ? 'text-rose-700' : 'text-slate-500'
                                            }`}
                                        >
                                            {isRequired
                                                ? t('opsMarketplace.onboarding.checklist.required')
                                                : t('opsMarketplace.onboarding.checklist.conditional')}
                                        </span>
                                    </div>
                                </div>
                                <div className="shrink-0">{badge}</div>
                            </div>

                            {rejectedNote && (
                                <p className="m-0 flex items-start gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] text-danger">
                                    <MessageSquareWarning size={12} className="mt-0.5 shrink-0" aria-hidden="true"/>
                                    <span>
                                        {t('opsMarketplace.onboarding.checklist.reviewerFeedback', {
                                            note: rejectedNote,
                                        })}
                                    </span>
                                </p>
                            )}

                            {(!latest || hasRejected) && (
                                <button
                                    type="button"
                                    onClick={() => onSelectType(rule.code)}
                                    className="inline-flex w-fit items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-800 transition-colors hover:border-primary hover:text-primary"
                                >
                                    <Upload size={11} aria-hidden="true"/>
                                    {t('opsMarketplace.onboarding.checklist.uploadNow')}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
