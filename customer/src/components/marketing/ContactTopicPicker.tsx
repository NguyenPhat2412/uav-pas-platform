'use client';

import {Compass, GraduationCap, KeyRound, Layers, Radar, ShieldCheck, type LucideIcon} from 'lucide-react';

export interface ContactTopicOption {
    value: string;
    label: string;
    hint: string;
    icon: LucideIcon;
    fallback: string;
}

export const CONTACT_TOPIC_OPTIONS: readonly ContactTopicOption[] = [
    {
        value: 'SURVEY_SERVICE',
        label: 'Khảo sát GIS 2D/3D',
        hint: 'Bình đồ trực giao, DSM/DTM, quay chụp',
        icon: Compass,
        fallback: 'Yêu cầu tư vấn dịch vụ bay khảo sát lập bản đồ GIS và quay chụp kỹ thuật.',
    },
    {
        value: 'PRICING_PLAN',
        label: 'Gói cước & Báo giá',
        hint: 'Basic · Pro · Enterprise theo giờ bay',
        icon: Layers,
        fallback: 'Yêu cầu tư vấn bảng giá các gói cước Basic / Pro / Enterprise.',
    },
    {
        value: 'FLIGHT_PERMIT_NFZ',
        label: 'Phép bay & Vùng NFZ',
        hint: 'Thẩm định tọa độ & hồ sơ cấp phép',
        icon: ShieldCheck,
        fallback: 'Yêu cầu hỗ trợ kiểm tra vùng hạn chế bay (NFZ) và thủ tục xin phép bay.',
    },
    {
        value: 'ACCOUNT_DISPATCH',
        label: 'Cấp tài khoản đội bay',
        hint: 'Doanh nghiệp & Điều hành nội bộ',
        icon: KeyRound,
        fallback: 'Yêu cầu hướng dẫn đăng ký và cấp tài khoản vận hành trên nền tảng.',
    },
    {
        value: 'TRAINING_SOP',
        label: 'Đào tạo & SOP UAV',
        hint: 'Huấn luyện an toàn tiền bay',
        icon: GraduationCap,
        fallback: 'Yêu cầu tư vấn đào tạo an toàn bay và học viện quy trình SOP UAV.',
    },
    {
        value: 'SAR_AI_RND',
        label: 'Buồng lái SAR & AI',
        hint: 'Tìm kiếm cứu nạn & Edge AI',
        icon: Radar,
        fallback: 'Trao đổi kỹ thuật về tính năng phát hiện có AI hỗ trợ và buồng lái SAR.',
    },
];

export const CONTACT_SCOPE_TAGS = [
    'Khảo sát < 50 ha',
    'Dự án 50 – 200 ha',
    'Hành lang dài / > 200 ha',
    'Triển khai ngay trong tuần',
] as const;

export function ContactTopicPicker({
    selectedTopic,
    onSelectTopic,
}: {
    selectedTopic: string;
    onSelectTopic: (topic: string) => void;
}) {
    return (
        <div>
            <span className="mb-2 block text-xs font-bold text-slate-700">
                1. Chọn nội dung cần chuyên viên tư vấn
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Nội dung quan tâm">
                {CONTACT_TOPIC_OPTIONS.map((item) => {
                    const Icon = item.icon;
                    const active = selectedTopic === item.value;
                    return (
                        <button
                            key={item.value}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => onSelectTopic(item.value)}
                            className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all ${
                                active
                                    ? 'border-primary bg-uav-red-light/70 shadow-2xs'
                                    : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                            }`}
                        >
                            <span
                                className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                    active ? 'bg-primary text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200/80'
                                }`}
                            >
                                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                            </span>
                            <span className="min-w-0">
                                <span className={`block text-xs font-bold leading-snug ${active ? 'text-primary' : 'text-slate-900'}`}>
                                    {item.label}
                                </span>
                                <span className="mt-0.5 block truncate text-[11px] text-slate-500">{item.hint}</span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
