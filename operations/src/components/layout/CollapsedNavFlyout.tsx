'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {
    useEffect,
    useRef,
    useState,
    type FocusEvent,
    type MouseEvent,
    type ReactNode,
} from 'react';
import {createPortal} from 'react-dom';
import type {LucideIcon} from 'lucide-react';
import {cn} from '@/lib/utils';

export interface CollapsedFlyoutItem {
    href: string;
    label: string;
    active: boolean;
    accessibleLabel?: string;
    badge?: ReactNode;
}

interface ActiveFlyoutState {
    id: string;
    label: string;
    items?: CollapsedFlyoutItem[];
    top: number;
    left: number;
    pathname: string;
}

export interface CollapsedNavFlyoutController {
    activeFlyoutId: string | null;
    flyout: ActiveFlyoutState | null;
    openFlyout: (id: string, label: string, el: HTMLElement, items?: CollapsedFlyoutItem[]) => void;
    keepFlyout: () => void;
    hideFlyout: () => void;
    closeFlyoutNow: () => void;
    tooltipTriggerProps: (id: string, label: string) => {
        onMouseEnter?: (e: MouseEvent<HTMLElement>) => void;
        onFocus?: (e: FocusEvent<HTMLElement>) => void;
        onMouseLeave?: () => void;
        onBlur?: () => void;
    };
}

/**
 * Quản lý popover nổi bên phải thanh Sidebar khi thu gọn (`railCollapsed`):
 * - Hover / focus vào icon nhóm mở thẻ trắng nổi hiển thị tiêu đề nhóm in hoa và danh sách mục con
 * - Giữ cầu nối vô hình + độ trễ đóng ngắn (150ms) để di chuột từ icon sang danh sách mượt mà
 * - Tự động ẩn khi chuyển trang, cuộn thanh điều hướng, đổi kích thước cửa sổ hoặc nhấn `Escape`.
 */
export function useCollapsedNavFlyout(railCollapsed: boolean): CollapsedNavFlyoutController {
    const pathname = usePathname();
    const [rawFlyout, setRawFlyout] = useState<ActiveFlyoutState | null>(null);
    const closeTimer = useRef<number | undefined>(undefined);

    const flyout = railCollapsed && rawFlyout && rawFlyout.pathname === pathname ? rawFlyout : null;
    const isFlyoutOpen = flyout !== null;

    const keepFlyout = () => {
        window.clearTimeout(closeTimer.current);
    };

    const hideFlyout = () => {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = window.setTimeout(() => setRawFlyout(null), 150);
    };

    const closeFlyoutNow = () => {
        window.clearTimeout(closeTimer.current);
        setRawFlyout(null);
    };

    const openFlyout = (id: string, label: string, el: HTMLElement, items?: CollapsedFlyoutItem[]) => {
        if (!railCollapsed) return;
        window.clearTimeout(closeTimer.current);
        const rect = el.getBoundingClientRect();
        const asideRight = el.closest('aside')?.getBoundingClientRect().right ?? rect.right;
        const left = asideRight + 8;
        if (items && items.length > 0) {
            const estimatedHeight = 46 + items.length * 36;
            const top = Math.max(8, Math.min(rect.top - 4, window.innerHeight - estimatedHeight - 12));
            setRawFlyout({id, label, items, top, left, pathname});
        } else {
            setRawFlyout({id, label, top: rect.top + rect.height / 2, left, pathname});
        }
    };

    useEffect(() => () => window.clearTimeout(closeTimer.current), []);

    useEffect(() => {
        if (!isFlyoutOpen) return;
        const dismiss = () => {
            window.clearTimeout(closeTimer.current);
            setRawFlyout(null);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') dismiss();
        };
        window.addEventListener('resize', dismiss);
        window.addEventListener('scroll', dismiss, true);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('resize', dismiss);
            window.removeEventListener('scroll', dismiss, true);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isFlyoutOpen]);

    const tooltipTriggerProps = (id: string, label: string) =>
        railCollapsed
            ? {
                  onMouseEnter: (e: MouseEvent<HTMLElement>) => openFlyout(id, label, e.currentTarget),
                  onFocus: (e: FocusEvent<HTMLElement>) => openFlyout(id, label, e.currentTarget),
                  onMouseLeave: hideFlyout,
                  onBlur: hideFlyout,
              }
            : {};

    return {
        activeFlyoutId: flyout?.id ?? null,
        flyout,
        openFlyout,
        keepFlyout,
        hideFlyout,
        closeFlyoutNow,
        tooltipTriggerProps,
    };
}

