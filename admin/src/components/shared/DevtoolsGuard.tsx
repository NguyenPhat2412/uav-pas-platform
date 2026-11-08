'use client';

import {useEffect} from 'react';

/**
 * Production-only deterrent: swallows the keyboard shortcuts that open the browser's developer tools or the page
 * source (F12, Ctrl+Shift+I/J/C/K, Ctrl+U and their macOS ⌘⌥ forms). It is NOT a security boundary — the tools stay
 * reachable from the browser menu, and anything the page receives can be read with any HTTP client — so data is
 * protected on the server (authorisation, rate limits, page-size caps). The context menu is left alone (copy, open
 * link in a new tab) and there is no `debugger` trap, which would freeze legitimate users' browsers.
 * Turn it off with NEXT_PUBLIC_DEVTOOLS_GUARD=off.
 */
const enabled = process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_DEVTOOLS_GUARD !== 'off';

export function isDevtoolsShortcut(event: Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>): boolean {
    if (event.key === 'F12' || event.code === 'F12') return true;
    const letter = event.code?.startsWith('Key') ? event.code.slice(3) : event.key?.toUpperCase();
    // Windows/Linux: Ctrl+Shift+I (tools), J (console), C (inspect), K (Firefox console); Ctrl+U (view source).
    if (event.ctrlKey && event.shiftKey && ['I', 'J', 'C', 'K'].includes(letter)) return true;
    if (event.ctrlKey && !event.shiftKey && !event.altKey && letter === 'U') return true;
    // macOS: ⌘⌥I / ⌘⌥J / ⌘⌥C (tools), ⌘⌥U (view source), ⌘⇧C (inspect in Chrome).
    if (event.metaKey && event.altKey && ['I', 'J', 'C', 'U'].includes(letter)) return true;
    return event.metaKey && event.shiftKey && letter === 'C';
}

export function DevtoolsGuard() {
    useEffect(() => {
        if (!enabled) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (!isDevtoolsShortcut(event)) return;
            event.preventDefault();
            event.stopPropagation();
        };
        // Capture phase, so page handlers cannot re-enable the shortcut by handling it first.
        window.addEventListener('keydown', onKeyDown, {capture: true});
        return () => window.removeEventListener('keydown', onKeyDown, {capture: true});
    }, []);
    return null;
}
