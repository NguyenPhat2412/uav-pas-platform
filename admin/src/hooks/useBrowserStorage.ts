'use client';

import {useSyncExternalStore} from 'react';

/** Fired after this tab writes through writeBrowserStorage; other tabs are covered by the native storage event. */
const LOCAL_CHANGE = 'uav:local-storage';

function subscribe(onChange: () => void) {
    window.addEventListener('storage', onChange);
    window.addEventListener(LOCAL_CHANGE, onChange);
    return () => {
        window.removeEventListener('storage', onChange);
        window.removeEventListener(LOCAL_CHANGE, onChange);
    };
}

/** The stored string, or null when absent or when storage is unavailable (private mode, blocked site data). */
export function readBrowserStorage(key: string): string | null {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

/**
 * One localStorage entry as a string, read the way React expects browser-only values to be read: the server render
 * and hydration see null (so markup matches), the browser then shows the stored value, and the component re-renders
 * when this tab or another one changes it. Parse the string with useMemo; the raw string keeps the snapshot stable.
 */
export function useBrowserStorage(key: string): string | null {
    return useSyncExternalStore(subscribe, () => readBrowserStorage(key), () => null);
}

/**
 * Writes (or removes, for null) an entry and notifies useBrowserStorage readers in this tab. Returns false when
 * storage refused the write, so callers can keep the choice in memory for this visit instead.
 */
export function writeBrowserStorage(key: string, value: string | null): boolean {
    let stored = true;
    try {
        if (value === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, value);
    } catch {
        stored = false;
    }
    window.dispatchEvent(new Event(LOCAL_CHANGE));
    return stored;
}
