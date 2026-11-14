'use client';

import Image from 'next/image';
import {Clock3, ExternalLink, Headset, Mail, MapPin, MessageCircleMore, PhoneCall, ShieldCheck} from 'lucide-react';
import {HomeLandingSectionHead} from '@/components/marketing/HomeLandingSectionHead';
import {ContactQuickForm} from '@/components/marketing/ContactQuickForm';
import {ZaloBrandIcon} from '@/components/support/ZaloBrandIcon';
import {openPublicSupportWidget, usePublicSiteInfo} from '@/hooks/support/usePublicSupport';
import {formatPhoneDisplay, toTelHref, toZaloChatUrl} from '@/utils/support/contact-format';

const QUICK_ADMIN_PROMPTS = [
    {
        label: 'Khảo sát GIS 2D/3D',
        topic: 'SURVEY_SERVICE',
        prompt: 'Tôi cần tư vấn dịch vụ bay khảo sát lập bản đồ GIS 2D/3D cho khu vực dự án.',
    },
    {
        label: 'Báo giá gói cước',
        topic: 'PRICING_PLAN',
        prompt: 'Tôi muốn nhận tư vấn chi tiết và báo giá các gói cước Basic / Pro / Enterprise.',
    },
    {
        label: 'Xin phép bay & NFZ',
        topic: 'FLIGHT_PERMIT_NFZ',
        prompt: 'Tôi cần hỗ trợ kiểm tra vùng hạn chế bay (NFZ) và thủ tục cấp phép bay.',
    },
] as const;

