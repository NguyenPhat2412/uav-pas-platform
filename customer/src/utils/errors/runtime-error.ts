/**
 * Helpers for the portal and mobile error screens: telling a stale-build chunk failure, transport/offline drop,
 * maintenance outage (502/503/504), rate-limit (429), auth/permission refusal (401/403/404) and ordinary runtime bugs
 * apart, plus a short, stable reference code users can quote to support.
 */
export interface RuntimeErrorLike {
    name?: string;
    message?: string;
    stack?: string;
    digest?: string;
    status?: number;
    code?: string;
}

export type ExceptionKind =
    | 'stale_build'
    | 'offline'
    | 'server_unreachable'
    | 'maintenance'
    | 'rate_limited'
    | 'forbidden'
    | 'not_found'
    | 'unauthorized'
    | 'runtime';

/** A JS chunk of the previous deployment could not be loaded: a reload fetches the new build and fixes it. */
export function isChunkLoadError(error: RuntimeErrorLike | null | undefined): boolean {
    if (!error) return false;
    return error.name === 'ChunkLoadError'
        || /Loading (CSS )?chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i
            .test(error.message ?? '');
}

/** Classifies an exception into a user-actionable status category shared across Web (3 portals) and Mobile. */
export function classifyRuntimeException(
    error: RuntimeErrorLike | null | undefined,
    navigatorOnline = true,
): ExceptionKind {
    if (!navigatorOnline) return 'offline';
    if (!error) return 'runtime';
    if (isChunkLoadError(error)) return 'stale_build';

    const status = typeof error.status === 'number' ? error.status : undefined;
    const code = (error.code ?? '').toUpperCase();
    const message = error.message ?? '';

    if (
        status === 0
        || code === 'NETWORK_ERROR'
        || error.name === 'NetworkError'
        || /^(Failed to fetch|NetworkError when attempting to fetch resource|Load failed|Network request failed)/i.test(message)
    ) {
        return 'server_unreachable';
    }
    if (status === 502 || status === 503 || status === 504 || code === 'SERVICE_UNAVAILABLE' || code === 'MAINTENANCE_MODE') {
        return 'maintenance';
    }
    if (status === 429 || code === 'RATE_LIMITED' || code === 'TOO_MANY_REQUESTS') {
        return 'rate_limited';
    }
    if (status === 403 || code === 'FORBIDDEN' || code === 'ACCESS_DENIED') {
        return 'forbidden';
    }
    if (status === 404 || code === 'NOT_FOUND' || code === 'RESOURCE_NOT_FOUND') {
        return 'not_found';
    }
    if (status === 401 || code === 'SESSION_EXPIRED' || code === 'UNAUTHORIZED') {
        return 'unauthorized';
    }
    return 'runtime';
}

/**
 * Next.js gives server errors a digest; client errors get an FNV-1a hash of name, message and the first stack frame,
 * as 6 base-36 characters (e.g. "K3F9QZ"). It identifies the kind of failure without revealing its text.
 */
export function errorReference(error: RuntimeErrorLike | null | undefined): string {
    if (error?.digest) return error.digest.slice(0, 10).toUpperCase();
    const firstFrame = (error?.stack ?? '').split('\n').find(line => line.trim().startsWith('at ')) ?? '';
    const text = `${error?.name ?? ''}|${error?.message ?? ''}|${firstFrame.trim()}`;
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(36).toUpperCase().padStart(6, '0').slice(-6);
}

/** One automatic reload per stale build: a second chunk failure within this window shows the screen instead. */
export const CHUNK_RELOAD_WINDOW_MS = 30_000;

export function shouldAutoReload(lastReloadAt: number | null, now: number): boolean {
    return lastReloadAt == null || now - lastReloadAt > CHUNK_RELOAD_WINDOW_MS;
}
