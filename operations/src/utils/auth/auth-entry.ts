import type {AuthEntryMode} from '@/types/auth/auth.types';

export type {AuthEntryMode};

/**
 * Sign-in and registration open as a dialog on the home page; portal entry routes redirect here.
 * `next` is the in-app path to land on afterwards. Slashes stay readable; `&`, `?` and `#` are escaped so a
 * path with its own query survives the trip.
 */
export function authEntryUrl(mode: AuthEntryMode, next?: string): string {
    return next ? `/?auth=${mode}&next=${encodeURIComponent(next).replaceAll('%2F', '/')}` : `/?auth=${mode}`;
}

/**
 * The `next` path to open after sign-in, or null when it would leave the site. Browsers read `\` as `/` and drop
 * tabs and newlines, so `/\evil.com` means `//evil.com`; resolving against a placeholder origin catches all of these.
 */
export function safeNextPath(next: string | null | undefined): string | null {
    if (!next || !next.startsWith('/')) return null;
    try {
        const base = 'http://app.invalid';
        const url = new URL(next, base);
        return url.origin === base ? url.pathname + url.search + url.hash : null;
    } catch {
        return null;
    }
}

/**
 * The sign-in entry for a portal page the visitor reached while signed out: it returns them to that very page
 * (path, query and hash) after sign-in, or to `fallback` when the current location is not a safe in-app path.
 * Read in effects only: the query comes from `window.location` so callers need no `useSearchParams` Suspense boundary.
 */
export function loginEntryForPage(pathname: string | null | undefined, fallback: string): string {
    const location = typeof window === 'undefined' ? undefined : window.location;
    const here = pathname ? `${pathname}${location?.search ?? ''}${location?.hash ?? ''}` : null;
    return authEntryUrl('login', safeNextPath(here) ?? fallback);
}
