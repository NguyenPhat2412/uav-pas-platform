'use client';

import {
    CheckCircle2,
    ExternalLink,
    FileCheck2,
    FileText,
    Landmark,
    MapPin,
    PauseCircle,
    Phone,
    ShieldCheck,
    XCircle,
} from 'lucide-react';
import {Drawer, Metadata} from '@/components/data/Drawer';
import {Button, OptionalMark} from '@/components/ui';
import {IllustrativeTag} from '@/components/marketplace/MarketplaceShared';
import {sanitizeMarketplaceText} from '@/forms/marketplace/admin-marketplace-form';
import {useI18n} from '@/providers/I18nContext';
import type {
    AdminProviderDocument,
    AdminProviderProfile,
    ProviderVerificationStatus,
} from '@/types/marketplace/marketplace.types';

export function ProviderKycDrawer({
    provider,
    defaultFeePct,
    noteValue,
    feeValue,
    canModerate,
    isPending,
    onNoteChange,
    onFeeChange,
    onModerate,
    onOpenDoc,
    onClose,
}: {
    provider: AdminProviderProfile;
    defaultFeePct: string;
    noteValue: string;
    feeValue: string;
    canModerate: boolean;
    isPending: boolean;
    onNoteChange: (val: string) => void;
    onFeeChange: (val: string) => void;
    onModerate: (status: ProviderVerificationStatus) => void;
    onOpenDoc: (doc: AdminProviderDocument) => void;
    onClose: () => void;
}) {
    const {t, formatDate} = useI18n();
    const docs = provider.documents ?? [];
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

    return (
        <Drawer
            wide
            title={t('adminCommerce.marketplace.providers.drawerTitle', {name: sanitizeMarketplaceText(provider.displayName)})}
            onClose={onClose}
        >
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
                                        {provider.bankName} · {provider.bankAccountNumber} ({provider.bankAccountHolder})
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

            <section className="space-y-3">
                <h3 className="m-0 flex items-center gap-2 text-sm font-semibold text-on-surface">
                    <FileCheck2 size={16} className="text-primary" aria-hidden="true"/>
                    {t('adminCommerce.marketplace.providers.sectionDocs')} ({docs.length})
                </h3>
                {docs.length === 0 ? (
                    <div className="rounded-panel border border-dashed border-border p-5 text-center text-xs text-muted">
                        {t('adminCommerce.marketplace.providers.noDocs')}
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {docs.map(doc => {
                            const canOpen = Boolean(
                                (doc.fileUrl && /^https?:\/\//i.test(doc.fileUrl)) || doc.mediaAssetId,
                            );
                            const isImagePreview = Boolean(
                                doc.fileUrl && /^https?:\/\/.+\.(?:png|jpe?g|webp)(\?.*)?$/i.test(doc.fileUrl),
                            );
                            return (
                                <div
                                    key={doc.id}
                                    className="space-y-2 rounded-panel border border-border bg-card p-3.5"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="min-w-0 space-y-0.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <FileText size={14} className="shrink-0 text-primary" aria-hidden="true"/>
                                                <strong className="text-sm font-semibold text-on-surface">
                                                    {doc.title}
                                                </strong>
                                                <span className="rounded-badge bg-slate-100 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-on-surface">
                                                    {docTypeLabel(doc.documentType)}
                                                </span>
                                                <span className="rounded-badge border border-slate-200 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-muted">
                                                    {docStatusLabel(doc.status)}
                                                </span>
                                            </div>
                                            {doc.documentNumber && (
                                                <p className="m-0 font-mono text-xs text-muted">
                                                    {t('adminCommerce.marketplace.providers.docNumber', {
                                                        num: doc.documentNumber,
                                                    })}
                                                </p>
                                            )}
                                        </div>
                                        {canOpen && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => onOpenDoc(doc)}
                                                rightIcon={<ExternalLink size={13} aria-hidden="true"/>}
                                                className="whitespace-nowrap"
                                            >
                                                {t('adminCommerce.marketplace.providers.openDoc')}
                                            </Button>
                                        )}
                                    </div>
                                    {isImagePreview && doc.fileUrl && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={doc.fileUrl}
                                            alt={doc.title}
                                            className="max-h-56 w-auto rounded-control border border-border object-contain"
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {canModerate && (
                <section className="uav-bezel">
                    <div className="uav-bezel-core space-y-3 p-4">
                        <h3 className="m-0 text-sm font-semibold text-on-surface">
                            {t('adminCommerce.marketplace.providers.sectionModerate')}
                        </h3>
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
                </section>
            )}
        </Drawer>
    );
}
