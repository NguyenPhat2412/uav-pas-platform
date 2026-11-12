/**
 * Helpers for the portal error screens: telling a stale-build chunk failure apart from a real bug, and a short,
 * stable reference code users can quote to support (the same error always gives the same code).
 */
export interface RuntimeErrorLike {
    name?: string;
    message?: string;
    stack?: string;
    digest?: string;
}

/** A JS chunk of the previous deployment could not be loaded: a reload fetches the new build and fixes it. */
export function isChunkLoadError(error: RuntimeErrorLike | null | undefined): boolean {
    if (!error) return false;
    return error.name === 'ChunkLoadError'
        || /Loading (CSS )?chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i
            .test(error.message ?? '');
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
