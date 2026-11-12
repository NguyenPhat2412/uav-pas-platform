'use client';

import {useState, type FormEvent} from 'react';
import Link from 'next/link';
import {CheckCircle2, Loader2, MessageCircleMore} from 'lucide-react';
import {
    canSubmitContactInquiry,
    contactFieldErrors,
    emptyContactInquiryDraft,
    toContactInquiryPayload,
} from '@/forms/marketing/contact-form';
import {
    getSupportErrorMessage,
    openPublicSupportWidget,
    saveStoredSupportToken,
    useCreatePublicSupportThread,
} from '@/hooks/support/usePublicSupport';
import type {PublicSupportThreadSession} from '@/types/support/support.types';

const TOPIC_FALLBACK_MESSAGES: Record<string, string> = {
    SURVEY_SERVICE: 'Yêu cầu tư vấn dịch vụ bay khảo sát lập bản đồ GIS và quay chụp kỹ thuật.',
    PRICING_PLAN: 'Yêu cầu tư vấn bảng giá các gói cước Basic / Pro / Enterprise.',
    FLIGHT_PERMIT_NFZ: 'Yêu cầu hỗ trợ kiểm tra vùng hạn chế bay (NFZ) và thủ tục xin phép bay.',
    ACCOUNT_DISPATCH: 'Yêu cầu hướng dẫn đăng ký và cấp tài khoản vận hành trên nền tảng.',
    SAR_AI_RND: 'Trao đổi kỹ thuật về tính năng phát hiện có AI hỗ trợ và buồng lái SAR.',
    TRAINING_SOP: 'Yêu cầu tư vấn đào tạo an toàn bay và học viện quy trình SOP UAV.',
};

const inputCls =
    'w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none';

