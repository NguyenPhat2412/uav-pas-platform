import {z} from 'zod';

export const publicEnvSchema = z.object({
    NEXT_PUBLIC_API_URL: z.string().url(),
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_ENVIRONMENT: z.enum(['local', 'staging', 'production'])
});
export type PublicEnv = z.infer<typeof publicEnvSchema>;
export const getPublicEnv = (env: NodeJS.ProcessEnv = process.env) => publicEnvSchema.parse(env);
