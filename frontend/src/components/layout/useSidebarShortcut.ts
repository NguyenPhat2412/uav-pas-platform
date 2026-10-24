'use client';

import {useEffect, useRef, useState} from 'react';

/** True while focus sits somewhere that uses Ctrl/⌘+B for its own purpose (bold in editors, typing). */
function isEditable(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * Ctrl+B (⌘B on macOS) toggles the sidebar rail. Returns the label to show in the toggle's tooltip.
 * The latest toggle is read through a ref, so callers may pass a fresh closure every render.
 */
export function useSidebarShortcut(toggle: () => void): string {
    const latest = useRef(toggle);
    const [label, setLabel] = useState('Ctrl+B');

    useEffect(() => {
        latest.current = toggle;
    });

    useEffect(() => {
        const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
        // Platform is only known in the browser; the server render keeps the generic label.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (mac) setLabel('⌘B');
        const onKey = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() !== 'b' || event.altKey || event.shiftKey) return;
            if (!(mac ? event.metaKey : event.ctrlKey)) return;
            if (event.defaultPrevented || isEditable(event.target)) return;
            event.preventDefault();
            latest.current();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return label;
}
