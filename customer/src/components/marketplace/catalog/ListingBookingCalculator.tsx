'use client';

import {useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight, Clock3} from 'lucide-react';
import {RequiredMark} from '@/components/ui';
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
            <div className="uav-bezel sticky top-20">
                <div className="uav-bezel-core space-y-4 p-6">
                    <div>
                        <span className="text-xs font-semibold text-muted">{pricingModelLabel(listing.pricingModel)}</span>
                        <div className="mt-1 flex items-baseline gap-1.5 tabular-nums">
                            <span className="text-2xl font-bold text-primary">
                                {formatVndCompact(listing.basePriceVnd)}
                            </span>
                            <span className="text-xs font-medium text-muted">/ {unitText}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block space-y-1.5 text-xs font-semibold text-on-surface">
                            <span>Khối lượng dự kiến ({unitText})<RequiredMark/></span>
                            <input
                                type="number"
                                min={minUnits}
                                step="0.5"
                                value={unitsInput === '' ? String(minUnits) : unitsInput}
                                onChange={e => setUnitsInput(e.target.value)}
                                className="h-10 w-full rounded-control border border-border-input bg-card px-3 text-sm font-semibold text-on-surface tabular-nums outline-none focus:outline-2 focus:outline-ring"
                            />
                            <span className="block text-xs font-normal text-muted tabular-nums">
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
                                        aria-pressed={active}
                                        onClick={() => setUnitsInput(String(val))}
                                        className={`min-h-8 rounded-badge px-2.5 py-1 text-xs font-semibold whitespace-nowrap tabular-nums transition-colors ${
                                            active
                                                ? 'bg-slate-900 text-white'
                                                : 'border border-slate-200 bg-surface-container-low text-on-surface hover:border-slate-400'
                                        }`}
                                    >
                                        {mult === 1 ? `Tối thiểu (${val})` : `${val} ${unitText}`}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <dl className="space-y-2 rounded-panel bg-surface-container-low p-4 text-xs tabular-nums">
                        <div className="flex items-center justify-between">
                            <dt className="text-muted">Tạm tính dịch vụ</dt>
                            <dd className="m-0 font-semibold text-on-surface">{formatVndCompact(subtotal)}</dd>
                        </div>
                        {deposit > 0 && (
                            <div className="flex items-center justify-between">
                                <dt className="text-muted">Tiền cọc thiết bị (hoàn lại)</dt>
                                <dd className="m-0 font-semibold text-on-surface">{formatVndCompact(deposit)}</dd>
                            </div>
                        )}
                        <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                            <dt className="font-semibold text-on-surface">Tổng thanh toán ký quỹ</dt>
                            <dd className="m-0 text-sm font-bold text-primary">{formatVndCompact(subtotal + deposit)}</dd>
                        </div>
                    </dl>

                    <div className="grid gap-2 text-xs text-muted tabular-nums">
                        {listing.onSiteSlaHours != null && (
                            <div className="flex items-center gap-2">
                                <Clock3 size={14} className="shrink-0 text-on-surface" aria-hidden="true"/>
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
                        className="group inline-flex min-h-11 w-full items-center justify-between rounded-control bg-primary pr-3 pl-5 text-xs font-semibold whitespace-nowrap text-primary-foreground shadow-xs transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-primary-hover active:scale-[0.985]"
                    >
                        <span>Đặt thuê gói này ngay</span>
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
                            <ArrowUpRight size={14} aria-hidden="true"/>
                        </span>
                    </Link>

                    {listing.providerSlug && (
                        <Link
                            href={`/providers/${listing.providerSlug}`}
                            className="inline-flex min-h-10 w-full items-center justify-center rounded-control border border-slate-200 bg-card px-4 text-xs font-semibold whitespace-nowrap text-on-surface transition-colors hover:bg-surface-container-low"
                        >
                            Xem gian hàng của {listing.providerDisplayName}
                        </Link>
                    )}

                    {rfqEnabled && (
                        <Link
                            href="/customer/missions/create?rfq=1"
                            className="block text-center text-xs font-semibold text-muted hover:text-on-surface hover:underline"
                        >
                            Khối lượng lớn hoặc yêu cầu đặc thù? Mở báo giá RFQ →
                        </Link>
                    )}

                    <p className="m-0 rounded-panel border border-slate-200 bg-surface-container-low p-3 text-xs leading-relaxed text-on-surface tabular-nums">
                        <strong>Bảo vệ Ký quỹ (Escrow):</strong> Hóa đơn VietQR hạn thanh toán {invoiceDueDays} ngày được nền tảng tạm giữ an toàn và chỉ giải ngân cho đối tác sau khi bạn nghiệm thu kết quả bay.
                    </p>
                </div>
            </div>
        </aside>
    );
}
