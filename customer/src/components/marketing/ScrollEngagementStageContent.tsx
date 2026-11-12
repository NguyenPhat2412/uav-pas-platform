'use client';

import Link from 'next/link';
import {
    ArrowRight,
    Clock,
    Compass,
    GraduationCap,
    LogIn,
    MessageSquareText,
    PhoneCall,
    Sparkles,
    UserPlus,
} from 'lucide-react';
import {ZaloBrandIcon} from '@/components/support/ZaloBrandIcon';
import {formatPhoneDisplay, toTelHref, toZaloChatUrl} from '@/utils/support/contact-format';
import type {
    PublicDiscoveryData,
    PublicDiscoveryPlanItem,
    PublicDiscoveryServiceItem,
    PublicDiscoveryTrainingItem,
} from '@/types/support/support.types';

export type ScrollEngagementStage = 'services' | 'plans' | 'training' | 'contact';

interface ScrollEngagementStageContentProps {
    stage: ScrollEngagementStage;
    isSignedIn: boolean;
    data: PublicDiscoveryData | undefined;
    selectedServiceIdx: number;
    onSelectService: (idx: number) => void;
    selectedPlanIdx: number;
    onSelectPlan: (idx: number) => void;
    selectedTrainingIdx: number;
    onSelectTraining: (idx: number) => void;
    onOpenLogin: (next?: string) => void;
    onOpenRegister: () => void;
    onOpenSupport: (topic: string, prompt: string) => void;
}

function formatVnd(amount: number): string {
    return `${new Intl.NumberFormat('vi-VN').format(Math.round(amount))} ₫`;
}

