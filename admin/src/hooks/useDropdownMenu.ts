'use client';

import {useEffect, useRef, useState} from 'react';

/**
 * Custom hook dùng chung cho các Menu tài khoản / Popover cảnh báo:
 * - Tự động đóng khi click ra ngoài (`pointerdown` outside)
 * - Tự động đóng và trả lại focus về nút bấm khi nhấn phím `Escape`
 * - Hỗ trợ điều hướng lên/xuống bằng phím `ArrowDown` / `ArrowUp` giữa các `[role=menuitem]`
 */
export function useDropdownMenu(options?: { arrowNavigation?: boolean }) {
    const arrowNavigation = options?.arrowNavigation ?? true;
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;
        const items = () => [...(root.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])];
        if (arrowNavigation) {
            items()[0]?.focus();
        }
        const outside = (event: PointerEvent) => {
            if (!root.current?.contains(event.target as Node)) setOpen(false);
        };
        const keydown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
                trigger.current?.focus();
                return;
            }
            if (!arrowNavigation || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return;
            event.preventDefault();
            const list = items();
            if (!list.length) return;
            const index = list.indexOf(document.activeElement as HTMLElement);
            list[(index + (event.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length]?.focus();
        };
        document.addEventListener('pointerdown', outside);
        document.addEventListener('keydown', keydown);
        return () => {
            document.removeEventListener('pointerdown', outside);
            document.removeEventListener('keydown', keydown);
        };
    }, [open, arrowNavigation]);

    const close = () => setOpen(false);

    return {open, setOpen, close, root, trigger};
}
