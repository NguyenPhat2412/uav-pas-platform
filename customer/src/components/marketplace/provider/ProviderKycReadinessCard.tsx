'use client';

import {CheckCircle2} from 'lucide-react';
import {verificationStatusLabel} from '@/forms/marketplace/marketplace-forms';
import type {ProviderProfile} from '@/types/marketplace/marketplace.types';

export function ProviderKycReadinessCard({
    profile,
    platformFeeRate,
    step1Done,
    step2Done,
    step3Done,
}: {
    profile: ProviderProfile | null;
    platformFeeRate: number;
    step1Done: boolean;
    step2Done: boolean;
    step3Done: boolean;
}) {
    const completedSteps = [step1Done, step2Done, step3Done].filter(Boolean).length;

    return (
        <>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                            Tiến độ hoàn thiện gian hàng ({completedSteps}/3 bước)
                        </span>
                        <p className="m-0 mt-0.5 text-xs text-slate-600">
                            Miễn phí mở gian hàng · Phí vận hành sàn mặc định {(platformFeeRate * 100).toFixed(1)}% chỉ thu khi hoàn tất nghiệm thu đơn hàng.
                        </p>
                    </div>
                    <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800 tabular-nums">
                        {Math.round((completedSteps / 3) * 100)}% hoàn tất
                    </span>
                </div>
                <ol className="m-0 mt-3 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-3">
                    {[
                        {label: '1. Hồ sơ đơn vị & Khu vực', done: step1Done},
                        {label: '2. Ngân hàng nhận Ký quỹ', done: step2Done},
                        {label: '3. Chứng chỉ & Pháp lý', done: step3Done},
                    ].map(step => (
                        <li
                            key={step.label}
                            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${
                                step.done
                                    ? 'border-slate-800 bg-slate-100/70 text-slate-900'
                                    : 'border-slate-200 bg-slate-50 text-slate-600'
                            }`}
                        >
                            <CheckCircle2
                                size={14}
                                className={step.done ? 'text-slate-900' : 'text-slate-400'}
                                aria-hidden="true"
                            />
                            <span>{step.label}</span>
                        </li>
                    ))}
                </ol>
            </div>

            {profile && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-500">Trạng thái thẩm định hiện tại</span>
                        <p className="m-0 flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
                            <CheckCircle2 size={16} className="text-primary" aria-hidden="true"/>
                            {verificationStatusLabel(profile.verificationStatus)}
                        </p>
                        {profile.reviewNote && (
                            <p className="m-0 text-xs text-slate-600">Ghi chú từ Quản trị viên: {profile.reviewNote}</p>
                        )}
                    </div>
                    <div className="text-right text-xs text-slate-500">
                        <div>Đánh giá: <strong className="text-slate-900">{Number(profile.ratingAvg || 0).toFixed(1)}/5</strong></div>
                        <div>Nhiệm vụ hoàn thành: <strong className="text-slate-900">{profile.completedMissionsCount}</strong></div>
                    </div>
                </div>
            )}
        </>
    );
}
