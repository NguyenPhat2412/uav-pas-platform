import {z} from 'zod';

// Expo inlines EXPO_PUBLIC_* at build time only when read as a literal process.env.NAME expression.
const schema = z.object({
    EXPO_PUBLIC_API_URL: z.string().url().default('https://api.uav.all1.vn'),
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: z.string().endsWith('.apps.googleusercontent.com').optional(),
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: z.string().endsWith('.apps.googleusercontent.com').optional(),
});

const parsed = schema.safeParse({
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || undefined,
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
});

if (!parsed.success) {
    // A wrong URL in .env must fail loudly in development instead of sending requests nowhere.
    throw new Error(`Invalid mobile environment: ${parsed.error.issues.map(issue => issue.path.join('.')).join(', ')}`);
}

/** Backend origin, without a trailing slash (routes in API_ROUTES start with /api/v1). */
export const API_BASE_URL = parsed.data.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');

/**
 * Google Sign-In client IDs. The web client ID is the ID token's audience, the same one the backend
 * already accepts for the website; the iOS client ID identifies this app to Google. Both are needed.
 */
export const GOOGLE_CLIENT_IDS = parsed.data.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID && parsed.data.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
    ? {web: parsed.data.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, ios: parsed.data.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID}
    : null;

/** Hoa Lac area, the web platform's default map centre (DEFAULT_PLATFORM_MAP_CONFIG), used when location is off. */
export const DEFAULT_MAP_CENTER = {lat: 21.0136, lng: 105.5259} as const;
