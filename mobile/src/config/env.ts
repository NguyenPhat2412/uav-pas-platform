import {z} from 'zod';

// Expo inlines EXPO_PUBLIC_* at build time only when read as a literal process.env.NAME expression.
const schema = z.object({
    EXPO_PUBLIC_API_URL: z.string().url().default('https://api.uav.all1.vn'),
});

const parsed = schema.safeParse({
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || undefined,
});

if (!parsed.success) {
    // A wrong URL in .env must fail loudly in development instead of sending requests nowhere.
    throw new Error(`Invalid mobile environment: ${parsed.error.issues.map(issue => issue.path.join('.')).join(', ')}`);
}

/** Backend origin, without a trailing slash (routes in API_ROUTES start with /api/v1). */
export const API_BASE_URL = parsed.data.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');

/** Hoa Lac area, the web platform's default map centre (DEFAULT_PLATFORM_MAP_CONFIG), used when location is off. */
export const DEFAULT_MAP_CENTER = {lat: 21.0136, lng: 105.5259} as const;
