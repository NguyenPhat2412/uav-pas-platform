import AsyncStorage from '@react-native-async-storage/async-storage';

/** Non-secret preferences only (language, text size). Tokens belong in secure-tokens.ts; the architecture check enforces it. */
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
