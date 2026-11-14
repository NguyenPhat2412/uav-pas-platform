import {dehydrate, hydrate, type DehydratedState, type Query, type QueryClient} from '@tanstack/react-query';
import {readSavedQueryCache, saveQueryCache} from '@/lib/storage/preferences';

// Cached screens open instantly on the next launch; private or fast-moving data (chat, money, permissions) is never written.
const SKIP_FEATURES = new Set(['support', 'admin-support', 'billing', 'invoices', 'payments', 'permissions', 'assistant']);
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const SAVE_DELAY_MS = 2000;

/** Only this user's session-scoped, successful queries outside the skip list. */
export function shouldPersistQuery(query: Pick<Query, 'queryKey' | 'state'>, userId: number): boolean {
    const [scope, owner, feature] = query.queryKey as unknown[];
    return scope === 'session' && owner === userId && typeof feature === 'string'
        && !SKIP_FEATURES.has(feature) && query.state.status === 'success';
}

export async function restoreQueryCache(client: QueryClient, userId: number): Promise<void> {
    try {
        const raw = await readSavedQueryCache(userId);
        if (!raw) return;
        const saved = JSON.parse(raw) as { savedAt: number; state: DehydratedState };
        if (Date.now() - saved.savedAt > MAX_AGE_MS) {
            await saveQueryCache(userId, null);
            return;
        }
        // hydrate never replaces data that is newer than the saved copy.
        hydrate(client, saved.state);
    } catch {
        // A broken cache only costs a network fetch.
    }
}

/** Saves the cache a moment after it changes; returns the unsubscribe. */
export function persistQueryCache(client: QueryClient, userId: number): () => void {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const save = () => {
        timer = null;
        const state = dehydrate(client, {shouldDehydrateQuery: query => shouldPersistQuery(query, userId)});
        void saveQueryCache(userId, JSON.stringify({savedAt: Date.now(), state}));
    };
    const unsubscribe = client.getQueryCache().subscribe(event => {
        if (event.type !== 'updated' || timer) return;
        timer = setTimeout(save, SAVE_DELAY_MS);
    });
    return () => {
        if (timer) clearTimeout(timer);
        unsubscribe();
    };
}

export async function clearQueryCache(userId: number | null): Promise<void> {
    if (userId == null) return;
    await saveQueryCache(userId, null);
}