export function CollapsedNavGroupTrigger({
    id,
    label,
    icon: Icon,
    active,
    items,
    badge,
    controller,
    onNavigate,
}: {
    id: string;
    label: string;
    icon: LucideIcon;
    active: boolean;
    items: CollapsedFlyoutItem[];
    badge?: ReactNode;
    controller: CollapsedNavFlyoutController;
    onNavigate?: () => void;
}) {
    const targetHref = items.find(item => item.active)?.href ?? items[0]?.href ?? '#';
    const isHovered = controller.activeFlyoutId === id;

    return (
        <Link
            href={targetHref}
            aria-label={label}
            aria-current={active ? 'true' : undefined}
            onClick={() => {
                controller.closeFlyoutNow();
                onNavigate?.();
            }}
            onMouseEnter={e => controller.openFlyout(id, label, e.currentTarget, items)}
            onFocus={e => controller.openFlyout(id, label, e.currentTarget, items)}
            onMouseLeave={controller.hideFlyout}
            onBlur={controller.hideFlyout}
            className={cn(
                'relative mx-auto flex h-10 w-10 items-center justify-center rounded-xl transition-colors outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#ab2523]',
                active
                    ? 'bg-[#ab2523]/10 text-[#ab2523] shadow-2xs'
                    : isHovered
                        ? 'bg-slate-100 text-[#ab2523]'
                        : 'text-[#ab2523] hover:bg-slate-100 hover:text-[#8f1c1a]',
            )}
        >
            <Icon size={18} className="shrink-0 text-[#ab2523]" aria-hidden="true"/>
            {badge}
        </Link>
    );
}

export function CollapsedNavFlyoutPortal({
    controller,
    onNavigate,
}: {
    controller: CollapsedNavFlyoutController;
    onNavigate?: () => void;
}) {
    const {flyout, keepFlyout, hideFlyout, closeFlyoutNow} = controller;
    if (!flyout || typeof document === 'undefined') return null;

    if (!flyout.items || flyout.items.length === 0) {
        return createPortal(
            <div
                role="tooltip"
                style={{top: flyout.top, left: flyout.left}}
                className="pointer-events-none fixed z-[80] -translate-y-1/2 whitespace-nowrap rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-[0_10px_24px_-6px_rgba(15,23,42,0.14)]"
            >
                {flyout.label}
            </div>,
            document.body,
        );
    }

    return createPortal(
        <div
            role="region"
            aria-label={flyout.label}
            data-sidebar-flyout={flyout.id}
            style={{top: flyout.top, left: flyout.left}}
            onMouseEnter={keepFlyout}
            onMouseLeave={hideFlyout}
            onFocus={keepFlyout}
            onBlur={hideFlyout}
            className="fixed z-[80] min-w-[212px] max-w-[272px] rounded-2xl border border-slate-200/90 bg-white p-2.5 text-slate-800 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.14),0_4px_12px_-4px_rgba(15,23,42,0.06)]"
        >
            {/* Cầu nối vô hình phủ khoảng hở giữa thanh icon thu gọn và thẻ popover để chuột đi qua không bị ngắt */}
            <span aria-hidden="true" className="absolute inset-y-0 -left-5 w-5"/>
            <p className="px-2.5 pb-1.5 pt-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
                {flyout.label}
            </p>
            <ul className="m-0 max-h-[calc(100dvh-4rem)] list-none space-y-0.5 overflow-y-auto p-0">
                {flyout.items.map(item => (
                    <li key={item.href}>
                        <Link
                            href={item.href}
                            aria-current={item.active ? 'page' : undefined}
                            aria-label={item.accessibleLabel ?? item.label}
                            onClick={() => {
                                closeFlyoutNow();
                                onNavigate?.();
                            }}
                            className={cn(
                                'group/flyout-item flex items-center justify-between gap-2.5 rounded-xl px-2.5 py-1.5 text-[13.5px] leading-5 transition-colors outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#ab2523]',
                                item.active
                                    ? 'bg-[#ab2523]/10 font-semibold text-[#ab2523]'
                                    : 'font-normal text-slate-700 hover:bg-slate-100 hover:text-slate-900',
                            )}
                        >
                            <span className="flex min-w-0 items-center gap-2.5">
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        'h-1.5 w-1.5 shrink-0 rounded-full transition-colors',
                                        item.active ? 'bg-[#ab2523]' : 'bg-slate-400 group-hover/flyout-item:bg-slate-600',
                                    )}
                                />
                                <span className="truncate">{item.label}</span>
                            </span>
                            {item.badge}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>,
        document.body,
    );
}
