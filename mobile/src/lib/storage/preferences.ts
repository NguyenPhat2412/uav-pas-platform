import AsyncStorage from '@react-native-async-storage/async-storage';

/** Non-secret UI preferences only (language, text size, workspace portal, push registration identifier). */
const LOCALE_KEY = 'uav_locale';

export async function readSavedLocale(): Promise<string | null> {
    try {
        return await AsyncStorage.getItem(LOCALE_KEY);
    } catch {
        return null;
    }
}

export async function saveLocale(locale: string): Promise<void> {
    try {
        await AsyncStorage.setItem(LOCALE_KEY, locale);
    } catch {
        // The choice still applies for this session.
    }
}

const TEXT_SIZE_KEY = 'uav_text_size';

export async function readSavedTextSize(): Promise<string | null> {
    try {
        return await AsyncStorage.getItem(TEXT_SIZE_KEY);
    } catch {
        return null;
    }
}

export async function saveTextSize(size: string): Promise<void> {
    try {
        await AsyncStorage.setItem(TEXT_SIZE_KEY, size);
    } catch {
        // The choice still applies for this session.
    }
}

export type PortalPreference = 'customer' | 'operations';

const PORTAL_KEY = 'uav_portal';

export async function readSavedPortal(): Promise<PortalPreference | null> {
    try {
        const raw = await AsyncStorage.getItem(PORTAL_KEY);
        return raw === 'customer' || raw === 'operations' ? raw : null;
    } catch {
        return null;
    }
}

export async function savePortal(portal: PortalPreference): Promise<void> {
    try {
        await AsyncStorage.setItem(PORTAL_KEY, portal);
    } catch {
        // The choice still applies for this session.
    }
}

const PUSH_ENDPOINT_KEY = 'uav_push_endpoint';

export async function readSavedPushEndpoint(): Promise<string | null> {
    try {
        const raw = await AsyncStorage.getItem(PUSH_ENDPOINT_KEY);
        return raw && raw.trim() ? raw.trim() : null;
    } catch {
        return null;
    }
}

export async function savePushEndpoint(endpoint: string | null): Promise<void> {
    try {
        const cleaned = endpoint?.trim() ?? '';
        if (cleaned) {
            await AsyncStorage.setItem(PUSH_ENDPOINT_KEY, cleaned);
        } else {
            await AsyncStorage.removeItem(PUSH_ENDPOINT_KEY);
        }
    } catch {
        // Best-effort local persistence.
    }
}

const QUERY_CACHE_PREFIX = 'uav-pas:query-cache:';

/** The saved React Query snapshot for one user (see lib/storage/query-cache.ts). */
export async function readSavedQueryCache(userId: number): Promise<string | null> {
    try {
        return await AsyncStorage.getItem(QUERY_CACHE_PREFIX + userId);
    } catch {
        return null;
    }
}

export async function saveQueryCache(userId: number, snapshot: string | null): Promise<void> {
    try {
        if (snapshot == null) await AsyncStorage.removeItem(QUERY_CACHE_PREFIX + userId);
        else await AsyncStorage.setItem(QUERY_CACHE_PREFIX + userId, snapshot);
    } catch {
        // A cache that cannot be written only costs a network fetch next launch.
    }
}
