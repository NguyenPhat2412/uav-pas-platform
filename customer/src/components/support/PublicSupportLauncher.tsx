'use client';

import {MessageCircleMore, X} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {SupportWidgetMode} from '@/types/support/support.types';

export interface PublicSupportLauncherProps {
    mode?: SupportWidgetMode;
    open: boolean;
    unreadCount: number;
    threadCode?: string | null;
    zaloPhone?: string | null;
    onToggle: () => void;
    onOpen: () => void;
}

/**
 * Single compact bottom-right support launcher for public marketing pages.
 * Keeps screen footprint minimal (one circular button, zero stacked circles or blocking callout bubbles).
 */
export function PublicSupportLauncher({
    open,
    unreadCount,
    threadCode,
    onToggle,
}: PublicSupportLauncherProps) {
    const hasUnread = unreadCount > 0;
    const title = open
        ? 'Đóng khung hỗ trợ'
        : threadCode
          ? `Phiên ${threadCode} · Mở hỗ trợ trực tuyến`
          : 'Hỗ trợ trực tuyến';

    return (
        <div className="fixed right-4 bottom-5 z-40 sm:right-5">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                aria-label={open ? 'Đóng khung hỗ trợ trực tuyến UAV PAS' : 'Mở khung hỗ trợ trực tuyến UAV PAS'}
                title={title}
                className={cn(
                    'relative inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-2 shadow-lg transition-[transform,background-color,border-color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-95',
                    open
                        ? 'border-primary bg-white text-primary hover:bg-slate-50'
                        : 'border-primary bg-primary text-primary-foreground hover:bg-primary-hover',
                )}
            >
                {open ? (
                    <X className="h-5 w-5" aria-hidden="true"/>
                ) : (
                    <MessageCircleMore className="h-5 w-5" aria-hidden="true"/>
                )}
                {hasUnread && (
                    <span
                        aria-label={`${unreadCount} tin nhắn mới`}
                        className="pointer-events-none absolute -top-1.5 -left-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 text-[11px] font-extrabold text-white ring-2 ring-white"
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>
        </div>
    );
}
