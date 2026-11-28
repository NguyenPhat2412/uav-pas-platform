'use client';

import {useState} from 'react';
import {
    BadgeCheck,
    Building2,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    FileUp,
    Lock,
    PauseCircle,
    RotateCcw,
    ShieldAlert,
    User,
} from 'lucide-react';
import {Card, CardContent} from '@/components/ui';
import {
    ALL_PROVIDER_DOCUMENT_REQUIREMENTS,
    type DocumentRequirementLevel,
} from '@/forms/provider-verification-checklist';
import {useI18n} from '@/providers/I18nContext';
import type {ProviderVerificationStatus} from '@/types/marketplace.types';

export function resolveVerificationStepNumber(status?: ProviderVerificationStatus | ''): 1 | 2 | 3 | 4 | 5 {
    switch (status) {
        case 'DRAFT':
            return 1;
        case 'PENDING_REVIEW':
            return 2;
        case 'VERIFIED':
            return 3;
        case 'REJECTED':
            return 4;
        case 'SUSPENDED':
            return 5;
        default:
            return 2;
    }
}

type StepState = 'completed' | 'current' | 'blocked' | 'upcoming';

function stepStateFor(step: 1 | 2 | 3 | 4 | 5, status?: ProviderVerificationStatus | ''): StepState {
    if (!status) {
        return step === 2 ? 'current' : step < 2 ? 'completed' : 'upcoming';
    }
    if (status === 'DRAFT') {
        return step === 1 ? 'current' : 'upcoming';
    }
    if (status === 'PENDING_REVIEW') {
        if (step === 1) return 'completed';
        if (step === 2) return 'current';
        return 'upcoming';
    }
    if (status === 'VERIFIED') {
        if (step <= 3) return 'completed';
        return 'upcoming';
    }
    if (status === 'REJECTED') {
        if (step <= 2) return 'completed';
        if (step === 4) return 'blocked';
        return 'upcoming';
    }
    if (status === 'SUSPENDED') {
        if (step <= 3) return 'completed';
        if (step === 5) return 'blocked';
        return 'upcoming';
    }
    return 'upcoming';
}

function RequirementPill({level, t}: { level: DocumentRequirementLevel; t: (key: string) => string }) {
    if (level === 'REQUIRED') {
        return (
            <span className="inline-flex rounded-badge bg-rose-50 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-rose-700">
                {t('adminCommerce.marketplace.providers.docRequiredTag')}
            </span>
        );
    }
    if (level === 'CONDITIONAL') {
        return (
            <span className="inline-flex rounded-badge bg-amber-50 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-amber-800">
                {t('adminCommerce.marketplace.providers.docConditionalTag')}
            </span>
        );
    }
    return (
        <span className="inline-flex rounded-badge bg-slate-100 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-slate-500">
            {t('adminCommerce.marketplace.providers.docOptionalTag')}
        </span>
    );
}

