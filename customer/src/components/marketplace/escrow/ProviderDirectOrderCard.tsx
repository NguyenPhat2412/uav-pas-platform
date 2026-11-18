'use client';

import {CheckCircle2, Play, XCircle} from 'lucide-react';
import {Button, Status} from '@/components/customer/CustomerUi';
import {OptionalMark, RequiredMark} from '@/components/ui';
import {
    formatVndCompact,
    pricingUnitLabel,
    providerOrderStatusLabel,
} from '@/forms/marketplace/marketplace-forms';
import {formatDate} from '@/lib/presentation';
import type {ProviderUav} from '@/types/marketplace/marketplace.types';
import type {Mission} from '@/types/mission/mission.types';

export function ProviderDirectOrderCard({
    mission,
    myUavs,
    selectedUavId,
    handoverNote,
    requireEscrowBeforeStart,
    isResponding,
    isStarting,
    isCompleting,
    onSelectUav,
    onChangeHandoverNote,
    onRespond,
    onStart,
    onComplete,
}: {
    mission: Mission;
    myUavs: ProviderUav[];
    selectedUavId?: number;
    handoverNote: string;
    requireEscrowBeforeStart: boolean;
    isResponding: boolean;
    isStarting: boolean;
    isCompleting: boolean;
    onSelectUav: (uavId: number) => void;
    onChangeHandoverNote: (note: string) => void;
    onRespond: (accept: boolean) => void;
    onStart: () => void;
    onComplete: () => void;
}) {
    return (
        <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">{mission.code}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                            {providerOrderStatusLabel(mission.providerResponseStatus)}
                        </span>
                    </div>
                    <h3 className="m-0 mt-1 text-base font-extrabold text-slate-900">{mission.title}</h3>
                    <p className="m-0 mt-0.5 text-xs text-slate-600">
                        Khách hàng: <strong>{mission.customerName || 'Khách hàng'}</strong> · Địa điểm: {mission.locationName}
                    </p>
                    <p className="m-0 mt-0.5 text-xs text-slate-500">
                        Lịch bay: {formatDate(mission.startTime)} → {formatDate(mission.expectedEndTime)}
                    </p>
                </div>

                <div className="text-right">
                    <Status value={mission.status}/>
                    {mission.quotedSubtotalVnd != null && (
                        <div className="mt-1.5">
                            <strong className="text-base font-black text-primary">
                                {formatVndCompact(mission.quotedSubtotalVnd)}
                            </strong>
                            {mission.bookingUnits != null && (
                                <span className="block text-xs text-slate-500">
                                    Khối lượng: {mission.bookingUnits} {pricingUnitLabel(mission.pricingModelSnapshot)}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {mission.providerResponseStatus === 'PENDING_PROVIDER' && mission.status === 'PENDING_CONFIRMATION' && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3.5">
                    <label className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-bold text-slate-700">Gán UAV thực hiện<OptionalMark/></span>
                        <select
                            aria-label="Chọn tàu bay UAV thực hiện"
                            value={selectedUavId ?? ''}
                            onChange={e => onSelectUav(Number(e.target.value))}
                            className="h-9 rounded-control border border-slate-300 bg-white px-2.5 text-xs font-semibold"
                        >
                            <option value="">-- Chọn tàu bay 3P (tuỳ chọn) --</option>
                            {myUavs.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.model} ({u.serialNumber})
                                </option>
                            ))}
                        </select>
                    </label>
                    <div className="flex items-center gap-2">
                        <Button variant="danger" disabled={isResponding} onClick={() => onRespond(false)}>
                            <XCircle size={14} className="mr-1 inline" aria-hidden="true"/>
                            Từ chối
                        </Button>
                        <Button disabled={isResponding} onClick={() => onRespond(true)}>
                            <CheckCircle2 size={14} className="mr-1 inline" aria-hidden="true"/>
                            Nhận đơn & Phát hành Hóa đơn Escrow
                        </Button>
                    </div>
                </div>
            )}

            {['CONFIRMED', 'RESOURCE_RESERVED', 'READY'].includes(mission.status) && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-blue-50/70 p-3.5 text-xs">
                    <span className="text-slate-700">
                        {requireEscrowBeforeStart
                            ? 'Cấu hình bảo vệ Ký quỹ đang bật: Hệ thống yêu cầu khách hoàn tất nạp Ký quỹ VietQR trước khi bắt đầu chuyến bay.'
                            : 'Đơn đã xác nhận. Khi tới giờ thực hiện tại hiện trường, nhấn bắt đầu bay để ghi nhận tiến độ.'}
                    </span>
                    <Button disabled={isStarting} onClick={onStart}>
                        <Play size={14} className="mr-1 inline" aria-hidden="true"/>
                        Bắt đầu thực hiện chuyến bay
                    </Button>
                </div>
            )}

            {mission.status === 'IN_PROGRESS' && (
                <div className="uav-bezel">
                    <div className="uav-bezel-core space-y-2.5 p-3.5">
                    <label className="block text-xs font-bold text-slate-800">
                        Biên bản kết quả bàn giao cho khách hàng<RequiredMark/>
                        <input
                            type="text"
                            aria-required
                            value={handoverNote}
                            onChange={e => onChangeHandoverNote(e.target.value)}
                            placeholder="VD: Đã bay quét đủ 50ha, tải lên 420 ảnh GNSS và bình đồ GeoTIFF..."
                            className="mt-1 h-10 w-full rounded-control border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900"
                        />
                    </label>
                    <div className="flex justify-end">
                        <Button disabled={isCompleting} onClick={onComplete}>
                            <CheckCircle2 size={14} className="mr-1 inline" aria-hidden="true"/>
                            Hoàn tất & Gửi khách nghiệm thu giải ngân
                        </Button>
                    </div>
                    </div>
                </div>
            )}
        </article>
    );
}
