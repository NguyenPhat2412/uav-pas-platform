import { publicEnvSchema } from "@/config/env";

function origin(value: string | undefined, fallback: string) {
  if (!value && process.env.NEXT_PUBLIC_ENVIRONMENT === 'production') {
    throw new Error('Production requires an explicit application origin.');
  }
  const url = new URL(publicEnvSchema.shape.NEXT_PUBLIC_APP_URL.parse(value || fallback));
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Public navigation requires an HTTP(S) origin without credentials, path or query.');
  }
  if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'production' && (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
    throw new Error('Production origins must use HTTPS and a configured public hostname.');
  }
  return url.origin;
}

export const customerUrl = '/customer';
export const publicUrl = origin(process.env.NEXT_PUBLIC_APP_URL, 'http://localhost:3100');
