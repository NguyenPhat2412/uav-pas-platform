import * as SecureStore from 'expo-secure-store';

/** Tokens live only in the iOS Keychain (Android Keystore), never in AsyncStorage. */
export interface StoredTokens {
    accessToken: string;
    refreshToken: string;
}

const ACCESS_KEY = 'uav_access_token';
const REFRESH_KEY = 'uav_refresh_token';

// Readable only while the phone is unlocked, and never restored onto another device from a backup.
const OPTIONS: SecureStore.SecureStoreOptions = {keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY};

export async function readTokens(): Promise<StoredTokens | null> {
    try {
        const [accessToken, refreshToken] = await Promise.all([
            SecureStore.getItemAsync(ACCESS_KEY, OPTIONS),
            SecureStore.getItemAsync(REFRESH_KEY, OPTIONS),
        ]);
        return accessToken && refreshToken ? {accessToken, refreshToken} : null;
    } catch {
        // An unreadable Keychain entry is treated as signed out; the user signs in again.
        return null;
    }
}

export async function writeTokens(tokens: StoredTokens): Promise<void> {
    await Promise.all([
        SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken, OPTIONS),
        SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken, OPTIONS),
    ]);
}

export async function clearTokens(): Promise<void> {
    await Promise.allSettled([
        SecureStore.deleteItemAsync(ACCESS_KEY, OPTIONS),
        SecureStore.deleteItemAsync(REFRESH_KEY, OPTIONS),
    ]);
}
