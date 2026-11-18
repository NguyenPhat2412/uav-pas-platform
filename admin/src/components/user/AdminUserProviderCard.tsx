'use client';

import Link from 'next/link';
import {ArrowRight, BadgeCheck, FileCheck2, Landmark, Store} from 'lucide-react';
import {IllustrativeTag} from '@/components/marketplace/MarketplaceShared';
import {useAdminProviders} from '@/hooks/marketplace/useAdminMarketplace';
import {Badge, Card, CardContent, CardHeader, CardTitle, StatusBadge} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';

export function AdminUserProviderCard({userId, username}: { userId: number; username: string }) {
    const {t} = useI18n();
    const query = useAdminProviders('', username, 0);
    const provider = (query.data?.content ?? []).find(
        item => item.userId === userId || item.username === username,
    );

    return (
        <Card className="border-border" aria-labelledby="admin-user-provider-title">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b border-border bg-slate-50/70 px-5 py-3.5">
                <CardTitle id="admin-user-provider-title" className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Store size={16} className="shrink-0 text-primary" aria-hidden="true"/>
                    <span className="truncate">{t('adminCommerce.marketplace.providers.pageTitle')}</span>
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                    {provider ? (
                        <StatusBadge status={provider.verificationStatus}/>
                    ) : !query.isPending ? (
                        <Badge variant="outline" className="whitespace-nowrap">
                            {t('adminCommerce.marketplace.providers.emptyTitle')}
                        </Badge>
                    ) : null}
                    <Link
                        href="/admin/marketplace/providers"
                        className="inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap text-primary hover:underline"
                    >
                        {t('adminCommerce.marketplace.providers.inspectBtn')}
                        <ArrowRight size={13} aria-hidden="true"/>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="p-5">
                {query.isPending ? (
                    <div className="h-10 animate-pulse rounded-control bg-slate-100" role="status"/>
                ) : !provider ? (
                    <p className="m-0 text-xs text-muted">
                        @{username} · {t('adminCommerce.marketplace.providers.emptyFiltered')}
                    </p>
                ) : (
                    <div className="space-y-4">
                        <dl className="m-0 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div>
                                <dt className="text-xs font-medium text-slate-500">
                                    {t('adminCommerce.marketplace.providers.account')}
                                </dt>
                                <dd className="m-0 mt-1 flex items-center gap-1.5 font-semibold text-slate-900">
                                    {provider.verificationStatus === 'VERIFIED' && (
                                        <BadgeCheck size={15} className="shrink-0 text-primary" aria-hidden="true"/>
                                    )}
                                    <span className="line-clamp-2">
                                        {provider.displayName} ({t(`adminCommerce.marketplace.providerType.${provider.providerType}`)})
                                    </span>
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-slate-500">
                                    {t('adminCommerce.marketplace.providers.taxId')}
                                </dt>
                                <dd className="m-0 mt-1 font-semibold text-slate-900">
                                    {provider.taxOrIdNumber || '—'} · {provider.flightLicenseNumber || '—'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-slate-500">
                                    {t('adminCommerce.marketplace.providers.area')}
                                </dt>
                                <dd className="m-0 mt-1 font-semibold text-slate-900">
                                    {provider.province} ({t('adminCommerce.marketplace.providers.radiusKm', {km: provider.serviceRadiusKm})})
                                </dd>
                            </div>
                            <div>
                                <dt className="flex items-center gap-1 text-xs font-medium text-slate-500">
                                    <Landmark size={12} aria-hidden="true"/>
                                    {t('adminCommerce.marketplace.providers.bankPayout')}
                                </dt>
                                <dd className="m-0 mt-1 flex flex-wrap items-center gap-1.5 font-semibold text-slate-900">
                                    <span>
                                        {provider.bankName
                                            ? `${provider.bankName} · ${provider.bankAccountNumber || ''} (${provider.bankAccountHolder || ''})`
                                            : t('adminCommerce.marketplace.providers.bankMissing')}
                                    </span>
                                    <IllustrativeTag/>
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-slate-500">
                                    {t('adminCommerce.marketplace.providers.feeRate')}
                                </dt>
                                <dd className="m-0 mt-1 flex flex-wrap items-center gap-1.5 font-semibold text-slate-900">
                                    <span>
                                        {provider.commissionRateOverride != null
                                            ? `${Math.round(provider.commissionRateOverride * 100)}%`
                                            : t('adminCommerce.marketplace.providers.defaultFee', {pct: '10.0'})}
                                    </span>
                                    <IllustrativeTag/>
                                </dd>
                            </div>
                            <div>
                                <dt className="flex items-center gap-1 text-xs font-medium text-slate-500">
                                    <FileCheck2 size={12} aria-hidden="true"/>
                                    {t('adminCommerce.marketplace.providers.sectionDocs')}
                                </dt>
                                <dd className="m-0 mt-1 font-semibold text-slate-900 tabular-nums">
                                    {t('adminCommerce.marketplace.providers.viewDocs', {count: provider.documents.length})} ·{' '}
                                    {t('adminCommerce.marketplace.providers.completedFlights', {count: provider.completedMissionsCount})} (★{' '}
                                    {Number(provider.ratingAvg ?? 0).toFixed(1)})
                                </dd>
                            </div>
                        </dl>
                        {provider.reviewNote && (
                            <p className="m-0 rounded-control border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700">
                                {provider.reviewNote}
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
