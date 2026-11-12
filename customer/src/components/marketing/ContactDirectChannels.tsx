'use client';

import {ExternalLink, Mail, MessageCircleMore, PhoneCall} from 'lucide-react';
import {ZaloBrandIcon} from '@/components/support/ZaloBrandIcon';
import {openPublicSupportWidget, usePublicSiteInfo} from '@/hooks/support/usePublicSupport';
import {formatPhoneDisplay, toTelHref, toZaloChatUrl} from '@/utils/support/contact-format';

/**
 * Dynamic public contact channels block for the /contact command desk,
 * reading live Zalo, Hotline, and Email settings from PostgreSQL.
 */
export function ContactDirectChannels() {
    const siteInfo = usePublicSiteInfo();

    const zaloUrl = toZaloChatUrl(siteInfo.zaloPhone);
    const zaloDisplay = formatPhoneDisplay(siteInfo.zaloPhone);
    const hotlineDisplay = formatPhoneDisplay(siteInfo.dispatchHotline);
    const hotlineTel = toTelHref(siteInfo.dispatchHotline);
    const email = siteInfo.email ?? '';

    return (
        <div className="space-y-3 border-t border-white/15 pt-5 text-xs">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Kênh liên hệ nhanh
            </span>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {zaloUrl && (
                    <a
                        href={zaloUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-2 rounded-xl border border-[#0068FF]/45 bg-[#0068FF]/20 px-3 py-2.5 text-white transition-colors hover:bg-[#0068FF]/35"
                    >
                        <span className="flex min-w-0 items-center gap-2">
                            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0068FF] text-white">
                                <ZaloBrandIcon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0">
                                <span className="block text-[10px] font-semibold text-sky-200">Zalo trực tuyến</span>
                                <span className="block truncate text-xs font-extrabold tabular-nums">{zaloDisplay}</span>
                            </span>
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-sky-200" aria-hidden="true" />
                    </a>
                )}

                <button
                    type="button"
                    onClick={() => openPublicSupportWidget()}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-left text-white transition-colors hover:border-rose-300/60 hover:bg-white/20"
                >
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
                        <MessageCircleMore className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                        <span className="block text-[10px] font-semibold text-rose-200">Chat trực tiếp</span>
                        <span className="block truncate text-xs font-extrabold">Nhắn Admin ngay</span>
                    </span>
                </button>

                {hotlineTel && hotlineDisplay && (
                    <a
                        href={hotlineTel}
                        className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-white transition-colors hover:bg-white/20"
                    >
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15 text-rose-300">
                            <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                            <span className="block text-[10px] font-semibold text-slate-300">Hotline điều phối</span>
                            <span className="block truncate text-xs font-extrabold tabular-nums">{hotlineDisplay}</span>
                        </span>
                    </a>
                )}

                {email && (
                    <a
                        href={`mailto:${email}`}
                        className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-white transition-colors hover:bg-white/20"
                    >
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15 text-rose-300">
                            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                            <span className="block text-[10px] font-semibold text-slate-300">Email hỗ trợ</span>
                            <span className="block truncate text-xs font-extrabold">{email}</span>
                        </span>
                    </a>
                )}
            </div>
        </div>
    );
}
