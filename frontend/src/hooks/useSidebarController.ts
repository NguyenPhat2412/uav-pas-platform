'use client';

import {useCallback, useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {useBrowserStorage, writeBrowserStorage} from '@/hooks/useBrowserStorage';

/** The URL does not change under a mounted shell, so its read needs no subscription. */
const noSubscribe = () => () => {};
import {useSidebarShortcut} from '@/hooks/useSidebarShortcut';

/**
 * Custom hook dùng chung cho cả 3 cổng (Admin, Operations, Customer) để quản lý:
 * - Trạng thái mở/đóng ngăn kéo (drawer) trên thiết bị di động (`open`, `setOpen`)
 * - Trạng thái thu gọn/mở rộng thanh Sidebar trên màn hình lớn (`collapsed`, `railCollapsed`, `toggleCollapsed`)
 * - Phím tắt bàn phím (`shortcut`, Ctrl+B) để đóng/mở nhanh Sidebar
 * - Rê chuột vào thanh đang thu gọn thì nó tạm mở rộng nổi trên nội dung (`peeking`, `peekProps`) để đọc tên mục
 * - Bẫy tiêu điểm bàn phím (Focus Trap `Tab` / `Shift+Tab`), phím `Escape`, và tự động đóng drawer khi mở rộng màn hình.
 */
export function useSidebarController(storageKey = 'uav_sidebar_collapsed') {
    const [open, setOpen] = useState(false);
    // Stored choice (null until hydrated) and this visit's choice when storage refuses the write.
    const savedCollapsed = useBrowserStorage(storageKey);
    const [collapsedChoice, setCollapsedChoice] = useState<boolean | null>(null);
    const collapsedByUrl = useSyncExternalStore(noSubscribe, () => window.location.search.includes('collapsed=true'), () => false);
    const collapsed = collapsedChoice ?? (collapsedByUrl || savedCollapsed === 'true');
    const [peek, setPeek] = useState(false);
    const peekTimer = useRef<number | undefined>(undefined);
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


    const toggleCollapsed = () => {
        window.clearTimeout(peekTimer.current);
        setPeek(false);
        const next = !collapsed;
        setCollapsedChoice(next);
        writeBrowserStorage(storageKey, String(next));
    };

    const shortcut = useSidebarShortcut(toggleCollapsed);
    // While peeking the rail shows full labels but floats over the page (the shell keeps a 60px spacer).
    const peeking = collapsed && peek && !open;
    const railCollapsed = collapsed && !open && !peek;
    const peekProps = {
        onMouseEnter: () => {
            if (!collapsed || !window.matchMedia('(min-width: 1024px)').matches) return;
            window.clearTimeout(peekTimer.current);
            // A short delay so a pointer merely crossing the rail does not flash it open.
            peekTimer.current = window.setTimeout(() => setPeek(true), 120);
        },
        onMouseLeave: () => {
            window.clearTimeout(peekTimer.current);
            setPeek(false);
        },
    };
    useEffect(() => () => window.clearTimeout(peekTimer.current), []);

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
        peeking,
        peekProps,
        toggleCollapsed,
        shortcut,
        menuButton,
        rail,
        navList,
    };
}
