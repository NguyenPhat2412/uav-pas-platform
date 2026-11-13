'use client';

import {useEffect, useState} from 'react';
import Image from 'next/image';
import {MessageCircleMore, X} from 'lucide-react';
import {cn} from '@/lib/utils';
import {ZaloBrandIcon} from '@/components/support/ZaloBrandIcon';
import type {SupportWidgetMode} from '@/types/support/support.types';
import {formatPhoneDisplay, toZaloChatUrl} from '@/utils/support/contact-format';

export interface PublicSupportLauncherProps {
    mode?: SupportWidgetMode;
    open: boolean;
    unreadCount: number;
    threadCode?: string | null;
    zaloPhone?: string | null;
    onToggle: () => void;
    onOpen: () => void;
}

const CALLOUT_VISIBLE_MS = 4_500;
const CALLOUT_HIDDEN_MS = 10_000;

/**
 * Floating bottom-right support launcher stack:
 * - Public marketing pages (`mode="public"`): docked at `bottom-5 right-5` with direct Zalo button + auto-fading callout.
 * - Signed-in Customer Portal (`mode="portal"`): docked at `bottom-24 right-5` cleanly above `AssistantWidget` (`bottom-5 right-5`).
 */
export function PublicSupportLauncher({
    mode = 'public',
    open,
    unreadCount,
    threadCode,
    zaloPhone,
    onToggle,
    onOpen,
}: PublicSupportLauncherProps) {
    const isPortal = mode === 'portal';
    const hasUnread = unreadCount > 0;
    const [autoShowCallout, setAutoShowCallout] = useState(true);
    const [hovered, setHovered] = useState(false);
    const [zaloHovered, setZaloHovered] = useState(false);

    useEffect(() => {
        if (isPortal || open || hasUnread) return;

        const timer = window.setTimeout(
            () => setAutoShowCallout((prev) => !prev),
            autoShowCallout ? CALLOUT_VISIBLE_MS : CALLOUT_HIDDEN_MS,
        );

        return () => window.clearTimeout(timer);
    }, [autoShowCallout, hasUnread, isPortal, open]);

    const showCallout = !open && (hasUnread || hovered || (!isPortal && autoShowCallout));
    const zaloUrl = !isPortal ? toZaloChatUrl(zaloPhone) : null;
    const zaloDisplay = formatPhoneDisplay(zaloPhone);

    const calloutText = hasUnread
        ? `Quản trị viên vừa phản hồi (${unreadCount}) · Xem ngay`
        : threadCode
          ? `Phiên ${threadCode} · Mở trò chuyện trực tuyến`
          : 'Hỗ trợ trực tuyến · Nhắn Admin ngay';

    return (
        <div
            className={cn(
                'fixed right-5 z-50 flex flex-col items-end gap-3',
                isPortal ? 'bottom-24' : 'bottom-5',
            )}
        >
            {!open && zaloUrl && (
                <div
                    className="flex items-center gap-2.5 pr-1"
                    onMouseEnter={() => setZaloHovered(true)}
                    onMouseLeave={() => setZaloHovered(false)}
                >
                    <a
                        href={zaloUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        tabIndex={zaloHovered ? 0 : -1}
                        aria-hidden={!zaloHovered}
                        className={cn(
                            'hidden sm:inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-md backdrop-blur-xs transition-all duration-300 ease-out hover:border-primary/40 hover:text-primary',
                            zaloHovered
                                ? 'pointer-events-auto translate-x-0 scale-100 opacity-100'
                                : 'pointer-events-none translate-x-2 scale-95 opacity-0',
                        )}
                    >
                        <span>Chat Zalo · {zaloDisplay}</span>
                    </a>

                    <div className="relative flex items-center justify-center">
                        <a
                            href={zaloUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onFocus={() => setZaloHovered(true)}
                            onBlur={() => setZaloHovered(false)}
                            aria-label={`Liên hệ Zalo ${zaloDisplay}`}
                            title={`Chat Zalo · ${zaloDisplay}`}
                            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-lg ring-1 ring-slate-900/5 transition-all duration-200 hover:scale-105 hover:border-primary/50 hover:text-primary active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        >
                            <ZaloBrandIcon className="h-6 w-6" />
                        </a>
                    </div>
                </div>
            )}

            <div
                className="flex items-center gap-3"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                <button
                    type="button"
                    onClick={onOpen}
                    tabIndex={showCallout ? 0 : -1}
                    aria-hidden={!showCallout}
                    className={cn(
                        'hidden sm:inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold shadow-lg backdrop-blur-xs transition-all duration-500 ease-out',
                        showCallout
                            ? 'pointer-events-auto translate-x-0 scale-100 opacity-100 hover:-translate-y-0.5'
                            : 'pointer-events-none translate-x-3 scale-95 opacity-0',
                        hasUnread
                            ? 'border-primary/40 bg-primary text-primary-foreground shadow-primary/25'
                            : 'border-slate-200/90 bg-white/95 text-slate-800 hover:border-primary/40 hover:text-primary',
                    )}
                >
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span
                            aria-hidden="true"
                            className={cn(
                                'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping motion-reduce:animate-none',
                                hasUnread ? 'bg-white' : 'bg-sky-400',
                            )}
                        />
                        <span
                            aria-hidden="true"
                            className={cn(
                                'relative inline-flex h-2.5 w-2.5 rounded-full',
                                hasUnread ? 'bg-white' : 'bg-uav-blue',
                            )}
                        />
                    </span>
                    <MessageCircleMore className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{calloutText}</span>
                </button>

                <div className="relative flex items-center justify-center">
                    {!open && (
                        <>
                            <span
                                aria-hidden="true"
                                className="pointer-events-none absolute -inset-2.5 rounded-full bg-primary/15 blur-[1px] animate-pulse motion-reduce:animate-none"
                            />
                            <span
                                aria-hidden="true"
                                className="pointer-events-none absolute -inset-1 rounded-full bg-primary/35 animate-ping motion-reduce:animate-none"
                            />
                        </>
                    )}

                    <button
                        type="button"
                        onClick={onToggle}
                        onFocus={() => setHovered(true)}
                        onBlur={() => setHovered(false)}
                        aria-expanded={open}
                        aria-label={
                            open
                                ? 'Đóng khung hỗ trợ trực tuyến UAV PAS'
                                : 'Mở khung hỗ trợ trực tuyến UAV PAS'
                        }
                        title={open ? 'Đóng khung hỗ trợ' : 'Hỗ trợ trực tuyến · Nhắn Admin ngay'}
                        className={cn(
                            'relative inline-flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 bg-white shadow-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                            open
                                ? 'border-primary ring-2 ring-primary/20 hover:bg-slate-50'
                                : 'border-primary/40 ring-2 ring-primary/15 hover:scale-105 hover:border-primary active:scale-95',
                        )}
                    >
                        {open ? (
                            <X className="h-6 w-6 text-primary" aria-hidden="true" />
                        ) : (
                            <Image
                                src="/uav-pas-logo.svg"
                                alt="Biểu trưng UAV PAS"
                                width={40}
                                height={40}
                                className="h-10 w-10 rounded-full object-contain"
                            />
                        )}

                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute right-0 bottom-0 flex h-4 w-4 items-center justify-center rounded-full bg-white p-0.5 shadow-xs ring-1 ring-slate-200"
                        >
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75 animate-ping motion-reduce:animate-none" />
                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-uav-blue" />
                            </span>
                        </span>

                        {hasUnread && (
                            <span
                                aria-label={`${unreadCount} tin nhắn mới từ Quản trị viên`}
                                className="pointer-events-none absolute -top-1.5 -left-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-extrabold text-white shadow-md ring-2 ring-white animate-bounce motion-reduce:animate-none"
                            >
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
