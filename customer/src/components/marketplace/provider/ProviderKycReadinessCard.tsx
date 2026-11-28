'use client';

import {
    BadgeCheck,
    Building2,
    CheckCircle2,
    Clock,
    FileCheck2,
    Lock,
    Rocket,
    ShieldAlert,
} from 'lucide-react';
import {verificationStatusLabel} from '@/forms/marketplace-forms';
import type {
    ProviderDocument,
    ProviderDocumentType,
    ProviderProfile,
    ProviderType,
    ProviderVerificationStatus,
} from '@/types/marketplace.types';

export type CustomerDocRequirementLevel = 'REQUIRED' | 'CONDITIONAL' | 'NOT_APPLICABLE';

export interface CustomerDocRule {
    code: ProviderDocumentType;
    individual: CustomerDocRequirementLevel;
    company: CustomerDocRequirementLevel;
}

export const CUSTOMER_PROVIDER_DOC_RULES: readonly CustomerDocRule[] = [
    {code: 'IDENTITY_CARD', individual: 'REQUIRED', company: 'REQUIRED'},
    {code: 'BUSINESS_LICENSE', individual: 'NOT_APPLICABLE', company: 'REQUIRED'},
    {code: 'PILOT_CERTIFICATE', individual: 'REQUIRED', company: 'REQUIRED'},
    {code: 'UAV_REGISTRATION', individual: 'REQUIRED', company: 'REQUIRED'},
    {code: 'INSURANCE_POLICY', individual: 'REQUIRED', company: 'REQUIRED'},
    {code: 'FLIGHT_OPERATION_PERMIT', individual: 'CONDITIONAL', company: 'CONDITIONAL'},
    {code: 'PLATFORM_FEE_AGREEMENT', individual: 'REQUIRED', company: 'REQUIRED'},
    {code: 'TAX_SETTLEMENT_DOSSIER', individual: 'CONDITIONAL', company: 'REQUIRED'},
] as const;

export function computeCustomerRequiredDocStats(providerType: ProviderType, documents: ProviderDocument[]) {
    const uploadedTypes = new Set(documents.map(d => d.documentType));
    const requiredRules = CUSTOMER_PROVIDER_DOC_RULES.filter(
        r => (providerType === 'COMPANY' ? r.company : r.individual) === 'REQUIRED',
    );
    const uploaded = requiredRules.filter(r => uploadedTypes.has(r.code)).length;
    return {uploaded, total: requiredRules.length};
}

function resolveStageStates(
    status: ProviderVerificationStatus,
    profileReady: boolean,
    requiredDocsDone: boolean,
): Array<'completed' | 'current' | 'blocked' | 'upcoming'> {
    if (status === 'VERIFIED') {
        return ['completed', 'completed', 'completed', 'completed', 'current'];
    }
    if (status === 'SUSPENDED') {
        return ['completed', 'completed', 'completed', 'blocked', 'upcoming'];
    }
    if (status === 'REJECTED') {
        return ['completed', 'blocked', 'upcoming', 'upcoming', 'upcoming'];
    }
    if (status === 'PENDING_REVIEW') {
        return ['completed', 'completed', 'current', 'upcoming', 'upcoming'];
    }
    if (!profileReady) return ['current', 'upcoming', 'upcoming', 'upcoming', 'upcoming'];
    if (!requiredDocsDone) return ['completed', 'current', 'upcoming', 'upcoming', 'upcoming'];
    return ['completed', 'completed', 'current', 'upcoming', 'upcoming'];
}

function nextActionCopy(status: ProviderVerificationStatus): string {
    switch (status) {
        case 'VERIFIED':
            return 'Hồ sơ đã được xác minh và kích hoạt ví đối soát. Bạn có thể đăng dịch vụ và nhận đơn bay trên sàn UAV PAS.';
        case 'PENDING_REVIEW':
            return 'Ban quản trị đang kiểm tra từng giấy tờ bạn đã nộp. Bạn vẫn có thể bổ sung chứng từ mới nếu cần.';
        case 'REJECTED':
            return 'Xem ghi chú thẩm định từ Quản trị viên, cập nhật các giấy tờ còn thiếu hoặc cần sửa rồi nhấn Gửi duyệt lại.';
        case 'SUSPENDED':
            return 'Hoạt động đối tác đang tạm ngưng để rà soát giấy phép hoặc chất lượng dịch vụ. Vui lòng xem ghi chú và cập nhật giấy tờ còn hạn.';
        default:
            return 'Hoàn tất thông tin đơn vị, tài khoản nhận đối soát và đính kèm đủ bộ giấy tờ bắt buộc rồi nhấn Lưu & Gửi duyệt.';
    }
}

