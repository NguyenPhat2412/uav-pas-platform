import type {AuthEntryMode, Portal} from '@/types/auth/auth.types';

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

function portalOrigin(portal: Portal): string | null {
    const envOrigin = typeof process === 'undefined'
        ? undefined
        : portal === 'admin'
            ? process.env.NEXT_PUBLIC_ADMIN_URL
            : portal === 'operations'
                ? process.env.NEXT_PUBLIC_OPERATIONS_URL
                : process.env.NEXT_PUBLIC_CUSTOMER_URL;
    if (envOrigin) return envOrigin.replace(/\/$/, '');
    if (typeof window === 'undefined') return null;
    const {protocol, hostname, port} = window.location;
    if (port === '3100' || port === '3200' || port === '3300') {
        const targetPort = portal === 'admin' ? '3300' : portal === 'operations' ? '3200' : '3100';
        return `${protocol}//${hostname}:${targetPort}`;
    }
    return null;
}

export function resolvePortalHref(path: string): string {
    const target: Portal | null = path.startsWith('/admin')
        ? 'admin'
        : path.startsWith('/operations')
            ? 'operations'
            : path.startsWith('/customer')
                ? 'customer'
                : null;
    if (!target) return path;
    const origin = portalOrigin(target);
    if (!origin || (typeof window !== 'undefined' && origin === window.location.origin)) return path;
    return `${origin}${path}`;
}

export function navigatePortalPath(path: string, push: (href: string) => void): void {
    const href = resolvePortalHref(path);
    if (href.startsWith('http://') || href.startsWith('https://')) {
        window.location.assign(href);
        return;
    }
    push(href);
}