export function ScrollEngagementStageContent({
    stage,
    isSignedIn,
    data,
    selectedServiceIdx,
    onSelectService,
    selectedPlanIdx,
    onSelectPlan,
    selectedTrainingIdx,
    onSelectTraining,
    onOpenLogin,
    onOpenRegister,
    onOpenSupport,
}: ScrollEngagementStageContentProps) {
    const services = data?.services ?? [];
    const plans = data?.plans ?? [];
    const trainings = data?.trainings ?? [];

    const activeService: PublicDiscoveryServiceItem | undefined =
        services[selectedServiceIdx] ?? services[0];
    const activePlan: PublicDiscoveryPlanItem | undefined =
        plans[selectedPlanIdx] ?? plans[Math.min(1, Math.max(0, plans.length - 1))];
    const activeTraining: PublicDiscoveryTrainingItem | undefined =
        trainings[selectedTrainingIdx] ?? trainings[0];

    if (stage === 'services') {
        return (
            <div className="space-y-3">
                <div className="space-y-1">
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                        <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                        Dịch vụ này có thể hợp với bạn
                    </p>
                    <h4 className="text-sm font-extrabold leading-snug text-slate-900">
                        Khám phá nhanh danh mục bay UAV đang mở điều phối
                    </h4>
                </div>

                {services.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {services.slice(0, 4).map((svc, idx) => {
                            const selected = idx === (selectedServiceIdx < services.length ? selectedServiceIdx : 0);
                            return (
                                <button
                                    key={svc.code}
                                    type="button"
                                    onClick={() => onSelectService(idx)}
                                    className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                        selected
                                            ? 'border-primary bg-primary text-white shadow-xs'
                                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                                    }`}
                                >
                                    {svc.name}
                                </button>
                            );
                        })}
                    </div>
                )}

                {activeService && (
                    <div className="rounded-xl border border-slate-200/90 bg-slate-50/90 p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900">{activeService.name}</span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                                <Clock className="h-3 w-3 text-primary" aria-hidden="true" />
                                {activeService.defaultDurationMinutes} phút/ca
                            </span>
                        </div>
                        {activeService.description && (
                            <p className="text-xs leading-relaxed text-slate-600 line-clamp-2">
                                {activeService.description}
                            </p>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-0.5">
                    {isSignedIn ? (
                        <Link
                            href="/customer/missions/create"
                            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-control bg-primary px-3 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-primary-hover"
                        >
                            Tạo yêu cầu bay <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onOpenLogin('/customer/missions/create')}
                            className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-control bg-primary px-3 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-primary-hover"
                        >
                            <LogIn className="h-3.5 w-3.5" />
                            Đăng nhập đặt lịch
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() =>
                            onOpenSupport(
                                'SURVEY_SERVICE',
                                activeService
                                    ? `Tôi muốn tư vấn dịch vụ "${activeService.name}" (${activeService.defaultDurationMinutes} phút/ca) cho khu vực dự án.`
                                    : 'Tôi muốn tư vấn lựa chọn dịch vụ bay UAV phù hợp với nhu cầu khảo sát.',
                            )
                        }
                        className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-control border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-50"
                    >
                        <MessageSquareText className="h-3.5 w-3.5 text-primary" />
                        Tư vấn ngay
                    </button>
                </div>
            </div>
        );
    }

    if (stage === 'plans') {
        return (
            <div className="space-y-3">
                <div className="space-y-1">
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        Đăng nhập &amp; Chọn hạn mức bay
                    </p>
                    <h4 className="text-sm font-extrabold leading-snug text-slate-900">
                        {isSignedIn
                            ? 'Nâng cấp gói giờ bay trực tiếp trong Cổng Khách hàng'
                            : 'Đăng nhập để kích hoạt gói bay và theo dõi tiến độ trực tuyến'}
                    </h4>
                </div>

                {plans.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {plans.map((plan, idx) => {
                            const effectiveIdx =
                                selectedPlanIdx < plans.length
                                    ? selectedPlanIdx
                                    : Math.min(1, Math.max(0, plans.length - 1));
                            const selected = idx === effectiveIdx;
                            return (
                                <button
                                    key={plan.code}
                                    type="button"
                                    onClick={() => onSelectPlan(idx)}
                                    className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                        selected
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                    {plan.code}
                                </button>
                            );
                        })}
                    </div>
                )}

                {activePlan && (
                    <div className="rounded-xl border border-slate-200/90 bg-slate-50/90 p-3 space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900">{activePlan.name}</span>
                            <span className="text-sm font-black text-primary tabular-nums">
                                {formatVnd(activePlan.price)}/tháng
                            </span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-600">
                            Hạn mức <strong>{activePlan.maxMonthlyFlightHours} giờ bay/tháng</strong> · Tối đa{' '}
                            <strong>{activePlan.maxConcurrentUavs} UAV</strong> điều phối đồng thời
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-0.5">
                    {isSignedIn ? (
                        <Link
                            href="/customer/billing"
                            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-control bg-primary px-3 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-primary-hover"
                        >
                            Quản lý gói cước <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onOpenLogin('/customer/billing')}
                            className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-control bg-primary px-3 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-primary-hover"
                        >
                            <LogIn className="h-3.5 w-3.5" />
                            Đăng nhập ngay
                        </button>
                    )}
                    {!isSignedIn ? (
                        <button
                            type="button"
                            onClick={onOpenRegister}
                            className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-control border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-50"
                        >
                            <UserPlus className="h-3.5 w-3.5 text-primary" />
                            Đăng ký mới
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() =>
                                onOpenSupport(
                                    'PRICING_PLAN',
                                    activePlan
                                        ? `Tôi muốn nhận tư vấn chi tiết về ${activePlan.name} (${activePlan.maxMonthlyFlightHours} giờ bay/tháng).`
                                        : 'Tôi cần tư vấn chọn gói cước giờ bay phù hợp.',
                                )
                            }
                            className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-control border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-50"
                        >
                            <MessageSquareText className="h-3.5 w-3.5 text-primary" />
                            Hỏi gói cước
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (stage === 'training') {
        return (
            <div className="space-y-3">
                <div className="space-y-1">
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                        <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                        Đào tạo &amp; Học viện SOP UAV
                    </p>
                    <h4 className="text-sm font-extrabold leading-snug text-slate-900">
                        Bạn muốn học đào tạo về UAV? Hãy liên hệ chúng tôi!
                    </h4>
                </div>

                {trainings.length > 1 && (
                    <div className="flex flex-wrap gap-1.5">
                        {trainings.slice(0, 3).map((doc, idx) => {
                            const selected = idx === (selectedTrainingIdx < trainings.length ? selectedTrainingIdx : 0);
                            return (
                                <button
                                    key={doc.code}
                                    type="button"
                                    onClick={() => onSelectTraining(idx)}
                                    className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                        selected
                                            ? 'border-primary bg-primary text-white'
                                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                    Chuyên đề 0{idx + 1}
                                </button>
                            );
                        })}
                    </div>
                )}

                {activeTraining ? (
                    <div className="rounded-xl border border-slate-200/90 bg-slate-50/90 p-3 space-y-1">
                        <p className="text-xs font-bold leading-snug text-slate-900">
                            {activeTraining.title}
                        </p>
                        <p className="text-[11px] leading-relaxed text-slate-600 line-clamp-2">
                            {activeTraining.summary}
                        </p>
                        <p className="text-[11px] font-semibold text-primary">
                            Thời lượng học tiêu chuẩn: ~{activeTraining.estimatedMinutes} phút
                        </p>
                    </div>
                ) : (
                    <p className="text-xs leading-relaxed text-slate-600">
                        Hướng dẫn chuẩn bị hiện trường bay, lựa chọn cảm biến GSD, an toàn tiền bay và khai thác dữ liệu bàn giao 2D/3D.
                    </p>
                )}

                <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <button
                        type="button"
                        onClick={() =>
                            onOpenSupport(
                                'TRAINING_SOP',
                                activeTraining
                                    ? `Tôi muốn đăng ký tìm hiểu khóa học đào tạo UAV: "${activeTraining.title}". Nhờ đội ngũ liên hệ tư vấn!`
                                    : 'Tôi muốn tìm hiểu chương trình học đào tạo vận hành UAV, nhờ đội ngũ liên hệ tư vấn!',
                            )
                        }
                        className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-control bg-primary px-3 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-primary-hover"
                    >
                        <MessageSquareText className="h-3.5 w-3.5" />
                        Liên hệ đào tạo
                    </button>
                    {isSignedIn ? (
                        <Link
                            href="/customer/training"
                            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-control border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-50"
                        >
                            Vào Học viện <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onOpenLogin('/customer/training')}
                            className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-control border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-50"
                        >
                            <LogIn className="h-3.5 w-3.5 text-primary" />
                            Học trực tuyến
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const zaloUrl = toZaloChatUrl(data?.zaloPhone);
    const zaloDisplay = formatPhoneDisplay(data?.zaloPhone);
    const telHref = toTelHref(data?.dispatchHotline);
    return (
        <div className="space-y-3">
            <div className="space-y-1">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                    <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
                    Đồng hành triển khai thực địa
                </p>
                <h4 className="text-sm font-extrabold leading-snug text-slate-900">
                    Cần kiểm tra vùng bay NFZ hoặc điều phối tổ bay khảo sát?
                </h4>
                <p className="text-xs leading-relaxed text-slate-600">
                    Đội điều phối hỗ trợ thẩm định tọa độ khu vực bay, tư vấn cảm biến và khởi tạo tài khoản khách hàng ngay trên hệ thống.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                    type="button"
                    onClick={() =>
                        onOpenSupport(
                            'FLIGHT_PERMIT_NFZ',
                            'Tôi cần hỗ trợ kiểm tra tọa độ vùng bay, thủ tục cấp phép và phương án triển khai khảo sát thực địa.',
                        )
                    }
                    className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-control bg-primary px-3 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-primary-hover"
                >
                    <MessageSquareText className="h-3.5 w-3.5" />
                    Chat với Admin
                </button>
                {zaloUrl ? (
                    <a
                        href={zaloUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-control bg-[#0068FF] px-3 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#0058db]"
                    >
                        <ZaloBrandIcon className="h-4 w-4" />
                        <span>Zalo {zaloDisplay}</span>
                    </a>
                ) : telHref ? (
                    <a
                        href={telHref}
                        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-control border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-50"
                    >
                        <PhoneCall className="h-3.5 w-3.5 text-primary" />
                        Gọi Hotline
                    </a>
                ) : (
                    <button
                        type="button"
                        onClick={onOpenRegister}
                        className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-control border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-50"
                    >
                        <UserPlus className="h-3.5 w-3.5 text-primary" />
                        Tạo tài khoản
                    </button>
                )}
            </div>
        </div>
    );
}
