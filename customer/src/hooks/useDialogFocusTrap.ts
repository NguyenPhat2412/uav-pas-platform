'use client';

import {type RefObject, useEffect} from 'react';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not(:disabled)',
    'input:not(:disabled):not([type="hidden"])',
    'select:not(:disabled)',
    'textarea:not(:disabled)',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
    if (!container) return [];
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        el => el.getClientRects().length > 0 && el.getAttribute('aria-hidden') !== 'true',
    );
}

/**
 * Accessible modal dialog controller:
 * - Locks body background scrolling while open
 * - Moves initial focus inside the dialog if focus is outside
 * - Traps Tab / Shift+Tab focus strictly within the dialog
 * - Closes on Escape and restores focus to the trigger element on cleanup
 */
export function useDialogFocusTrap(
    dialogRef: RefObject<HTMLElement | null>,
    open: boolean,
    onClose?: () => void,
) {
    useEffect(() => {
        if (!open) return;

        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const focusFrame = requestAnimationFrame(() => {
            const root = dialogRef.current;
            if (!root) return;
            if (root.contains(document.activeElement)) return;
            const preferred = root.querySelector<HTMLElement>('[data-autofocus="true"], [autofocus]');
            const focusable = getFocusableElements(root);
            (preferred ?? focusable[0] ?? root).focus();
        });

        const handleKeyDown = (event: KeyboardEvent) => {
            const root = dialogRef.current;
            if (!root) return;

            if (event.key === 'Escape') {
                if (onClose) {
                    event.preventDefault();
                    event.stopPropagation();
                    onClose();
                }
                return;
            }

            if (event.key !== 'Tab') return;
            const items = getFocusableElements(root);
            if (items.length === 0) {
                event.preventDefault();
                root.focus();
                return;
            }

            const first = items[0];
            const last = items[items.length - 1];
            const active = document.activeElement;

            if (event.shiftKey) {
                if (active === first || !root.contains(active)) {
                    event.preventDefault();
                    last.focus();
                }
            } else if (active === last || !root.contains(active)) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown, true);

        return () => {
            cancelAnimationFrame(focusFrame);
            document.removeEventListener('keydown', handleKeyDown, true);
            document.body.style.overflow = previousOverflow;
            requestAnimationFrame(() => {
                if (previousFocus && document.contains(previousFocus)) {
                    previousFocus.focus();
                }
            });
        };
    }, [dialogRef, onClose, open]);
}
