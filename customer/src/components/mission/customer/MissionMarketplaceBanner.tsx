'use client';

import {RequiredMark} from '@/components/shared/RequiredMark';
import {
    formatVndCompact,
    listingTypeLabel,
    pricingUnitLabel,
} from '@/forms/marketplace-forms';
import type {MarketplaceListing} from '@/types/marketplace.types';

interface MissionMarketplaceBannerProps {
    activeListing?: MarketplaceListing | null;
    effectiveUnits?: number;
    estimatedSubtotal: number | null;
    onBookingUnitsChange: (value: number) => void;
    rfqEnabled: boolean;
    openRfq: boolean;
    onOpenRfqChange: (value: boolean) => void;
    invoiceDueDays: number;
    requireEscrowBeforeStart: boolean;
}

export function MissionMarketplaceBanner({
    activeListing,
    effectiveUnits,
    estimatedSubtotal,
    onBookingUnitsChange,
    rfqEnabled,
    openRfq,
    onOpenRfqChange,
    invoiceDueDays,
    requireEscrowBeforeStart,
}: MissionMarketplaceBannerProps) {
    if (activeListing) {
        return (
            <div className="uav-bezel col-span-full">
                <div className="uav-bezel-core p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1">
                            <span className="inline-block rounded-badge bg-slate-900 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                                Đặt thuê từ Sàn UAV · {listingTypeLabel(activeListing.listingType)}
                            </span>
                            <h3 className="m-0 text-base font-semibold text-on-surface">{activeListing.title}</h3>
                            <p className="m-0 text-xs text-muted tabular-nums">
                                Đối tác đã xác minh · Khu vực {activeListing.province} · Đơn giá minh hoạ:{' '}
                                <strong className="text-on-surface">{formatVndCompact(activeListing.basePriceVnd)} / {pricingUnitLabel(activeListing.pricingModel)}</strong>
                            </p>
                            <p className="m-0 text-xs text-muted tabular-nums">
                                Bảo vệ Ký quỹ VietQR (hạn thanh toán {invoiceDueDays} ngày){requireEscrowBeforeStart ? ' · Yêu cầu nạp Ký quỹ trước khi đối tác xuất phát bay' : ' · Chỉ giải ngân cho đối tác sau khi bạn nghiệm thu kết quả'}.
                            </p>
                        </div>
                        <label className="grid gap-1 text-xs font-semibold text-on-surface tabular-nums">
                            <span>Khối lượng đặt ({pricingUnitLabel(activeListing.pricingModel)})<RequiredMark/></span>
                            <input
                                type="number"
                                min={Number(activeListing.minBookingUnits || 1)}
                                step="0.5"
                                value={effectiveUnits ?? 1}
                                onChange={e => onBookingUnitsChange(Number(e.target.value))}
                                className="h-10 w-36 rounded-control border border-border-input bg-card px-3 text-sm font-bold text-on-surface tabular-nums"
                            />
                            <span className="text-xs font-semibold text-on-surface">
                                Tạm tính minh hoạ: {formatVndCompact(estimatedSubtotal)}
                            </span>
                        </label>
                    </div>
                </div>
            </div>
        );
    }

    void rfqEnabled;
    void openRfq;
    void onOpenRfqChange;

    return (
        <p className="col-span-full m-0 rounded-panel border border-slate-200 bg-surface-container-low px-3.5 py-2.5 text-xs text-muted">
            UAV PAS điều phối đội bay đã xác minh cho yêu cầu của bạn theo khu vực và lịch trình đã chọn.
        </p>
    );
}
