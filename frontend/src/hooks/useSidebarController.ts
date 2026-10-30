'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {useSidebarShortcut} from '@/hooks/useSidebarShortcut';

/**
 * Custom hook dùng chung cho cả 3 cổng (Admin, Operations, Customer) để quản lý:
 * - Trạng thái mở/đóng ngăn kéo (drawer) trên thiết bị di động (`open`, `setOpen`)
 * - Trạng thái thu gọn/mở rộng thanh Sidebar trên màn hình lớn (`collapsed`, `railCollapsed`, `toggleCollapsed`)
 * - Phím tắt bàn phím (`shortcut`) để đóng/mở nhanh Sidebar
 * - Bẫy tiêu điểm bàn phím (Focus Trap `Tab` / `Shift+Tab`), phím `Escape`, và tự động đóng drawer khi mở rộng màn hình.
 */
export function useSidebarController(storageKey = 'uav_sidebar_collapsed') {
    const [open, setOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const menuButton = useRef<HTMLButtonElement>(null);
    const rail = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!open) return;
        const trigger = menuButton.current;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        rail.current?.querySelector<HTMLButtonElement>('.rail-close')?.focus();
        const close = () => {
            setOpen(false);
            menuButton.current?.focus();
        };
        const keydown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') close();
            if (event.key !== 'Tab') return;
            const items = [
                ...(rail.current?.querySelectorAll<HTMLElement>('a,button:not(:disabled)') ?? []),
            ].filter(el => el.getClientRects().length);
            const first = items[0];
            const last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
            }
        };
        const desktop = window.matchMedia('(min-width: 901px)');
        const resize = () => {
            if (desktop.matches) setOpen(false);
        };
        desktop.addEventListener('change', resize);
        document.addEventListener('keydown', keydown);
        return () => {
            document.body.style.overflow = previousOverflow;
            requestAnimationFrame(() => trigger?.focus());
            document.removeEventListener('keydown', keydown);
            desktop.removeEventListener('change', resize);
        };
    }, [open]);

    useEffect(() => {
        try {
            const isParamCollapsed =
                typeof window !== 'undefined' && window.location.search.includes('collapsed=true');
            const saved = localStorage.getItem(storageKey);
            if (isParamCollapsed) {
                setCollapsed(true);
            } else if (saved !== null) {
                setCollapsed(saved === 'true');
            }
        } catch {
            // ignore storage errors
        }
    }, [storageKey]);

    const toggleCollapsed = () => {
        setCollapsed(prev => {
            const next = !prev;
            try {
                localStorage.setItem(storageKey, String(next));
            } catch {
                // ignore storage errors
            }
            return next;
        });
    };

    const shortcut = useSidebarShortcut(toggleCollapsed);
    const railCollapsed = collapsed && !open;

    // Admin and operations pages each mount their own shell, so the nav list would jump back to the
    // top on every click. Keep its scroll offset for the tab and restore it when the next page mounts.
    const navList = useCallback((node: HTMLElement | null) => {
        if (!node) return;
        // Admin and operations share the collapse key, so the portal segment keeps their offsets apart.
        const navScrollKey = `${storageKey}_nav_scroll_${window.location.pathname.split('/')[1]}`;
        try {
            const saved = Number(sessionStorage.getItem(navScrollKey));
            if (saved > 0) node.scrollTop = saved;
        } catch {
            // ignore storage errors
        }
        node.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({block: 'nearest'});
        node.addEventListener('scroll', () => {
            try {
                sessionStorage.setItem(navScrollKey, String(node.scrollTop));
            } catch {
                // ignore storage errors
            }
        }, {passive: true});
    }, [storageKey]);

    return {
        open,
        setOpen,
        collapsed,
        railCollapsed,
        toggleCollapsed,
        shortcut,
        menuButton,
        rail,
        navList,
    };
}
