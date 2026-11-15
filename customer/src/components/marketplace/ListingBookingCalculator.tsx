'use client';

import {useState} from 'react';
import Link from 'next/link';
import {Clock3} from 'lucide-react';
import {useSiteInfo} from '@/hooks/settings/useSiteInfo';
import {
    estimateBookingSubtotal,
    formatVndCompact,
    pricingModelLabel,
    pricingUnitLabel,
} from '@/forms/marketplace/marketplace-forms';
import type {MarketplaceListing} from '@/types/marketplace/marketplace.types';

export function ListingBookingCalculator({listing}: { listing: MarketplaceListing }) {
    const {invoiceDueDays, rfqEnabled} = useSiteInfo();
    const [unitsInput, setUnitsInput] = useState<string>('');

    const minUnits = Number(listing.minBookingUnits || 1);
    const parsedUnits = unitsInput === '' ? minUnits : Number(unitsInput);
    const subtotal = estimateBookingSubtotal(Number(listing.basePriceVnd), parsedUnits, minUnits);
    const deposit = Number(listing.securityDepositVnd || 0);
    const unitText = pricingUnitLabel(listing.pricingModel);

    return (
        <aside className="lg:col-span-4" aria-label="Bảng tính chi phí và đặt dịch vụ">
            <div className="sticky top-20 space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                    <span className="text-xs font-bold text-slate-500">{pricingModelLabel(listing.pricingModel)}</span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-primary">
                            {formatVndCompact(listing.basePriceVnd)}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">/ {unitText}</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block space-y-1.5 text-xs font-bold text-slate-700">
                        <span>Khối lượng dự kiến ({unitText})</span>
                        <input
                            type="number"
                            min={minUnits}
                            step="0.5"
                            value={unitsInput === '' ? String(minUnits) : unitsInput}
                            onChange={e => setUnitsInput(e.target.value)}
                            className="h-10 w-full rounded-control border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-primary"
                        />
                        <span className="block text-xs font-normal text-slate-500">
                            Đặt tối thiểu {minUnits} {unitText}
                        </span>
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Chọn nhanh quy mô khối lượng">
                        {[1, 2, 5, 10].map(mult => {
                            const val = Math.round(minUnits * mult * 10) / 10;
                            const active = Math.abs((parsedUnits || minUnits) - val) < 0.01;
                            return (
                                <button
                                    key={mult}
                                    type="button"
                                    onClick={() => setUnitsInput(String(val))}
                                    className={`rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
                                        active
                                            ? 'bg-primary text-primary-foreground'
                                            : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-primary hover:text-primary'
                                    }`}
                                >
                                    {mult === 1 ? `Tối thiểu (${val})` : `${val} ${unitText}`}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <dl className="space-y-2 rounded-2xl bg-slate-50 p-4 text-xs">
                    <div className="flex items-center justify-between">
                        <dt className="text-slate-600">Tạm tính dịch vụ</dt>
                        <dd className="m-0 font-extrabold text-slate-900">{formatVndCompact(subtotal)}</dd>
                    </div>
                    {deposit > 0 && (
                        <div className="flex items-center justify-between">
                            <dt className="text-slate-600">Tiền cọc thiết bị (hoàn lại)</dt>
                            <dd className="m-0 font-bold text-slate-800">{formatVndCompact(deposit)}</dd>
                        </div>
                    )}
                    <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                        <dt className="font-bold text-slate-800">Tổng thanh toán ký quỹ</dt>
                        <dd className="m-0 text-sm font-black text-primary">{formatVndCompact(subtotal + deposit)}</dd>
                    </div>
                </dl>

                <div className="grid gap-2 text-xs text-slate-600">
                    {listing.onSiteSlaHours != null && (
                        <div className="flex items-center gap-2">
                            <Clock3 size={14} className="shrink-0 text-primary" aria-hidden="true"/>
                            <span>Có mặt hiện trường trong {listing.onSiteSlaHours} giờ</span>
                        </div>
                    )}
                    {listing.deliverySlaHours != null && (
                        <div className="flex items-center gap-2">
                            <Clock3 size={14} className="shrink-0 text-uav-blue" aria-hidden="true"/>
                            <span>Bàn giao dữ liệu trong {listing.deliverySlaHours} giờ</span>
                        </div>
                    )}
                </div>

                <Link
                    href={`/customer/missions/create?listing=${encodeURIComponent(listing.slug)}&units=${encodeURIComponent(String(Math.max(parsedUnits || minUnits, minUnits)))}`}
                    className="inline-flex h-11 w-full items-center justify-center rounded-control bg-primary px-5 text-xs font-bold text-primary-foreground shadow-xs transition-colors hover:bg-primary-hover"
                >
                    Đặt thuê gói này ngay →
                </Link>

                {listing.providerSlug && (
                    <Link
                        href={`/providers/${listing.providerSlug}`}
                        className="inline-flex h-10 w-full items-center justify-center rounded-control border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition-colors hover:border-primary hover:text-primary"
                    >
                        Xem gian hàng của {listing.providerDisplayName}
                    </Link>
                )}

                {rfqEnabled && (
                    <Link
                        href="/customer/missions/create?rfq=1"
                        className="block text-center text-xs font-bold text-slate-600 hover:text-primary hover:underline"
                    >
                        Khối lượng lớn hoặc yêu cầu đặc thù? Mở báo giá RFQ →
                    </Link>
                )}

                <p className="m-0 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs leading-relaxed text-emerald-900">
                    <strong>Bảo vệ Ký quỹ (Escrow):</strong> Hóa đơn VietQR hạn thanh toán {invoiceDueDays} ngày được nền tảng tạm giữ an toàn và chỉ giải ngân cho đối tác sau khi bạn nghiệm thu kết quả bay.
                </p>
            </div>
        </aside>
    );
}
