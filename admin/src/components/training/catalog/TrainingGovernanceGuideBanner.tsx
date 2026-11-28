'use client';

import {useState} from 'react';
import Link from 'next/link';
import {
    BookOpen,
    ChevronDown,
    ChevronUp,
    Eye,
    FileUp,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';
import type {TrainingPortalTier} from '@/types/training.types';

const WORKFLOW_STEPS = [
    {
        num: 1,
        icon: BookOpen,
        title: '1. Soạn SOP & tài liệu chuẩn',
        desc: 'Chọn đúng cổng áp dụng, phân loại danh mục, gắn nhãn bắt buộc và xây dựng checklist kiểm tra.',
    },
    {
        num: 2,
        icon: FileUp,
        title: '2. Đính kèm PDF, slide & video',
        desc: 'Tải lên tài liệu hướng dẫn, biểu mẫu kiểm tra an toàn bay và hồ sơ pháp lý mẫu cho từng bài học.',
    },
    {
        num: 3,
        icon: Eye,
        title: '3. Xem thử như học viên',
        desc: 'Rà soát bố cục, thứ tự bài học và khả năng hiển thị PDF/video trước khi mở rộng cho người dùng.',
    },
    {
        num: 4,
        icon: ShieldCheck,
        title: '4. Phát hành & đối chiếu KYC',
        desc: 'Xuất bản tới đúng vai trò và dùng làm bộ tiêu chuẩn đối chiếu khi duyệt hồ sơ đối tác đội bay.',
    },
] as const;

const PORTAL_SHORTCUTS: {portal: TrainingPortalTier; href: string; label: string}[] = [
    {portal: 'CUSTOMER', href: '/admin/training/customer', label: 'Tài liệu Khách hàng'},
    {portal: 'OPERATIONS', href: '/admin/training/operations', label: 'SOP Điều hành & Đội bay'},
    {portal: 'ADMIN', href: '/admin/training/admin', label: 'Quy chuẩn Quản trị'},
];

export function TrainingGovernanceGuideBanner({
    activePortal,
}: {
    activePortal: TrainingPortalTier;
}) {
    const [expanded, setExpanded] = useState(true);

    return (
        <section
            aria-label="Quy trình quản trị tài liệu vận hành và SOP"
            className="bg-surface-variant/40 px-5 py-3.5"
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-badge bg-[var(--uav-color-primary-light)] px-2.5 py-0.5 text-xs font-semibold text-primary">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true"/>
                        Quy trình quản trị tài liệu & SOP nền tảng
                    </span>
                    <nav aria-label="Chuyển nhanh cổng tài liệu" className="flex flex-wrap items-center gap-1.5">
                        {PORTAL_SHORTCUTS.map(item => {
                            const active = item.portal === activePortal;
                            return (
                                <Link
                                    key={item.portal}
                                    href={item.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={`rounded-badge border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                                        active
                                            ? 'border-primary bg-primary text-white'
                                            : 'border-border bg-card text-muted hover:border-slate-400 hover:text-foreground'
                                    }`}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                        <Link
                            href="/admin/marketplace/providers"
                            className="inline-flex items-center gap-1 rounded-badge border border-slate-300 bg-card px-2.5 py-0.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                        >
                            <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true"/>
                            Duyệt đối tác KYC
                        </Link>
                    </nav>
                </div>

                <button
                    type="button"
                    onClick={() => setExpanded(prev => !prev)}
                    aria-expanded={expanded}
                    className="inline-flex items-center gap-1 rounded-control px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-card hover:text-foreground"
                >
                    <span>{expanded ? 'Thu gọn hướng dẫn' : 'Xem quy trình 4 bước'}</span>
                    {expanded ? (
                        <ChevronUp className="h-3.5 w-3.5" aria-hidden="true"/>
                    ) : (
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true"/>
                    )}
                </button>
            </div>

            {expanded && (
                <ol className="m-0 mt-3 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2 xl:grid-cols-4">
                    {WORKFLOW_STEPS.map(step => {
                        const Icon = step.icon;
                        return (
                            <li
                                key={step.num}
                                className="flex items-start gap-2.5 rounded-panel border border-border bg-card p-3"
                            >
                                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-control bg-slate-900 text-white">
                                    <Icon className="h-3.5 w-3.5" aria-hidden="true"/>
                                </span>
                                <div className="min-w-0 space-y-0.5">
                                    <strong className="block text-xs font-semibold text-foreground">
                                        {step.title}
                                    </strong>
                                    <p className="m-0 text-[11px] leading-relaxed text-muted">
                                        {step.desc}
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}
        </section>
    );
}
