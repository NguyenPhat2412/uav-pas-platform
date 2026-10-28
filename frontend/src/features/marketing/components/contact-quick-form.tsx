'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';

export function ContactQuickForm() {
    const [fullName, setFullName] = useState('');
    const [organization, setOrganization] = useState('');
    const [contactInfo, setContactInfo] = useState('');
    const [topic, setTopic] = useState('SURVEY_SERVICE');
    const [message, setMessage] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!fullName.trim() || !contactInfo.trim()) return;
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div className="rounded-2xl border border-rose-200 bg-uav-red-light/50 p-6 space-y-4">
                <div className="space-y-1.5">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
                        Đã ghi nhận thông tin
                    </p>
                    <h3 className="text-lg font-extrabold text-slate-900">
                        Cảm ơn {fullName}! Yêu cầu tư vấn của bạn đã được tiếp nhận.
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-600">
                        Để khởi tạo ngay vùng bay khảo sát trên bản đồ GIS và nhận báo giá tự động theo gói cước, bạn có thể đăng nhập trực tiếp vào Cổng Khách hàng bên dưới.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Link
                        href="/customer/missions/create"
                        className="inline-flex h-9 items-center justify-center rounded-control bg-primary px-4 text-xs font-bold text-primary-foreground hover:bg-primary-hover transition-colors"
                    >
                        Khởi tạo nhiệm vụ trên GIS ngay →
                    </Link>
                    <button
                        type="button"
                        onClick={() => {
                            setSubmitted(false);
                            setMessage('');
                        }}
                        className="text-xs font-semibold text-slate-600 hover:text-primary underline"
                    >
                        Gửi yêu cầu khác
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label htmlFor="contact-fullname" className="block text-xs font-bold text-slate-700 mb-1">
                        Họ và tên <span className="text-primary">*</span>
                    </label>
                    <input
                        id="contact-fullname"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none"
                    />
                </div>
                <div>
                    <label htmlFor="contact-org" className="block text-xs font-bold text-slate-700 mb-1">
                        Đơn vị / Doanh nghiệp
                    </label>
                    <input
                        id="contact-org"
                        type="text"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        placeholder="Công ty / Ban quản lý dự án..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label htmlFor="contact-info" className="block text-xs font-bold text-slate-700 mb-1">
                        Email hoặc Số điện thoại <span className="text-primary">*</span>
                    </label>
                    <input
                        id="contact-info"
                        type="text"
                        required
                        value={contactInfo}
                        onChange={(e) => setContactInfo(e.target.value)}
                        placeholder="email@doanhnghiep.vn / 09xx..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none"
                    />
                </div>
                <div>
                    <label htmlFor="contact-topic" className="block text-xs font-bold text-slate-700 mb-1">
                        Nội dung quan tâm
                    </label>
                    <select
                        id="contact-topic"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-primary focus:bg-white focus:outline-none"
                    >
                        <option value="SURVEY_SERVICE">Đặt dịch vụ bay khảo sát GIS / Quay chụp</option>
                        <option value="PRICING_PLAN">Tư vấn gói cước Basic / Pro / Enterprise</option>
                        <option value="SAR_AI_RND">Hợp tác R&D: Edge AI Kria KV260 & Buồng lái SAR</option>
                        <option value="TRAINING_SOP">Đào tạo an toàn bay & Học viện SOP UAV</option>
                    </select>
                </div>
            </div>

            <div>
                <label htmlFor="contact-message" className="block text-xs font-bold text-slate-700 mb-1">
                    Mô tả ngắn khu vực bay hoặc nhu cầu kỹ thuật
                </label>
                <textarea
                    id="contact-message"
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ví dụ: Khảo sát bình đồ 2D/3D khu công nghiệp 120 ha tại Bắc Ninh, yêu cầu GSD 2 cm/px..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none"
                />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button
                    type="submit"
                    className="inline-flex h-10 items-center justify-center rounded-control bg-primary px-5 text-xs font-bold text-primary-foreground hover:bg-primary-hover transition-colors shadow-xs"
                >
                    Gửi yêu cầu tư vấn →
                </button>
                <Link href="/?auth=register" className="text-xs font-bold text-uav-blue hover:underline">
                    Hoặc tạo tài khoản đặt lịch trực tiếp →
                </Link>
            </div>
        </form>
    );
}
