'use client';

import Link from 'next/link';
import {Award, Building2, CheckCircle2, MapPin, Star} from 'lucide-react';
import {MarketplaceListingCard} from '@/components/marketplace/MarketplaceListingCard';
import {usePublicProviderStorefront} from '@/hooks/marketplace/useMarketplace';
import {verificationStatusLabel} from '@/forms/marketplace/marketplace-forms';

export function PublicProviderStorefront({slug}: { slug: string }) {
    const query = usePublicProviderStorefront(slug);
    const data = query.data;

    if (query.isLoading) {
        return (
            <div className="mx-auto max-w-[1200px] space-y-6 px-5 py-12 sm:px-8" role="status" aria-label="Đang tải gian hàng đối tác">
                <div className="h-36 animate-pulse rounded-3xl bg-slate-100"/>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="h-56 animate-pulse rounded-2xl bg-slate-100"/>
                    <div className="h-56 animate-pulse rounded-2xl bg-slate-100"/>
                </div>
            </div>
        );
    }

    if (query.isError || !data) {
        return (
            <div className="mx-auto max-w-[840px] px-5 py-16 text-center" role="alert">
                <h1 className="text-2xl font-black text-slate-900">Không tìm thấy gian hàng đối tác</h1>
                <p className="mt-2 text-sm text-slate-600">Hồ sơ đối tác chưa kích hoạt hoặc đường dẫn không hợp lệ.</p>
                <Link
                    href="/services"
                    className="mt-5 inline-flex h-10 items-center justify-center rounded-control bg-primary px-5 text-xs font-bold text-primary-foreground"
                >
                    ← Quay lại Sàn dịch vụ UAV
                </Link>
            </div>
        );
    }

    const {provider, listings, reviews} = data;

    return (
        <div className="bg-slate-50/60 py-10 sm:py-14">
            <div className="mx-auto max-w-[1260px] space-y-8 px-5 sm:px-8">
                <Link href="/services" className="inline-block text-xs font-bold text-slate-600 hover:text-primary">
                    ← Quay lại Sàn dịch vụ UAV
                </Link>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                    <CheckCircle2 size={14} aria-hidden="true"/>
                                    {verificationStatusLabel(provider.verificationStatus)}
                                </span>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                    {provider.providerType === 'COMPANY' ? 'Doanh nghiệp / Tổ chức' : 'Chuyên gia độc lập'}
                                </span>
                            </div>
                            <h1 className="m-0 flex items-center gap-2.5 text-2xl font-black text-slate-900 sm:text-3xl">
                                <Building2 size={26} className="text-primary" aria-hidden="true"/>
                                {provider.displayName}
                            </h1>
                            {provider.bio && (
                                <p className="m-0 max-w-3xl text-sm leading-relaxed text-slate-600">{provider.bio}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-600">
                                <span className="inline-flex items-center gap-1">
                                    <MapPin size={14} aria-hidden="true"/>
                                    {provider.province} · Bán kính hoạt động {provider.serviceRadiusKm} km
                                </span>
                                {provider.flightLicenseNumber && (
                                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                                        <Award size={14} className="text-primary" aria-hidden="true"/>
                                        Chứng chỉ bay: {provider.flightLicenseNumber}
                                    </span>
                                )}
                            </div>
                        </div>

                        <dl className="grid grid-cols-3 gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                            <div>
                                <dt className="text-xs font-semibold text-slate-500">Điểm đánh giá</dt>
                                <dd className="m-0 mt-1 flex items-center justify-center gap-1 text-base font-black text-amber-600">
                                    <Star size={15} className="fill-amber-400 text-amber-500" aria-hidden="true"/>
                                    {provider.reviewCount > 0 ? Number(provider.ratingAvg).toFixed(1) : 'Mới'}
                                </dd>
                            </div>
                            <div className="border-x border-slate-200 px-3">
                                <dt className="text-xs font-semibold text-slate-500">Nhiệm vụ hoàn tất</dt>
                                <dd className="m-0 mt-1 text-base font-black text-slate-900">
                                    {provider.completedMissionsCount}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-semibold text-slate-500">Gói dịch vụ</dt>
                                <dd className="m-0 mt-1 text-base font-black text-primary">{listings.length}</dd>
                            </div>
                        </dl>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="m-0 text-lg font-extrabold text-slate-900">
                        Dịch vụ & Thiết bị đang cung cấp ({listings.length})
                    </h2>
                    {listings.length === 0 ? (
                        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-xs text-slate-500" role="status">
                            Đối tác hiện chưa có tin đăng nào đang mở.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                            {listings.map(item => (
                                <MarketplaceListingCard key={item.id} item={item}/>
                            ))}
                        </div>
                    )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h2 className="m-0 text-base font-extrabold text-slate-900">
                        Phản hồi từ khách hàng đã nghiệm thu ({reviews.length})
                    </h2>
                    {reviews.length === 0 ? (
                        <p className="m-0 mt-2 text-xs text-slate-500">Chưa có đánh giá nào.</p>
                    ) : (
                        <div className="mt-4 divide-y divide-slate-100">
                            {reviews.map(rev => (
                                <article key={rev.id} className="py-3.5 first:pt-0 last:pb-0">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <strong className="text-xs font-bold text-slate-900">{rev.customerName}</strong>
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                                            <Star size={13} className="fill-amber-400 text-amber-500" aria-hidden="true"/>
                                            {rev.overallRating ?? 5}/5 · {rev.missionTitle}
                                        </span>
                                    </div>
                                    {rev.comment && (
                                        <p className="m-0 mt-1 text-xs text-slate-600">{rev.comment}</p>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