export function ContactQuickForm() {
    const [draft, setDraft] = useState(emptyContactInquiryDraft);
    const [submittedSession, setSubmittedSession] = useState<PublicSupportThreadSession | null>(null);
    const createThread = useCreatePublicSupportThread();

    const fieldErrors = createThread.error ? contactFieldErrors(createThread.error) : null;
    const errorMessage = createThread.error ? getSupportErrorMessage(createThread.error) : null;

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!canSubmitContactInquiry(draft) || createThread.isPending) return;
        const payload = toContactInquiryPayload(draft);
        const fallbackMessage =
            TOPIC_FALLBACK_MESSAGES[payload.topic] ??
            'Yêu cầu tư vấn dịch vụ và hỗ trợ điều phối nhiệm vụ UAV.';

        createThread.mutate(
            {
                fullName: payload.fullName,
                organization: payload.organization,
                contactInfo: payload.contactInfo,
                topic: payload.topic,
                source: 'CONTACT_FORM',
                message: payload.message ?? fallbackMessage,
            },
            {
                onSuccess: (created) => {
                    saveStoredSupportToken(created.visitorToken, {open: false});
                    setSubmittedSession(created);
                },
            },
        );
    };

    if (submittedSession !== null) {
        return (
            <div className="space-y-4 rounded-2xl border border-rose-200 bg-uav-red-light/50 p-6">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-primary">
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            Đã chuyển tới Quản trị viên
                        </span>
                        <span className="rounded-md border border-rose-200 bg-white px-2 py-0.5 text-[11px] font-extrabold text-slate-900">
                            Mã phiên: {submittedSession.code}
                        </span>
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900">
                        Cảm ơn {submittedSession.fullName}! Yêu cầu tư vấn của bạn đã được tiếp nhận.
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-600">
                        Phiên trao đổi <strong className="font-bold text-slate-900">{submittedSession.code}</strong> đã được kết nối trực tiếp với biểu tượng hỗ trợ ở góc dưới bên phải màn hình. Bạn có thể mở khung chat để nhận phản hồi trực tiếp từ Quản trị viên hoặc khởi tạo nhiệm vụ trên bản đồ GIS.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                        type="button"
                        onClick={() => openPublicSupportWidget()}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-control bg-primary px-4 text-xs font-bold text-primary-foreground shadow-xs transition-colors hover:bg-primary-hover"
                    >
                        <MessageCircleMore className="h-4 w-4" aria-hidden="true" />
                        <span>Mở khung chat trực tuyến với Admin →</span>
                    </button>
                    <Link
                        href="/customer/missions/create"
                        className="inline-flex h-10 items-center justify-center rounded-control border border-slate-200 bg-white px-4 text-xs font-bold text-slate-800 transition-colors hover:border-primary hover:text-primary"
                    >
                        Khởi tạo nhiệm vụ trên GIS ngay →
                    </Link>
                    <button
                        type="button"
                        onClick={() => {
                            createThread.reset();
                            setSubmittedSession(null);
                            setDraft((prev) => ({...prev, message: ''}));
                        }}
                        className="text-xs font-semibold text-slate-600 underline hover:text-primary"
                    >
                        Gửi yêu cầu khác
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form noValidate onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label htmlFor="contact-fullname" className="mb-1 block text-xs font-bold text-slate-700">
                        Họ và tên <span className="text-primary">*</span>
                    </label>
                    <input
                        id="contact-fullname"
                        type="text"
                        aria-required
                        value={draft.fullName}
                        onChange={(e) => setDraft((prev) => ({...prev, fullName: e.target.value}))}
                        placeholder="Nguyễn Văn A"
                        className={inputCls}
                    />
                    {fieldErrors?.fullName && (
                        <p className="mt-1 text-[11px] font-medium text-rose-700">{fieldErrors.fullName}</p>
                    )}
                </div>
                <div>
                    <label htmlFor="contact-org" className="mb-1 block text-xs font-bold text-slate-700">
                        Đơn vị / Doanh nghiệp
                    </label>
                    <input
                        id="contact-org"
                        type="text"
                        value={draft.organization}
                        onChange={(e) => setDraft((prev) => ({...prev, organization: e.target.value}))}
                        placeholder="Công ty / Ban quản lý dự án..."
                        className={inputCls}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label htmlFor="contact-info" className="mb-1 block text-xs font-bold text-slate-700">
                        Email hoặc Số điện thoại <span className="text-primary">*</span>
                    </label>
                    <input
                        id="contact-info"
                        type="text"
                        aria-required
                        value={draft.contactInfo}
                        onChange={(e) => setDraft((prev) => ({...prev, contactInfo: e.target.value}))}
                        placeholder="email@doanhnghiep.vn / 09xx..."
                        className={inputCls}
                    />
                    {fieldErrors?.contactInfo && (
                        <p className="mt-1 text-[11px] font-medium text-rose-700">{fieldErrors.contactInfo}</p>
                    )}
                </div>
                <div>
                    <label htmlFor="contact-topic" className="mb-1 block text-xs font-bold text-slate-700">
                        Nội dung quan tâm
                    </label>
                    <select
                        id="contact-topic"
                        value={draft.topic}
                        onChange={(e) => setDraft((prev) => ({...prev, topic: e.target.value}))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-primary focus:bg-white focus:outline-none"
                    >
                        <option value="SURVEY_SERVICE">Đặt dịch vụ bay khảo sát GIS / Quay chụp</option>
                        <option value="PRICING_PLAN">Tư vấn gói cước Basic / Pro / Enterprise</option>
                        <option value="FLIGHT_PERMIT_NFZ">Kiểm tra vùng hạn chế bay (NFZ) &amp; Xin phép bay</option>
                        <option value="ACCOUNT_DISPATCH">Đăng ký &amp; Cấp tài khoản vận hành nội bộ</option>
                        <option value="SAR_AI_RND">Góp ý kỹ thuật: AI thử nghiệm &amp; Buồng lái SAR</option>
                        <option value="TRAINING_SOP">Đào tạo an toàn bay &amp; Học viện SOP UAV</option>
                    </select>
                </div>
            </div>

            <div>
                <label htmlFor="contact-message" className="mb-1 block text-xs font-bold text-slate-700">
                    Mô tả ngắn khu vực bay hoặc nhu cầu kỹ thuật
                </label>
                <textarea
                    id="contact-message"
                    rows={3}
                    value={draft.message}
                    onChange={(e) => setDraft((prev) => ({...prev, message: e.target.value}))}
                    placeholder="Ví dụ: Khảo sát bình đồ 2D/3D khu công nghiệp 120 ha tại Bắc Ninh, yêu cầu GSD 2 cm/px..."
                    className={inputCls}
                />
            </div>

            {errorMessage && (
                <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-800">
                    {errorMessage}
                </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button
                    type="submit"
                    disabled={!canSubmitContactInquiry(draft) || createThread.isPending}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-primary px-5 text-xs font-bold text-primary-foreground shadow-xs transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                    {createThread.isPending ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            <span>Đang gửi yêu cầu...</span>
                        </>
                    ) : (
                        <span>Gửi yêu cầu tư vấn →</span>
                    )}
                </button>
                <Link href="/?auth=register" className="text-xs font-bold text-uav-blue hover:underline">
                    Hoặc tạo tài khoản đặt lịch trực tiếp →
                </Link>
            </div>
        </form>
    );
}
