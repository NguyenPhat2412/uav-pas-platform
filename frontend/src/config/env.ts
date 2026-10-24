import {z} from 'zod';

export const publicEnvSchema = z.object({
    NEXT_PUBLIC_API_URL: z.string().url(),
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_ENVIRONMENT: z.enum(['local', 'staging', 'production']),
    // Staffed 24/7 dispatch number shown to customers; leave unset to hide the call button.
    NEXT_PUBLIC_DISPATCH_HOTLINE: z.string().optional()
});
export type PublicEnv = z.infer<typeof publicEnvSchema>;
export const getPublicEnv = (env: NodeJS.ProcessEnv = process.env) => publicEnvSchema.parse(env);