export function ProviderVerificationWorkflowCard({
    activeStatus,
    compact = false,
}: {
    activeStatus?: ProviderVerificationStatus | '';
    compact?: boolean;
}) {
    const {t, locale} = useI18n();
    const isVi = locale !== 'en';
    const [showMatrix, setShowMatrix] = useState(false);

    const docTypeLabel = (code: string) => {
        const key = `adminCommerce.marketplace.docType.${code}`;
        const val = t(key);
        return val === key ? code : val;
    };

    const individualRequired = ALL_PROVIDER_DOCUMENT_REQUIREMENTS.filter(r => r.individual === 'REQUIRED').length;
    const companyRequired = ALL_PROVIDER_DOCUMENT_REQUIREMENTS.filter(r => r.company === 'REQUIRED').length;

    const steps = [
        {
            num: 1 as const,
            status: 'DRAFT' as const,
            icon: FileUp,
            title: t('adminCommerce.marketplace.providers.workflowSteps.step1Title'),
            desc: t('adminCommerce.marketplace.providers.workflowSteps.step1Desc'),
        },
        {
            num: 2 as const,
            status: 'PENDING_REVIEW' as const,
            icon: Clock,
            title: t('adminCommerce.marketplace.providers.workflowSteps.step2Title'),
            desc: t('adminCommerce.marketplace.providers.workflowSteps.step2Desc'),
        },
        {
            num: 3 as const,
            status: 'VERIFIED' as const,
            icon: BadgeCheck,
            title: t('adminCommerce.marketplace.providers.workflowSteps.step3Title'),
            desc: t('adminCommerce.marketplace.providers.workflowSteps.step3Desc'),
        },
        {
            num: 4 as const,
            status: 'REJECTED' as const,
            icon: RotateCcw,
            title: t('adminCommerce.marketplace.providers.workflowSteps.step4Title'),
            desc: t('adminCommerce.marketplace.providers.workflowSteps.step4Desc'),
        },
        {
            num: 5 as const,
            status: 'SUSPENDED' as const,
            icon: PauseCircle,
            title: t('adminCommerce.marketplace.providers.workflowSteps.step5Title'),
            desc: t('adminCommerce.marketplace.providers.workflowSteps.step5Desc'),
        },
    ];

    const body = (
        <div className={compact ? 'space-y-3' : 'space-y-3.5 p-4 sm:p-5'}>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <h2 className="m-0 text-sm font-semibold text-on-surface">
                        {t('adminCommerce.marketplace.providers.workflowTitle')}
                    </h2>
                    {!compact && (
                        <p className="m-0 mt-0.5 text-xs text-muted">
                            {t('adminCommerce.marketplace.providers.workflowSubtitle')}
                        </p>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {activeStatus && (
                        <span
                            className={`rounded-badge px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${
                                activeStatus === 'VERIFIED'
                                    ? 'bg-slate-900 text-white'
                                    : activeStatus === 'PENDING_REVIEW'
                                      ? 'bg-amber-100 text-amber-800'
                                      : activeStatus === 'DRAFT'
                                        ? 'bg-slate-100 text-slate-700'
                                        : 'bg-rose-100 text-danger'
                            }`}
                        >
                            {t(`adminCommerce.marketplace.providerStatus.${activeStatus}`)}
                        </span>
                    )}
                    {!compact && (
                        <button
                            type="button"
                            aria-expanded={showMatrix}
                            onClick={() => setShowMatrix(prev => !prev)}
                            className="inline-flex items-center gap-1.5 rounded-control border border-border bg-card px-2.5 py-1 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container-low"
                        >
                            <span>
                                {showMatrix
                                    ? t('adminCommerce.marketplace.providers.workflowHideMatrix')
                                    : t('adminCommerce.marketplace.providers.workflowShowMatrix')}
                            </span>
                            {showMatrix ? <ChevronUp size={13} aria-hidden="true"/> : <ChevronDown size={13} aria-hidden="true"/>}
                        </button>
                    )}
                </div>
            </div>

            <ol
                className={`m-0 grid list-none grid-cols-1 gap-2 p-0 ${
                    compact ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-5'
                }`}
            >
                {steps.map(step => {
                    const state = stepStateFor(step.num, activeStatus);
                    const Icon = step.icon;
                    const shellClass =
                        state === 'current'
                            ? 'border-primary bg-[var(--uav-color-primary-light)]'
                            : state === 'blocked'
                              ? 'border-rose-300 bg-rose-50/70'
                              : state === 'completed'
                                ? 'border-slate-300 bg-slate-50/90'
                                : 'border-border bg-card';
                    const iconClass =
                        state === 'current'
                            ? 'bg-primary text-white'
                            : state === 'blocked'
                              ? 'bg-danger text-white'
                              : state === 'completed'
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-100 text-slate-500';

                    return (
                        <li key={step.num} className={`rounded-panel border p-2.5 transition-colors ${shellClass}`}>
                            <div className="flex items-start gap-2">
                                <span
                                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-control ${iconClass}`}
                                >
                                    {state === 'completed' ? (
                                        <CheckCircle2 size={13} aria-hidden="true"/>
                                    ) : state === 'blocked' ? (
                                        <ShieldAlert size={13} aria-hidden="true"/>
                                    ) : (
                                        <Icon size={13} aria-hidden="true"/>
                                    )}
                                </span>
                                <div className="min-w-0 flex-1 space-y-0.5">
                                    <div className="flex flex-wrap items-center justify-between gap-1">
                                        <strong className="text-xs font-semibold text-on-surface">{step.title}</strong>
                                        {state === 'current' && activeStatus && (
                                            <span className="rounded-badge bg-primary px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-white">
                                                {t('adminCommerce.marketplace.providers.workflowCurrentBadge')}
                                            </span>
                                        )}
                                        {state === 'blocked' && (
                                            <span className="rounded-badge bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-danger">
                                                {t('adminCommerce.marketplace.providers.workflowBlockedBadge')}
                                            </span>
                                        )}
                                    </div>
                                    <p className="m-0 text-[11px] leading-snug text-muted">{step.desc}</p>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ol>

            {!compact && showMatrix && (
                <div className="space-y-2.5 rounded-panel border border-border bg-surface-container-low/50 p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="m-0 text-xs font-semibold text-on-surface">
                            {t('adminCommerce.marketplace.providers.workflowMatrixTitle')}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                            <span className="inline-flex items-center gap-1">
                                <User size={13} aria-hidden="true"/>
                                {t('adminCommerce.marketplace.providerType.INDIVIDUAL')}:{' '}
                                <strong className="text-on-surface">{individualRequired}/8</strong>
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <Building2 size={13} aria-hidden="true"/>
                                {t('adminCommerce.marketplace.providerType.COMPANY')}:{' '}
                                <strong className="text-on-surface">{companyRequired}/8</strong>
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-control border border-border bg-card">
                        <table className="w-full border-collapse text-left text-xs">
                            <thead>
                                <tr className="border-b border-border bg-surface-container-low text-muted">
                                    <th className="px-3 py-2 font-semibold">
                                        {isVi ? 'Loại giấy tờ (8 hạng mục)' : 'Document type (8 items)'}
                                    </th>
                                    <th className="px-3 py-2 font-semibold">
                                        {isVi ? 'Mục đích thẩm định' : 'Verification scope'}
                                    </th>
                                    <th className="px-3 py-2 text-center font-semibold">
                                        {t('adminCommerce.marketplace.providerType.INDIVIDUAL')}
                                    </th>
                                    <th className="px-3 py-2 text-center font-semibold">
                                        {t('adminCommerce.marketplace.providerType.COMPANY')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {ALL_PROVIDER_DOCUMENT_REQUIREMENTS.map(req => (
                                    <tr key={req.code}>
                                        <td className="px-3 py-2 font-semibold text-on-surface">
                                            {docTypeLabel(req.code)}
                                        </td>
                                        <td className="px-3 py-2 text-muted">
                                            {isVi ? req.purposeVi : req.purposeEn}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <RequirementPill level={req.individual} t={t}/>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <RequirementPill level={req.company} t={t}/>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {!compact && (
                <p className="m-0 flex items-center gap-1.5 text-[11px] text-muted">
                    <Lock size={12} className="shrink-0 text-slate-500" aria-hidden="true"/>
                    <span>{t('adminCommerce.marketplace.providers.workflowEncryptionHint')}</span>
                </p>
            )}
        </div>
    );

    if (compact) {
        return <section className="rounded-panel border border-border bg-surface-container-low/50 p-3.5">{body}</section>;
    }

    return (
        <Card>
            <CardContent className="p-0">{body}</CardContent>
        </Card>
    );
}