export function HomeLandingContactSection() {
    const siteInfo = usePublicSiteInfo();

    const zaloUrl = toZaloChatUrl(siteInfo.zaloPhone);
    const zaloDisplay = formatPhoneDisplay(siteInfo.zaloPhone);
    const hotlineDisplay = formatPhoneDisplay(siteInfo.dispatchHotline);
    const hotlineTel = toTelHref(siteInfo.dispatchHotline);
    const email = siteInfo.email ?? '';
    const address = siteInfo.address ?? '';
    const hasDirectChannels = Boolean(zaloUrl || hotlineTel || email || address);

    return (
        <section
            id="contact-support"
            aria-labelledby="home-contact-title"
            className="border-t border-b border-border bg-background py-16 sm:py-20"
        >
            <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12">
                <HomeLandingSectionHead
                    id="home-contact-title"
                    eyebrow="Tư vấn & Điều phối trực tuyến"
                    jp="お問い合わせ"
                    title="Kết nối trực tiếp với chuyên viên giải pháp GIS và đội điều phối bay."
                    text="Trao đổi trực tiếp cùng chuyên viên qua khung chat thời gian thực, liên hệ nhanh qua Hotline/Zalo điều phối hoặc điền thông tin khu vực khảo sát để nhận phương án bay chi tiết."
                />

                <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12 lg:gap-8">
                    {/* Left Column (5 cols): Specialist Consultation Card + Unified Direct Channels */}
                    <div className="flex flex-col justify-between gap-5 lg:col-span-5">
                        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
                            {/* Specialist Portrait Header */}
                            <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
                                <Image
                                    src="/images/contact/uav-consultant-desk.jpg"
                                    alt="Chuyên viên tư vấn giải pháp GIS và điều phối bay UAV PAS tại bàn trực"
                                    fill
                                    sizes="(max-width: 1024px) 100vw, 42vw"
                                    className="object-cover object-top"
                                />
                                <div
                                    className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent"
                                    aria-hidden="true"
                                />

                                <div className="absolute top-3.5 left-3.5 flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/95 px-3 py-1 text-[11px] font-bold text-slate-900 shadow-sm backdrop-blur-xs">
                                        <span className="relative flex h-2 w-2">
                                            <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping motion-reduce:animate-none" />
                                            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                                        </span>
                                        Chuyên viên trực tuyến
                                    </span>
                                </div>

                                <div className="absolute right-4 bottom-3.5 left-4 text-white">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-rose-200">
                                        Ban Tư vấn Giải pháp &amp; Điều phối Nhiệm vụ
                                    </p>
                                    <h3 className="mt-0.5 text-base font-extrabold tracking-tight text-white sm:text-lg">
                                        Hỗ trợ thẩm định vùng bay &amp; cấu hình cảm biến
                                    </h3>
                                </div>
                            </div>

                            {/* Unified Card Body */}
                            <div className="space-y-4 p-5">
                                <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-[11px] text-slate-600">
                                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                                        <Clock3 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                                        Phản hồi trong ~5 phút
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                                        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                                        Hỗ trợ kiểm tra NFZ
                                    </span>
                                </div>

                                <div className="space-y-1.5">
                                    <span className="block text-[11px] font-bold text-slate-500">
                                        Bắt đầu nhanh với câu hỏi mẫu:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {QUICK_ADMIN_PROMPTS.map((item) => (
                                            <button
                                                key={item.topic}
                                                type="button"
                                                onClick={() =>
                                                    openPublicSupportWidget({
                                                        topic: item.topic,
                                                        prompt: item.prompt,
                                                    })
                                                }
                                                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-colors hover:border-primary/40 hover:bg-uav-red-light hover:text-primary"
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className={zaloUrl ? 'grid grid-cols-1 gap-2.5 sm:grid-cols-2' : 'block'}>
                                    <button
                                        type="button"
                                        onClick={() => openPublicSupportWidget()}
                                        className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-control bg-primary px-3.5 text-xs font-bold text-primary-foreground shadow-xs transition-colors hover:bg-primary-hover"
                                    >
                                        <MessageCircleMore className="h-4 w-4 shrink-0" aria-hidden="true" />
                                        <span>Chat trực tuyến ngay</span>
                                    </button>

                                    {zaloUrl && (
                                        <a
                                            href={zaloUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-control border border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-800 transition-colors hover:border-primary/50 hover:bg-slate-50 hover:text-primary"
                                        >
                                            <ZaloBrandIcon className="h-4 w-4 shrink-0" />
                                            <span>Zalo · {zaloDisplay}</span>
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        {hasDirectChannels && (
                            <div className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-xs">
                                <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-900">
                                    <Headset className="h-4 w-4 text-primary" aria-hidden="true" />
                                    Kênh liên hệ điều phối trực tiếp
                                </p>

                                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 text-xs">
                                    {hotlineTel && hotlineDisplay && (
                                        <a
                                            href={hotlineTel}
                                            className="group flex items-start gap-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 p-3 transition-colors hover:border-primary/40 hover:bg-white"
                                        >
                                            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 ring-1 ring-slate-200/90 transition-colors group-hover:bg-primary group-hover:text-white group-hover:ring-primary">
                                                <PhoneCall className="h-4 w-4" aria-hidden="true" />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-[11px] font-semibold text-slate-500">
                                                    Hotline điều phối
                                                </span>
                                                <span className="mt-0.5 block truncate text-xs font-extrabold tabular-nums text-slate-900">
                                                    {hotlineDisplay}
                                                </span>
                                            </span>
                                        </a>
                                    )}

                                    {zaloUrl && (
                                        <a
                                            href={zaloUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group flex items-start justify-between gap-2 rounded-xl border border-slate-200/90 bg-slate-50/50 p-3 transition-colors hover:border-primary/40 hover:bg-white"
                                        >
                                            <span className="flex min-w-0 items-start gap-2.5">
                                                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 ring-1 ring-slate-200/90 transition-colors group-hover:bg-primary group-hover:text-white group-hover:ring-primary">
                                                    <ZaloBrandIcon className="h-4 w-4" />
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block text-[11px] font-semibold text-slate-500">
                                                        Zalo tư vấn nhanh
                                                    </span>
                                                    <span className="mt-0.5 block truncate text-xs font-extrabold tabular-nums text-slate-900">
                                                        {zaloDisplay}
                                                    </span>
                                                </span>
                                            </span>
                                            <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-400 transition-colors group-hover:text-primary" aria-hidden="true" />
                                        </a>
                                    )}

                                    {email && (
                                        <a
                                            href={`mailto:${email}`}
                                            className="group flex items-start gap-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 p-3 transition-colors hover:border-primary/40 hover:bg-white sm:col-span-2"
                                        >
                                            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 ring-1 ring-slate-200/90 transition-colors group-hover:bg-primary group-hover:text-white group-hover:ring-primary">
                                                <Mail className="h-4 w-4" aria-hidden="true" />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-[11px] font-semibold text-slate-500">
                                                    Email hỗ trợ &amp; hồ sơ kỹ thuật
                                                </span>
                                                <span className="mt-0.5 block truncate text-xs font-extrabold text-slate-900">
                                                    {email}
                                                </span>
                                            </span>
                                        </a>
                                    )}

                                    {address && (
                                        <div className="flex items-start gap-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 p-3 sm:col-span-2">
                                            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 ring-1 ring-slate-200/90">
                                                <MapPin className="h-4 w-4" aria-hidden="true" />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-[11px] font-semibold text-slate-500">
                                                    Trung tâm điều hành
                                                </span>
                                                <span className="mt-0.5 block text-xs font-bold leading-relaxed text-slate-800">
                                                    {address}
                                                </span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column (7 cols): Interactive Consultation & Mission Brief Form */}
                    <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8 lg:col-span-7">
                        <div className="mb-5 space-y-1.5 border-b border-slate-100 pb-4">
                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary">
                                Phiếu đăng ký tư vấn &amp; thẩm định nhiệm vụ
                            </span>
                            <h3 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                                Gửi thông tin dự án để nhận phương án bay phù hợp
                            </h3>
                            <p className="text-xs leading-relaxed text-slate-500">
                                Chọn nhu cầu bên dưới và để lại thông tin liên hệ — chuyên viên UAV PAS sẽ kiểm tra vùng bay, gợi ý tổ hợp cảm biến và phản hồi trực tiếp qua phiên hỗ trợ của bạn.
                            </p>
                        </div>

                        <ContactQuickForm />
                    </div>
                </div>
            </div>
        </section>
    );
}