export function ProviderKycReadinessCard({
    profile,
    providerType,
    platformFeeRate,
    step1Done,
    step2Done,
    step3Done,
}: {
    profile: ProviderProfile | null;
    providerType: ProviderType;
    platformFeeRate: number;
    step1Done: boolean;
    step2Done: boolean;
    step3Done: boolean;
}) {
    const completedSections = [step1Done, step2Done, step3Done].filter(Boolean).length;
    const status: ProviderVerificationStatus = profile?.verificationStatus ?? 'DRAFT';
    const docs = profile?.documents ?? [];
    const reqStats = computeCustomerRequiredDocStats(providerType, docs);
    const states = resolveStageStates(
        status,
        step1Done && step2Done,
        reqStats.uploaded >= reqStats.total && reqStats.total > 0,
    );

    const lifecycleSteps = [
        {num: 1, icon: Building2, title: '1. Tạo hồ sơ đơn vị', desc: 'Khai báo pháp nhân, khu vực bay và tài khoản đối soát.'},
        {num: 2, icon: FileCheck2, title: '2. Nộp đủ giấy tờ', desc: 'Đính kèm bộ giấy tờ bắt buộc theo loại hình đăng ký.'},
        {num: 3, icon: Clock, title: '3. Chờ thẩm định', desc: 'Quản trị viên đối chiếu số hiệu, tệp chứng từ và năng lực bay.'},
        {num: 4, icon: BadgeCheck, title: '4. Xác minh & mở ví', desc: 'Phê duyệt kích hoạt ví đối soát hoặc yêu cầu bổ sung.'},
        {num: 5, icon: Rocket, title: '5. Sẵn sàng nhận đơn', desc: 'Niêm yết dịch vụ công khai và tiếp nhận yêu cầu từ khách.'},
    ];

    return (
        <>
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                            Tiến trình xác minh đối tác (5 bước) · {completedSections}/3 mục hồ sơ
                        </span>
                        <p className="m-0 mt-0.5 text-xs text-slate-600">
                            Đính kèm đủ giấy tờ pháp lý, chứng chỉ bay và xác nhận Phụ lục Biểu phí ({(platformFeeRate * 100).toFixed(1)}% theo khung chuẩn) để kích hoạt quyền niêm yết dịch vụ.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className={`rounded-full px-3 py-1 text-xs font-bold tabular-nums ${
                                reqStats.uploaded >= reqStats.total
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-amber-50 text-amber-800'
                            }`}
                        >
                            Giấy tờ bắt buộc: {reqStats.uploaded}/{reqStats.total}
                        </span>
                        <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800 tabular-nums">
                            {Math.round((completedSections / 3) * 100)}% hồ sơ
                        </span>
                    </div>
                </div>

                {/* 5-step Visual Verification Progress Stepper */}
                <ol className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2 lg:grid-cols-5">
                    {lifecycleSteps.map((step, idx) => {
                        const state = states[idx];
                        const Icon = step.icon;
                        const boxClass =
                            state === 'current'
                                ? 'border-primary bg-uav-red-light/50'
                                : state === 'blocked'
                                  ? 'border-rose-300 bg-rose-50/70'
                                  : state === 'completed'
                                    ? 'border-slate-300 bg-slate-50'
                                    : 'border-slate-200 bg-white';
                        const badgeClass =
                            state === 'current'
                                ? 'bg-primary text-white'
                                : state === 'blocked'
                                  ? 'bg-danger text-white'
                                  : state === 'completed'
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-slate-100 text-slate-500';
                        return (
                            <li key={step.num} className={`flex items-start gap-2 rounded-xl border p-2.5 ${boxClass}`}>
                                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${badgeClass}`}>
                                    {state === 'completed' ? (
                                        <CheckCircle2 size={13} aria-hidden="true"/>
                                    ) : state === 'blocked' ? (
                                        <ShieldAlert size={13} aria-hidden="true"/>
                                    ) : (
                                        <Icon size={13} aria-hidden="true"/>
                                    )}
                                </span>
                                <div className="min-w-0 space-y-0.5">
                                    <strong className="block text-xs font-bold text-slate-900">{step.title}</strong>
                                    <p className="m-0 text-[11px] leading-snug text-slate-600">{step.desc}</p>
                                </div>
                            </li>
                        );
                    })}
                </ol>

                <p
                    className={`m-0 rounded-xl px-3 py-2 text-xs ${
                        status === 'REJECTED' || status === 'SUSPENDED'
                            ? 'border border-rose-200 bg-rose-50 text-danger'
                            : status === 'VERIFIED'
                              ? 'border border-slate-300 bg-slate-100 text-slate-900'
                              : 'bg-slate-50 text-slate-700'
                    }`}
                >
                    <strong className="mr-1">Bước tiếp theo:</strong>
                    {nextActionCopy(status)}
                </p>

                <p className="m-0 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Lock size={12} className="shrink-0 text-slate-400" aria-hidden="true"/>
                    <span>Thông tin định danh, tài khoản ngân hàng và tệp giấy tờ được bảo vệ mã hoá an toàn khi lưu trữ.</span>
                </p>
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
                            <p className="m-0 text-xs font-medium text-rose-700">
                                Ghi chú từ Quản trị viên: {profile.reviewNote}
                            </p>
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
