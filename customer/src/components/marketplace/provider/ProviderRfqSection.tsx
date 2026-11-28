'use client';

import {useState} from 'react';
import {Gavel, Send} from 'lucide-react';
import {Button} from '@/components/customer/CustomerUi';
import {OptionalMark, RequiredMark} from '@/components/ui';
import {
    extractActionableError,
    formatVndCompact,
    initialBidForm,
} from '@/forms/marketplace-forms';
import {displayLabel, formatDate} from '@/lib/presentation';
import type {MissionBid, MissionBidCreateInput} from '@/types/marketplace.types';
import type {Mission} from '@/types/mission.types';

export function ProviderRfqSection({
    rfqEnabled,
    rfqs,
    myBids,
    isSubmitting,
    onSubmitBid,
    onError,
}: {
    rfqEnabled: boolean;
    rfqs: Mission[];
    myBids: MissionBid[];
    isSubmitting: boolean;
    onSubmitBid: (missionId: number, payload: MissionBidCreateInput) => Promise<unknown>;
    onError: (msg: string) => void;
}) {
    const [biddingMissionId, setBiddingMissionId] = useState<number | null>(null);
    const [bidForm, setBidForm] = useState(initialBidForm);

    const handleBidSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!biddingMissionId) return;
        onError('');
        try {
            await onSubmitBid(biddingMissionId, bidForm);
            setBiddingMissionId(null);
            setBidForm(initialBidForm());
        } catch (err) {
            onError(extractActionableError(err, 'Không thể gửi đề xuất điều phối.'));
        }
    };

    return (
        <div className="space-y-6">
            {!rfqEnabled && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900" role="status">
                    Chế độ đề xuất mở hiện đang tạm đóng theo cấu hình điều phối tập trung của UAV PAS.
                </div>
            )}
            {rfqs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500" role="status">
                    Hiện chưa có yêu cầu bổ sung nào đang chờ điều phối.
                </div>
            ) : (
                <div className="space-y-4">
                    {rfqs.map(rfq => (
                        <article key={rfq.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <span className="font-mono text-xs font-bold text-primary">
                                        {rfq.code} · {displayLabel(rfq.missionType)}
                                    </span>
                                    <h3 className="m-0 mt-1 text-base font-extrabold text-slate-900">{rfq.title}</h3>
                                    <p className="m-0 mt-0.5 text-xs text-slate-600">
                                        Địa điểm: {rfq.locationName} · Thời gian: {formatDate(rfq.startTime)}
                                    </p>
                                    {rfq.description && (
                                        <p className="m-0 mt-1.5 text-xs text-slate-600">{rfq.description}</p>
                                    )}
                                </div>
                                <Button onClick={() => setBiddingMissionId(rfq.id)}>
                                    <Gavel size={14} className="mr-1 inline" aria-hidden="true"/>
                                    Gửi phương án thực hiện
                                </Button>
                            </div>

                            {biddingMissionId === rfq.id && (
                                <form onSubmit={handleBidSubmit} className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
                                    <label className="grid gap-1 text-xs font-bold text-slate-700">
                                        <span>Giá trọn gói đề xuất (VNĐ)<RequiredMark/></span>
                                        <input
                                            required
                                            type="number"
                                            min={50000}
                                            step={50000}
                                            value={bidForm.proposedPriceVnd}
                                            onChange={e =>
                                                setBidForm(s => ({...s, proposedPriceVnd: Number(e.target.value)}))
                                            }
                                            className="h-9 rounded-control border border-slate-300 bg-white px-3 text-xs"
                                        />
                                    </label>
                                    <label className="grid gap-1 text-xs font-bold text-slate-700">
                                        <span>Thời gian bàn giao (giờ)<OptionalMark/></span>
                                        <input
                                            type="number"
                                            min={1}
                                            value={bidForm.estimatedDeliveryHours ?? 24}
                                            onChange={e =>
                                                setBidForm(s => ({...s, estimatedDeliveryHours: Number(e.target.value)}))
                                            }
                                            className="h-9 rounded-control border border-slate-300 bg-white px-3 text-xs"
                                        />
                                    </label>
                                    <label className="grid gap-1 text-xs font-bold text-slate-700">
                                        <span>Dòng máy bay dự kiến<OptionalMark/></span>
                                        <input
                                            value={bidForm.proposedUavModel ?? ''}
                                            onChange={e =>
                                                setBidForm(s => ({...s, proposedUavModel: e.target.value}))
                                            }
                                            placeholder="VD: DJI Matrice 350"
                                            className="h-9 rounded-control border border-slate-300 bg-white px-3 text-xs"
                                        />
                                    </label>
                                    <label className="grid gap-1 text-xs font-bold text-slate-700 sm:col-span-3">
                                        <span>Phương án thực hiện & Cam kết kỹ thuật<RequiredMark/></span>
                                        <input
                                            required
                                            value={bidForm.proposalNote}
                                            onChange={e => setBidForm(s => ({...s, proposalNote: e.target.value}))}
                                            placeholder="Nêu rõ độ phân giải, thiết bị mang theo và đầu ra dữ liệu bàn giao..."
                                            className="h-9 rounded-control border border-slate-300 bg-white px-3 text-xs"
                                        />
                                    </label>
                                    <div className="flex justify-end gap-2 sm:col-span-3">
                                        <Button type="button" variant="secondary" onClick={() => setBiddingMissionId(null)}>
                                            Huỷ
                                        </Button>
                                        <Button type="submit" disabled={isSubmitting}>
                                            <Send size={13} className="mr-1 inline" aria-hidden="true"/>
                                            Gửi phương án
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </article>
                    ))}
                </div>
            )}

            {myBids.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h3 className="m-0 text-sm font-extrabold text-slate-900">
                        Báo giá bạn đã gửi ({myBids.length})
                    </h3>
                    <ul className="m-0 mt-3 list-none divide-y divide-slate-100 p-0">
                        {myBids.map(bid => (
                            <li key={bid.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs">
                                <div>
                                    <strong className="font-bold text-slate-900">
                                        {bid.missionCode} · {bid.missionTitle}
                                    </strong>
                                    <p className="m-0 text-slate-500">{bid.proposalNote}</p>
                                </div>
                                <div className="text-right">
                                    <strong className="font-black text-primary">
                                        {formatVndCompact(bid.proposedPriceVnd)}
                                    </strong>
                                    <span className="ml-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                                        {bid.status}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}
