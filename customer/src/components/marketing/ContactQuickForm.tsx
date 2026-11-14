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
    CONTACT_SCOPE_TAGS,
    CONTACT_TOPIC_OPTIONS,
    ContactTopicPicker,
} from '@/components/marketing/ContactTopicPicker';
import {
    getSupportErrorMessage,
    openPublicSupportWidget,
    saveStoredSupportToken,
    useCreatePublicSupportThread,
} from '@/hooks/support/usePublicSupport';
import type {PublicSupportThreadSession} from '@/types/support/support.types';

const inputCls =
    'w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-primary focus:bg-white focus:outline-none';

export function ContactQuickForm() {
    const [draft, setDraft] = useState(emptyContactInquiryDraft);
    const [submittedSession, setSubmittedSession] = useState<PublicSupportThreadSession | null>(null);
    const createThread = useCreatePublicSupportThread();

    const fieldErrors = createThread.error ? contactFieldErrors(createThread.error) : null;
    const errorMessage = createThread.error ? getSupportErrorMessage(createThread.error) : null;

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!canSubmitContactInquiry(draft) || createThread.isPending) return;
        const selectedTopic = CONTACT_TOPIC_OPTIONS.find((item) => item.value === draft.topic);
        const payload = toContactInquiryPayload(draft, selectedTopic?.fallback);

        createThread.mutate(
            {
                fullName: payload.fullName,
                organization: payload.organization,
                contactInfo: payload.contactInfo,
                topic: payload.topic,
                source: 'CONTACT_FORM',
                message: payload.message,
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
            <div className="space-y-4 rounded-2xl border border-rose-200 bg-uav-red-light/60 p-6">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-primary">
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            Đã chuyển tới Chuyên viên điều phối
                        </span>
                        <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-extrabold text-slate-900">
                            Mã phiên: {submittedSession.code}
                        </span>
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900">
                        Cảm ơn {submittedSession.fullName}! Yêu cầu tư vấn của bạn đã được tiếp nhận.
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-600">
                        Phiên trao đổi <strong className="font-bold text-slate-900">{submittedSession.code}</strong> đã được kết nối trực tiếp với biểu tượng hỗ trợ ở góc dưới bên phải màn hình. Bạn có thể mở khung chat để nhận phản hồi thời gian thực hoặc khởi tạo nhiệm vụ trên bản đồ GIS.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                        type="button"
                        onClick={() => openPublicSupportWidget()}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-control bg-primary px-4 text-xs font-bold text-primary-foreground shadow-xs transition-colors hover:bg-primary-hover"
                    >
                        <MessageCircleMore className="h-4 w-4" aria-hidden="true" />
                        <span>Mở khung chat trực tuyến →</span>
                    </button>
                    <Link
                        href="/customer/missions/create"
                        className="inline-flex h-10 items-center justify-center rounded-control border border-slate-200 bg-white px-4 text-xs font-bold text-slate-800 transition-colors hover:border-primary hover:text-primary"
                    >
                        Khởi tạo nhiệm vụ trên GIS →
                    </Link>
                    <button
                        type="button"
                        onClick={() => {
                            createThread.reset();
                            setSubmittedSession(null);
                            setDraft((prev) => ({...prev, scopeTag: '', message: ''}));
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
            <ContactTopicPicker
                selectedTopic={draft.topic}
                onSelectTopic={(topic) => setDraft((prev) => ({...prev, topic}))}
            />

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
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
                    <label htmlFor="contact-info" className="mb-1 block text-xs font-bold text-slate-700">
                        Số điện thoại / Email <span className="text-primary">*</span>
                    </label>
                    <input
                        id="contact-info"
                        type="text"
                        aria-required
                        value={draft.contactInfo}
                        onChange={(e) => setDraft((prev) => ({...prev, contactInfo: e.target.value}))}
                        placeholder="09xx... / email@congty.vn"
                        className={inputCls}
                    />
                    {fieldErrors?.contactInfo && (
                        <p className="mt-1 text-[11px] font-medium text-rose-700">{fieldErrors.contactInfo}</p>
                    )}
                </div>
                <div>
                    <label htmlFor="contact-org" className="mb-1 block text-xs font-bold text-slate-700">
                        Đơn vị / Dự án
                    </label>
                    <input
                        id="contact-org"
                        type="text"
                        value={draft.organization}
                        onChange={(e) => setDraft((prev) => ({...prev, organization: e.target.value}))}
                        placeholder="Tên doanh nghiệp / Ban QLDA"
                        className={inputCls}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor="contact-message" className="text-xs font-bold text-slate-700">
                        2. Khu vực dự kiến bay &amp; yêu cầu kỹ thuật
                    </label>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quy mô dự kiến">
                        {CONTACT_SCOPE_TAGS.map((tag) => {
                            const selected = draft.scopeTag === tag;
                            return (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() =>
                                        setDraft((prev) => ({
                                            ...prev,
                                            scopeTag: prev.scopeTag === tag ? '' : tag,
                                        }))
                                    }
                                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                                        selected
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                                    }`}
                                >
                                    {tag}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <textarea
                    id="contact-message"
                    rows={3}
                    value={draft.message}
                    onChange={(e) => setDraft((prev) => ({...prev, message: e.target.value}))}
                    placeholder="Ví dụ: Khảo sát địa hình 2D/3D khu công nghiệp tại Bắc Ninh, yêu cầu GSD ≤ 2 cm/px và bàn giao bình đồ GeoTIFF..."
                    className={inputCls}
                />
            </div>

            {errorMessage && (
                <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-800">
                    {errorMessage}
                </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="submit"
                        disabled={!canSubmitContactInquiry(draft) || createThread.isPending}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-primary px-5 text-xs font-bold text-primary-foreground shadow-xs transition-colors hover:bg-primary-hover disabled:opacity-50"
                    >
                        {createThread.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                <span>Đang kết nối chuyên viên...</span>
                            </>
                        ) : (
                            <span>Gửi yêu cầu tư vấn →</span>
                        )}
                    </button>
                    <span className="text-[11px] text-slate-500">
                        Cấp mã phiên <strong className="font-semibold text-slate-700">SUP-...</strong> &amp; đồng bộ chat trực tuyến
                    </span>
                </div>
                <Link href="/?auth=register" className="text-xs font-bold text-slate-700 transition-colors hover:text-primary hover:underline">
                    Tự tạo tài khoản đặt lịch →
                </Link>
            </div>
        </form>
    );
}
