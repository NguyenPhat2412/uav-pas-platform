'use client';

import Link from 'next/link';
import {CheckCircle2, Gavel, Star} from 'lucide-react';
import {Button} from '@/components/customer/CustomerUi';
import {
    extractActionableError,
    formatVndCompact,
} from '@/forms/marketplace/marketplace-forms';
import type {MissionBid} from '@/types/marketplace/marketplace.types';

export function CustomerMissionRfqBids({
    isRfq,
    isOwner,
    bids,
    isLoading,
    acceptError,
    isAccepting,
    onAcceptBid,
}: {
    isRfq: boolean;
    isOwner: boolean;
    bids: MissionBid[];
    isLoading: boolean;
    acceptError: unknown;
    isAccepting: boolean;
    onAcceptBid: (bidId: number) => void;
}) {
    return (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="m-0 flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
                    <Gavel size={15} className="text-primary" aria-hidden="true"/>
                    Báo giá chào thầu từ các Đối tác UAV ({bids.length})
                </h2>
                {isRfq && (
                    <span className="text-xs text-slate-500">
                        Chọn 1 báo giá phù hợp nhất để chốt đối tác và phát hành hóa đơn ký quỹ.
                    </span>
                )}
            </div>

            {Boolean(acceptError) && (
                <p className="m-0 mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-danger" role="alert">
                    {extractActionableError(acceptError, 'Không thể chọn báo giá này. Vui lòng tải lại trang và thử lại.')}
                </p>
            )}

            {isLoading ? (
                <p className="m-0 mt-3 text-xs text-slate-500" role="status">Đang tải danh sách báo giá...</p>
            ) : bids.length === 0 ? (
                <p className="m-0 mt-3 text-xs text-slate-500">
                    Yêu cầu đang mở trên sàn RFQ. Các đối tác UAV đã xác minh sẽ gửi báo giá tại đây.
                </p>
            ) : (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {bids.map(bid => (
                        <article
                            key={bid.id}
                            className={`rounded-xl border p-3.5 tabular-nums ${
                                bid.status === 'ACCEPTED'
                                    ? 'border-slate-800 bg-slate-100/70'
                                    : 'border-slate-200 bg-slate-50/50'
                            }`}
                        >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <Link
                                        href={`/providers/${bid.providerSlug}`}
                                        className="text-xs font-extrabold text-slate-900 hover:text-primary"
                                    >
                                        {bid.providerDisplayName}
                                    </Link>
                                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                                        <span className="inline-flex items-center gap-0.5 font-bold text-amber-600">
                                            <Star size={11} className="fill-amber-400 text-amber-500" aria-hidden="true"/>
                                            {Number(bid.providerRatingAvg || 0).toFixed(1)}
                                        </span>
                                        <span>· {bid.providerCompletedMissionsCount} chuyến hoàn tất</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <strong className="block text-sm font-black text-primary">
                                        {formatVndCompact(bid.proposedPriceVnd)}
                                    </strong>
                                    {bid.estimatedDeliveryHours != null && (
                                        <span className="text-xs text-slate-500">
                                            Bàn giao: {bid.estimatedDeliveryHours}h
                                        </span>
                                    )}
                                </div>
                            </div>

                            {bid.proposedUavModel && (
                                <p className="m-0 mt-2 text-xs font-semibold text-slate-700">
                                    Thiết bị đề xuất: {bid.proposedUavModel}
                                </p>
                            )}
                            <p className="m-0 mt-1 text-xs leading-relaxed text-slate-600">{bid.proposalNote}</p>

                            <div className="mt-3 flex items-center justify-end gap-2">
                                {bid.status === 'ACCEPTED' ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-900">
                                        <CheckCircle2 size={14} aria-hidden="true"/>
                                        Đã chọn giao việc
                                    </span>
                                ) : isOwner && isRfq && bid.status === 'PENDING' ? (
                                    <Button
                                        disabled={isAccepting}
                                        onClick={() => onAcceptBid(bid.id)}
                                    >
                                        {isAccepting ? 'Đang chốt...' : 'Chọn báo giá & Giao việc'}
                                    </Button>
                                ) : (
                                    <span className="text-xs text-slate-400">{bid.status}</span>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
