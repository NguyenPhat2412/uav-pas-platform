import {z} from 'zod';
import type {PublicEnv} from '@/types';

export type {PublicEnv};

export const publicEnvSchema = z.object({
    NEXT_PUBLIC_API_URL: z.string().url(),
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_ENVIRONMENT: z.enum(['local', 'staging', 'production']),
    // Staffed 24/7 dispatch number shown to customers; leave unset to hide the call button.
    NEXT_PUBLIC_DISPATCH_HOTLINE: z.string().optional(),
    // OAuth Web client ID for "Đăng nhập bằng Google"; unset shows the button as not configured.
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional()
});
export const getPublicEnv = (env: NodeJS.ProcessEnv = process.env): PublicEnv => publicEnvSchema.parse(env);
