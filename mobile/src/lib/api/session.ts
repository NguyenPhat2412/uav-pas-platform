import {clearTokens, readTokens, writeTokens} from '@/lib/storage/secure-tokens';
import type {SessionEndReason, SessionStore, TokenPair} from '@/lib/api/core';

// Tokens are read from the Keychain once at start-up and kept in memory, so every request reads them synchronously.
let tokens: TokenPair | null = null;
const listeners = new Set<(reason: SessionEndReason) => void>();
const tokenListeners = new Set<(accessToken: string | null) => void>();

export const sessionStore: SessionStore = {
    read: () => tokens,
    save: async next => {
        tokens = next;
        await writeTokens(next);
        tokenListeners.forEach(listener => listener(next.accessToken));
    },
    clear: async reason => {
        const hadSession = tokens !== null;
        tokens = null;
        await clearTokens();
        tokenListeners.forEach(listener => listener(null));
        if (hadSession) listeners.forEach(listener => listener(reason));
    },
};

/** Loads the Keychain tokens; true when a session may still be alive (the backend decides with /auth/me). */
export async function restoreSession(): Promise<boolean> {
    tokens = await readTokens();
    tokenListeners.forEach(listener => listener(tokens?.accessToken ?? null));
    return tokens !== null;
}

/** Called when the backend refuses the session (or the user signs out), so the app returns to sign-in. */
export function onSessionEnded(listener: (reason: SessionEndReason) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** Notifies realtime sockets whenever the in-memory JWT is restored, refreshed, or cleared. */
export function onSessionTokenChanged(listener: (accessToken: string | null) => void): () => void {
    tokenListeners.add(listener);
    return () => tokenListeners.delete(listener);
}
