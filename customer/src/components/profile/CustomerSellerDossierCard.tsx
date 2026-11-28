'use client';

import Link from 'next/link';
import {ArrowRight, BadgeCheck, Landmark, Package, ShieldAlert, Store, Wallet} from 'lucide-react';
import {useMyProviderProfile} from '@/hooks/useMarketplace';
import {useSiteInfo} from '@/hooks/useSiteInfo';
import {useI18n} from '@/providers/I18nContext';
import {Badge, Card, CardContent, CardHeader, CardTitle} from '@/components/ui';

export function CustomerSellerDossierCard() {
    const {t} = useI18n();
    const {data: provider, isPending} = useMyProviderProfile();
    const siteInfo = useSiteInfo();

    const effectiveFeePct = Math.round(
        ((provider?.commissionRateOverride ?? siteInfo.platformFeeRate) || 0.1) * 100
    );

    const statusBadge = () => {
        if (!provider) {
            return <Badge variant="outline">{t('publicSite.profileHub.sellerStatusNone')}</Badge>;
        }
        if (provider.verificationStatus === 'VERIFIED') {
            return (
                <Badge variant="primary" icon={<BadgeCheck size={12} aria-hidden="true"/>}>
                    {t('publicSite.profileHub.sellerStatusVerified')}
                </Badge>
            );
        }
        if (provider.verificationStatus === 'PENDING_REVIEW') {
            return <Badge variant="warning">{t('publicSite.profileHub.sellerStatusPending')}</Badge>;
        }
        if (provider.verificationStatus === 'REJECTED' || provider.verificationStatus === 'SUSPENDED') {
            return (
                <Badge variant="error" icon={<ShieldAlert size={12} aria-hidden="true"/>}>
                    {provider.verificationStatus}
                </Badge>
            );
        }
        return <Badge variant="secondary">{t('publicSite.profileHub.sellerStatusDraft')}</Badge>;
    };

    return (
        <Card className="flex h-full flex-col rounded-none border-0 bg-white" aria-labelledby="seller-dossier-title">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b border-slate-200 bg-slate-50/70 px-4 py-3">
                <CardTitle id="seller-dossier-title" className="m-0 flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Store size={17} className="text-primary" aria-hidden="true"/>
                    {t('publicSite.profileHub.sellerCardTitle')}
                </CardTitle>
                {!isPending && statusBadge()}
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-5 p-4 sm:p-5">
                <div className="space-y-4">
                    <p className="m-0 text-sm leading-relaxed text-slate-600">
                        {t('publicSite.profileHub.sellerCardDesc')}
                    </p>

                    {isPending ? (
                        <div className="grid animate-pulse grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="h-14 rounded-control bg-slate-100"/>
                            <div className="h-14 rounded-control bg-slate-100"/>
                        </div>
                    ) : provider ? (
                        <dl className="m-0 grid grid-cols-1 gap-3.5 rounded-panel border border-slate-200 bg-slate-50/60 p-3.5 sm:grid-cols-2">
                            <div>
                                <dt className="text-xs font-medium text-slate-500">Gian hàng đối tác</dt>
                                <dd className="m-0 mt-0.5 font-semibold text-slate-900">{provider.displayName}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-slate-500">Khu vực &amp; Bán kính</dt>
                                <dd className="m-0 mt-0.5 font-semibold text-slate-900">
                                    {provider.province} · {provider.serviceRadiusKm} km
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-slate-500">MST / CCCD &amp; Chứng chỉ bay</dt>
                                <dd className="m-0 mt-0.5 font-semibold text-slate-900">
                                    {provider.taxOrIdNumber || '—'} · {provider.flightLicenseNumber || '—'}
                                </dd>
                            </div>
                            <div>
                                <dt className="flex items-center gap-1 text-xs font-medium text-slate-500">
                                    <Landmark size={12} aria-hidden="true"/>
                                    Tài khoản thụ hưởng &amp; Phụ lục đối soát
                                </dt>
                                <dd className="m-0 mt-0.5 font-semibold text-slate-900">
                                    {provider.bankName
                                        ? `${provider.bankName} · ${provider.documents.length} chứng từ (${effectiveFeePct}%)`
                                        : `${provider.documents.length} chứng từ pháp lý`}
                                </dd>
                            </div>
                            {provider.reviewNote && (
                                <div className="sm:col-span-2 border-t border-slate-200 pt-2.5 text-xs text-slate-600">
                                    <strong className="text-slate-800">Ghi chú thẩm định:</strong> {provider.reviewNote}
                                </div>
                            )}
                        </dl>
                    ) : (
                        <div className="rounded-panel border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-700">
                            Nộp giấy chứng nhận đăng ký doanh nghiệp/CCCD, chứng chỉ điều khiển UAV, hồ sơ mã số thuế và xác nhận Phụ lục Biểu phí đối soát để niêm yết dịch vụ trên nền tảng.
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <Link
                        href="/customer/provider/onboarding"
                        className="inline-flex items-center gap-1.5 rounded-control bg-primary px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-uav-red-hover"
                    >
                        {t('publicSite.profileHub.sellerOpenStudio')}
                        <ArrowRight size={14} aria-hidden="true"/>
                    </Link>
                    {provider && (
                        <>
                            <Link
                                href="/customer/provider/listings"
                                className="inline-flex items-center gap-1.5 rounded-control border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50"
                            >
                                <Package size={14} aria-hidden="true"/>
                                {t('publicSite.profileHub.sellerManageListings')}
                            </Link>
                            <Link
                                href="/customer/provider/wallet"
                                className="inline-flex items-center gap-1.5 rounded-control border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50"
                            >
                                <Wallet size={14} aria-hidden="true"/>
                                {t('publicSite.profileHub.sellerOpenWallet')}
                            </Link>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
