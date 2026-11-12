'use client';

import Image from 'next/image';
import {ExternalLink, Headset, Mail, MapPin, MessageCircleMore, PhoneCall} from 'lucide-react';
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
            className="border-t border-b border-border bg-white py-16 sm:py-20"
        >
            <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12">
                <HomeLandingSectionHead
                    id="home-contact-title"
                    eyebrow="Liên hệ & Hỗ trợ trực tuyến"
                    jp="お問い合わせ"
                    title="Kết nối trực tiếp với đội ngũ quản trị và điều phối."
                    text="Trao đổi trực tiếp cùng Quản trị viên qua khung trò chuyện góc phải màn hình, nhắn nhanh qua Zalo hoặc gửi yêu cầu tư vấn khảo sát GIS, gói cước và cấp quyền tài khoản ngay bên dưới."
                />

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                    {/* Left Column (5 cols): Live Chat Card + Dynamic Contact Channels */}
                    <div className="flex flex-col justify-between gap-5 lg:col-span-5">
                        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-6 text-white shadow-lg">
                            <div className="relative z-10 space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-emerald-300">
                                        <span className="relative flex h-2 w-2">
                                            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping motion-reduce:animate-none" />
                                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                                        </span>
                                        Quản trị viên trực tuyến
                                    </span>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white p-1 ring-2 ring-primary/40">
                                        <Image
                                            src="/uav-pas-logo.svg"
                                            alt=""
                                            width={32}
                                            height={32}
                                            className="h-8 w-8 object-contain"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <h3 className="text-lg font-extrabold tracking-tight text-white sm:text-xl">
                                        Trò chuyện trực tiếp cùng Admin
                                    </h3>
                                    <p className="text-xs leading-relaxed text-slate-300">
                                        Cần hỏi nhanh về khu vực khảo sát, vùng hạn chế bay (NFZ), gói cước vận hành hoặc cấp quyền tài khoản? Mở khung chat trực tuyến hoặc nhắn Zalo để trao đổi hai chiều cùng Quản trị viên.
                                    </p>
                                </div>

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
                                            className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition-colors hover:border-rose-300/60 hover:bg-white/20 hover:text-white"
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>

                                <div className={zaloUrl ? 'grid grid-cols-1 gap-2.5 sm:grid-cols-2' : 'block'}>
                                    <button
                                        type="button"
                                        onClick={() => openPublicSupportWidget()}
                                        className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-3.5 text-xs font-bold text-primary-foreground shadow-md transition-colors hover:bg-primary-hover"
                                    >
                                        <MessageCircleMore className="h-4 w-4 shrink-0" aria-hidden="true" />
                                        <span>Nhắn Admin ngay</span>
                                    </button>

                                    {zaloUrl && (
                                        <a
                                            href={zaloUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#0068FF] px-3.5 text-xs font-bold text-white shadow-md transition-colors hover:bg-[#0058db]"
                                        >
                                            <ZaloBrandIcon className="h-4 w-4 shrink-0" />
                                            <span>Zalo · {zaloDisplay}</span>
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        {hasDirectChannels && (
                            <div className="space-y-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                                <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-900">
                                    <Headset className="h-4 w-4 text-primary" aria-hidden="true" />
                                    Kênh liên hệ điều phối trực tiếp
                                </p>

                                <div className="space-y-3 text-xs">
                                    {zaloUrl && (
                                        <a
                                            href={zaloUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-between gap-3 rounded-xl border border-[#0068FF]/25 bg-white p-3 transition-colors hover:border-[#0068FF]/60 hover:bg-sky-50/40"
                                        >
                                            <span className="flex min-w-0 items-start gap-3">
                                                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0068FF] text-white">
                                                    <ZaloBrandIcon className="h-5 w-5" />
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block text-[11px] font-semibold text-slate-500">
                                                        Zalo hỗ trợ &amp; tư vấn trực tuyến
                                                    </span>
                                                    <span className="mt-0.5 block text-sm font-extrabold tabular-nums text-slate-900">
                                                        {zaloDisplay}
                                                    </span>
                                                </span>
                                            </span>
                                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#0068FF]/10 px-2.5 py-1 text-[11px] font-bold text-[#0068FF]">
                                                Nhắn Zalo
                                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                            </span>
                                        </a>
                                    )}

                                    {hotlineTel && hotlineDisplay && (
                                        <a
                                            href={hotlineTel}
                                            className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-3 transition-colors hover:border-primary/40"
                                        >
                                            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-primary">
                                                <PhoneCall className="h-4 w-4" aria-hidden="true" />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-[11px] font-semibold text-slate-500">
                                                    Đường dây điều phối nhiệm vụ
                                                </span>
                                                <span className="mt-0.5 block text-sm font-extrabold tabular-nums text-slate-900">
                                                    {hotlineDisplay}
                                                </span>
                                            </span>
                                        </a>
                                    )}

                                    {email && (
                                        <a
                                            href={`mailto:${email}`}
                                            className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-3 transition-colors hover:border-primary/40"
                                        >
                                            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-primary">
                                                <Mail className="h-4 w-4" aria-hidden="true" />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-[11px] font-semibold text-slate-500">
                                                    Email hỗ trợ &amp; tư vấn kỹ thuật
                                                </span>
                                                <span className="mt-0.5 block truncate text-sm font-extrabold text-slate-900">
                                                    {email}
                                                </span>
                                            </span>
                                        </a>
                                    )}

                                    {address && (
                                        <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-3">
                                            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-primary">
                                                <MapPin className="h-4 w-4" aria-hidden="true" />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-[11px] font-semibold text-slate-500">
                                                    Địa chỉ trung tâm điều hành
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

                    {/* Right Column (7 cols): Direct Support & Inquiry Form */}
                    <div className="flex flex-col justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 lg:col-span-7">
                        <div className="mb-5 space-y-1.5 border-b border-slate-100 pb-4">
                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary">
                                Gửi yêu cầu trực tiếp tới Admin
                            </span>
                            <h3 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                                Để lại thông tin tư vấn &amp; hỗ trợ nhiệm vụ
                            </h3>
                            <p className="text-xs leading-relaxed text-slate-500">
                                Ngay sau khi gửi, hệ thống tự động cấp mã phiên hỗ trợ <strong className="font-semibold text-slate-700">SUP-...</strong> và đồng bộ trực tiếp với biểu tượng chat ở góc dưới bên phải màn hình.
                            </p>
                        </div>

                        <ContactQuickForm />
                    </div>
                </div>
            </div>
        </section>
    );
}
