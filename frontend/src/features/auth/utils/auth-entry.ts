export type AuthEntryMode = 'login' | 'register';

/**
 * Sign-in and registration open as a dialog on the home page; portal entry routes redirect here.
 * `next` is the in-app path to land on afterwards (kept verbatim, as the landing page reads it).
 */
export function authEntryUrl(mode: AuthEntryMode, next?: string): string {
    return next ? `/?auth=${mode}&next=${next}` : `/?auth=${mode}`;
}
