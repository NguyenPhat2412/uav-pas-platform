'use client';

import {
    CheckCircle2,
    Landmark,
    MapPin,
    PauseCircle,
    Phone,
    RotateCcw,
    ShieldCheck,
} from 'lucide-react';
import {Drawer, Metadata} from '@/components/data/Drawer';
import {Button, OptionalMark} from '@/components/ui';
import {IllustrativeTag} from '@/components/marketplace/MarketplaceShared';
import {ProviderDocumentReviewList} from '@/components/marketplace/ProviderDocumentReviewList';
import {ProviderVerificationWorkflowCard} from '@/components/marketplace/ProviderVerificationWorkflowCard';
import {sanitizeMarketplaceText} from '@/forms/admin-marketplace-form';
import {useI18n} from '@/providers/I18nContext';
import type {
    AdminProviderDocument,
    AdminProviderProfile,
    ProviderVerificationStatus,
} from '@/types/marketplace.types';

export function ProviderKycDrawer({
    provider,
    defaultFeePct,
    noteValue,
    feeValue,
    canModerate,
    isPending,
    isModeratingDoc = false,
    onNoteChange,
    onFeeChange,
    onModerate,
    onModerateDoc,
    onOpenDoc,
    onClose,
}: {
    provider: AdminProviderProfile;
    defaultFeePct: string;
    noteValue: string;
    feeValue: string;
    canModerate: boolean;
    isPending: boolean;
    isModeratingDoc?: boolean;
    onNoteChange: (val: string) => void;
    onFeeChange: (val: string) => void;
    onModerate: (status: ProviderVerificationStatus) => void;
    onModerateDoc?: (doc: AdminProviderDocument, status: 'APPROVED' | 'REJECTED') => void;
    onOpenDoc: (doc: AdminProviderDocument) => void;
    onClose: () => void;
}) {
    const {t, formatDate} = useI18n();

    const handleAppendReason = (reason: string) => {
        const trimmed = noteValue.trim();
        if (trimmed.includes(reason)) return;
        onNoteChange(trimmed ? `${trimmed} ${reason}` : reason);
    };

    return (
        <Drawer
            wide
            title={t('adminCommerce.marketplace.providers.drawerTitle', {name: sanitizeMarketplaceText(provider.displayName)})}
            onClose={onClose}
        >
            <ProviderVerificationWorkflowCard activeStatus={provider.verificationStatus} compact/>

            <section className="space-y-3">
                <h3 className="m-0 flex items-center gap-2 text-sm font-semibold text-on-surface">
                    <ShieldCheck size={16} className="text-primary" aria-hidden="true"/>
                    {t('adminCommerce.marketplace.providers.sectionProfile')}
                </h3>
                <Metadata
                    items={[
                        [
                            t('adminCommerce.marketplace.providers.account'),
                            provider.username || t('adminCommerce.marketplace.providers.platform1p'),
                        ],
                        [
                            t('adminCommerce.marketplace.providers.area'),
                            <span key="area" className="inline-flex items-center gap-1">
                                <MapPin size={13} aria-hidden="true" className="text-muted"/>
                                {provider.province} ({t('adminCommerce.marketplace.providers.radiusKm', {km: provider.serviceRadiusKm})})
                            </span>,
                        ],
                        [t('adminCommerce.marketplace.providers.taxId'), provider.taxOrIdNumber || '—'],
                        [t('adminCommerce.marketplace.providers.flightLicense'), provider.flightLicenseNumber || '—'],
                        [
                            t('adminCommerce.marketplace.providers.phone'),
                            provider.contactPhone ? (
                                <span key="phone" className="inline-flex items-center gap-1 tabular-nums">
                                    <Phone size={13} aria-hidden="true" className="text-muted"/>
                                    {provider.contactPhone}
                                </span>
                            ) : (
                                '—'
                            ),
                        ],
                        [
                            t('adminCommerce.marketplace.providers.bankPayout'),
                            provider.bankAccountNumber ? (
                                <span key="bank" className="inline-flex flex-wrap items-center gap-1.5 tabular-nums">
                                    <Landmark size={13} aria-hidden="true" className="text-muted"/>
                                    <span>
                                        {provider.bankName} · {provider.bankAccountNumber} ({sanitizeMarketplaceText(provider.bankAccountHolder)})
                                    </span>
                                    <IllustrativeTag/>
                                </span>
                            ) : (
                                t('adminCommerce.marketplace.providers.bankMissing')
                            ),
                        ],
                        [
                            t('adminCommerce.marketplace.providers.feeRate'),
                            <span key="fee" className="inline-flex items-center gap-1.5 tabular-nums">
                                <span>
                                    {provider.commissionRateOverride != null
                                        ? `${(Number(provider.commissionRateOverride) * 100).toFixed(1)}%`
                                        : t('adminCommerce.marketplace.providers.defaultFee', {pct: defaultFeePct})}
                                </span>
                                <IllustrativeTag/>
                            </span>,
                        ],
                        [
                            t('adminCommerce.marketplace.providerStatus.VERIFIED'),
                            provider.verifiedBy && provider.verifiedAt
                                ? t('adminCommerce.marketplace.providers.verifiedInfo', {
                                      by: provider.verifiedBy,
                                      at: formatDate(provider.verifiedAt),
                                  })
                                : t(`adminCommerce.marketplace.providerStatus.${provider.verificationStatus}`),
                        ],
                    ]}
                />
                {provider.bio && (
                    <p className="m-0 rounded-panel border border-border bg-slate-50/70 p-3 text-xs text-muted">
                        {sanitizeMarketplaceText(provider.bio)}
                    </p>
                )}
            </section>

            <ProviderDocumentReviewList
                provider={provider}
                canModerate={canModerate}
                isModeratingDoc={isModeratingDoc}
                onOpenDoc={onOpenDoc}
                onModerateDoc={onModerateDoc}
                onAppendReason={handleAppendReason}
            />

            {canModerate && (
                <section className="uav-bezel">
                    <div className="uav-bezel-core space-y-3 p-4">
                        <div className="space-y-1">
                            <h3 className="m-0 text-sm font-semibold text-on-surface">
                                {t('adminCommerce.marketplace.providers.sectionModerate')}
                            </h3>
                            <p className="m-0 text-xs text-muted">
                                {t('adminCommerce.marketplace.providers.moderationHint')}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <label className="space-y-1 text-xs font-semibold text-on-surface sm:col-span-2">
                                <span className="block">
                                    {t('adminCommerce.marketplace.providers.noteLabel')}
                                    <OptionalMark/>
                                </span>
                                <input
                                    type="text"
                                    value={noteValue}
                                    onChange={e => onNoteChange(e.target.value)}
                                    placeholder={t('adminCommerce.marketplace.providers.notePlaceholder')}
                                    className="h-9 w-full rounded-control border border-border-input bg-card px-3 text-xs font-normal"
                                />
                            </label>
                            <label className="space-y-1 text-xs font-semibold text-on-surface">
                                <span className="flex flex-wrap items-center gap-1 leading-snug">
                                    {t('adminCommerce.marketplace.providers.feeInputLabel')}
                                    <OptionalMark/>
                                </span>
                                <input
                                    type="number"
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
                        <div className="flex flex-wrap items-center justify-end gap-2">
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
                                leftIcon={<RotateCcw size={14} aria-hidden="true"/>}
                                onClick={() => onModerate('REJECTED')}
                                className="whitespace-nowrap"
                            >
                                {t('adminCommerce.marketplace.providers.requestRevisionBtn')}
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
                </section>
            )}
        </Drawer>
    );
}
