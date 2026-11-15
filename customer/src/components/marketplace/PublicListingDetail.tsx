'use client';

import Link from 'next/link';
import {Building2, CheckCircle2, Lock, MapPin, ShieldCheck, Star} from 'lucide-react';
import {ListingBookingCalculator} from '@/components/marketplace/ListingBookingCalculator';
import {resolveListingPhoto} from '@/components/marketplace/MarketplaceListingCard';
import {usePublicListingDetail} from '@/hooks/marketplace/useMarketplace';
import {listingTypeLabel} from '@/forms/marketplace/marketplace-forms';
import {displayLabel} from '@/lib/presentation';

const DETAIL_ESCROW_STEPS = [
    '1. Chốt đơn & Hóa đơn',
    '2. Nạp Ký quỹ VietQR',
    '3. Thực hiện & Bàn giao',
    '4. Nghiệm thu & Giải ngân',
] as const;

export function PublicListingDetail({slug}: { slug: string }) {
    const query = usePublicListingDetail(slug);
    const listing = query.data?.listing;
    const reviews = query.data?.reviews ?? [];

    if (query.isLoading) {
        return (
            <div className="mx-auto max-w-[1200px] space-y-6 px-5 py-12 sm:px-8" role="status" aria-label="Đang tải chi tiết gói dịch vụ">
                <div className="h-8 w-1/3 animate-pulse rounded-lg bg-slate-200"/>
                <div className="h-64 animate-pulse rounded-3xl bg-slate-100"/>
                <div className="h-44 animate-pulse rounded-2xl bg-slate-100"/>
            </div>
        );
    }

    if (query.isError || !listing) {
        return (
            <div className="mx-auto max-w-[900px] px-5 py-16 text-center" role="alert">
                <h1 className="text-2xl font-black text-slate-900">Không tìm thấy gói dịch vụ UAV</h1>
                <p className="mt-2 text-sm text-slate-600">
                    Tin đăng này có thể đã tạm ẩn hoặc đường dẫn không còn tồn tại.
                </p>
                <Link
                    href="/services"
                    className="mt-5 inline-flex h-10 items-center justify-center rounded-control bg-primary px-5 text-xs font-bold text-primary-foreground"
                >
                    ← Quay lại Sàn dịch vụ UAV
                </Link>
            </div>
        );
    }

    const photo = resolveListingPhoto(listing);

    return (
        <div className="bg-slate-50/60 py-10 sm:py-14">
            <div className="mx-auto max-w-[1260px] space-y-8 px-5 sm:px-8">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                    <Link href="/services" className="hover:text-primary">
                        ← Quay lại Sàn dịch vụ UAV
                    </Link>
                    <span>Mã danh mục: {displayLabel(listing.missionType)}</span>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <div className="space-y-6 lg:col-span-8">
                        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
                            <div className="relative aspect-[21/9] w-full overflow-hidden bg-slate-900">
                                <img
                                    src={photo.src}
                                    alt={photo.alt}
                                    className="h-full w-full object-cover"
                                />
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"/>
                                <div className="absolute right-5 bottom-4 left-5 flex flex-wrap items-center justify-between gap-2">
                                    <span className="rounded-lg bg-slate-950/75 px-3 py-1 text-xs font-bold text-white backdrop-blur-xs">
                                        {listingTypeLabel(listing.listingType)}
                                    </span>
                                    {listing.officialPlatformListing ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-600/95 px-3 py-1 text-xs font-bold text-white">
                                            <ShieldCheck size={14} aria-hidden="true"/>
                                            Đội bay UAV PAS
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/95 px-3 py-1 text-xs font-bold text-white">
                                            <CheckCircle2 size={14} aria-hidden="true"/>
                                            Đối tác đã xác minh KYC
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 sm:p-8">
                                <h1 className="m-0 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                                    {listing.title}
                                </h1>
                                {listing.summary && (
                                    <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                                        {listing.summary}
                                    </p>
                                )}

                                <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-xs text-slate-600">
                                    {listing.providerSlug ? (
                                        <Link
                                            href={`/providers/${listing.providerSlug}`}
                                            className="inline-flex items-center gap-1.5 font-bold text-slate-900 hover:text-primary"
                                        >
                                            <Building2 size={15} className="text-primary" aria-hidden="true"/>
                                            {listing.providerDisplayName}
                                        </Link>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
                                            <Building2 size={15} className="text-primary" aria-hidden="true"/>
                                            {listing.providerDisplayName}
                                        </span>
                                    )}
                                    <span className="inline-flex items-center gap-1">
                                        <MapPin size={14} aria-hidden="true"/>
                                        {listing.province} (bán kính {listing.serviceRadiusKm} km)
                                    </span>
                                    <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                                        <Star size={14} className="fill-amber-400 text-amber-500" aria-hidden="true"/>
                                        {listing.reviewCount > 0
                                            ? `${Number(listing.ratingAvg).toFixed(1)} · ${listing.reviewCount} đánh giá`
                                            : 'Chưa có đánh giá'}
                                    </span>
                                    <span>Đã nhận {listing.bookingCount} lượt đặt</span>
                                </div>

                                <ol className="m-0 mt-5 grid list-none grid-cols-2 gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/45 p-3 sm:grid-cols-4" aria-label="Quy trình bảo vệ Ký quỹ">
                                    {DETAIL_ESCROW_STEPS.map(step => (
                                        <li key={step} className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                                            <Lock size={13} className="shrink-0 text-emerald-700" aria-hidden="true"/>
                                            <span className="truncate">{step}</span>
                                        </li>
                                    ))}
                                </ol>

                                {listing.description && (
                                    <div className="mt-6 space-y-2 border-t border-slate-100 pt-5">
                                        <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                                            Mô tả chi tiết phạm vi thực hiện
                                        </h2>
                                        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                                            {listing.description}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                <h2 className="text-sm font-extrabold text-slate-900">Tổ hợp UAV & Cảm biến sử dụng</h2>
                                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                                    {listing.equipmentSpecs || 'Trang bị theo cấu hình tiêu chuẩn phù hợp nhiệm vụ bay.'}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                <h2 className="text-sm font-extrabold text-slate-900">Đầu ra bàn giao cho khách hàng</h2>
                                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                                    {listing.deliverablesSummary || 'Dữ liệu bay gốc và báo cáo nghiệm thu lưu trữ bảo mật qua Signed-URL.'}
                                </p>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-6">
                            <h2 className="text-base font-extrabold text-slate-900">
                                Đánh giá nghiệm thu thực tế ({reviews.length})
                            </h2>
                            {reviews.length === 0 ? (
                                <p className="mt-2 text-xs text-slate-500">Chưa có đánh giá bàn giao cho tin đăng này.</p>
                            ) : (
                                <div className="mt-4 divide-y divide-slate-100">
                                    {reviews.map(rev => (
                                        <article key={rev.id} className="py-3.5 first:pt-0 last:pb-0">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <strong className="text-xs font-bold text-slate-900">{rev.customerName}</strong>
                                                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                                                    <Star size={13} className="fill-amber-400 text-amber-500" aria-hidden="true"/>
                                                    {rev.overallRating ?? 5}/5 · Nhiệm vụ: {rev.missionTitle}
                                                </span>
                                            </div>
                                            {rev.comment && (
                                                <p className="m-0 mt-1.5 text-xs leading-relaxed text-slate-600">{rev.comment}</p>
                                            )}
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>

                    <ListingBookingCalculator listing={listing}/>
                </div>
            </div>
        </div>
    );
}
