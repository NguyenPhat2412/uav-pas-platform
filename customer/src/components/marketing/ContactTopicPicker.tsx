'use client';

import {Compass, GraduationCap, KeyRound, Layers, Radar, ShieldCheck, type LucideIcon} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';

export interface ContactTopicOption {
    value: string;
    labelKey: string;
    hintKey: string;
    icon: LucideIcon;
    fallback: string;
}

export const CONTACT_TOPIC_OPTIONS: readonly ContactTopicOption[] = [
    {
        value: 'SURVEY_SERVICE',
        labelKey: 'publicSite.contact.t1Label',
        hintKey: 'publicSite.contact.t1Hint',
        icon: Compass,
        fallback: 'Yêu cầu tư vấn dịch vụ bay khảo sát lập bản đồ GIS và quay chụp kỹ thuật.',
    },
    {
        value: 'PRICING_PLAN',
        labelKey: 'publicSite.contact.t2Label',
        hintKey: 'publicSite.contact.t2Hint',
        icon: Layers,
        fallback: 'Yêu cầu tư vấn các gói phần mềm Basic / Pro / Enterprise.',
    },
    {
        value: 'FLIGHT_PERMIT_NFZ',
        labelKey: 'publicSite.contact.t3Label',
        hintKey: 'publicSite.contact.t3Hint',
        icon: ShieldCheck,
        fallback: 'Yêu cầu hỗ trợ kiểm tra vùng hạn chế bay (NFZ) và thủ tục hồ sơ phép bay.',
    },
    {
        value: 'ACCOUNT_DISPATCH',
        labelKey: 'publicSite.contact.t4Label',
        hintKey: 'publicSite.contact.t4Hint',
        icon: KeyRound,
        fallback: 'Yêu cầu hướng dẫn hồ sơ pháp lý và đăng ký gian hàng đối tác dịch vụ UAV.',
    },
    {
        value: 'TRAINING_SOP',
        labelKey: 'publicSite.contact.t5Label',
        hintKey: 'publicSite.contact.t5Hint',
        icon: GraduationCap,
        fallback: 'Yêu cầu tư vấn đào tạo an toàn bay và học viện quy trình SOP UAV.',
    },
    {
        value: 'SAR_AI_RND',
        labelKey: 'publicSite.contact.t6Label',
        hintKey: 'publicSite.contact.t6Hint',
        icon: Radar,
        fallback: 'Trao đổi kỹ thuật về tính năng phát hiện có AI hỗ trợ và buồng lái SAR.',
    },
];

export const CONTACT_SCOPE_KEYS = [
    'publicSite.contact.s1',
    'publicSite.contact.s2',
    'publicSite.contact.s3',
    'publicSite.contact.s4',
] as const;

export function ContactTopicPicker({
    selectedTopic,
    onSelectTopic,
}: {
    selectedTopic: string;
    onSelectTopic: (topic: string) => void;
}) {
    const {t} = useI18n();

    return (
        <div>
            <span className="mb-2 block text-xs font-bold text-slate-700">
                {t('publicSite.contact.topicHeading')}
            </span>
            <div
                className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3"
                role="radiogroup"
                aria-label={t('publicSite.contact.topicHeading')}
            >
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
                            className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${
                                active
                                    ? 'border-primary bg-uav-red-light/70 shadow-2xs'
                                    : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                            }`}
                        >
                            <span
                                className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                    active
                                        ? 'bg-primary text-white'
                                        : 'bg-white text-slate-600 ring-1 ring-slate-200/80'
                                }`}
                            >
                                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                            </span>
                            <span className="min-w-0">
                                <span
                                    className={`block text-xs font-bold leading-snug ${
                                        active ? 'text-primary' : 'text-slate-900'
                                    }`}
                                >
                                    {t(item.labelKey)}
                                </span>
                                <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                                    {t(item.hintKey)}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
