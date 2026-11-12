import {clearTokens, readTokens, writeTokens} from '@/lib/storage/secure-tokens';
import type {SessionEndReason, SessionStore, TokenPair} from '@/lib/api/core';

// Tokens are read from the Keychain once at start-up and kept in memory, so every request reads them synchronously.
let tokens: TokenPair | null = null;
const listeners = new Set<(reason: SessionEndReason) => void>();

export const sessionStore: SessionStore = {
    read: () => tokens,
    save: async next => {
        tokens = next;
        await writeTokens(next);
    },
    clear: async reason => {
        const hadSession = tokens !== null;
        tokens = null;
        await clearTokens();
        if (hadSession) listeners.forEach(listener => listener(reason));
    },
};

/** Loads the Keychain tokens; true when a session may still be alive (the backend decides with /auth/me). */
export async function restoreSession(): Promise<boolean> {
    tokens = await readTokens();
    return tokens !== null;
}

/** Called when the backend refuses the session (or the user signs out), so the app returns to sign-in. */
export function onSessionEnded(listener: (reason: SessionEndReason) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
