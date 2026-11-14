import {Platform} from 'react-native';
import {API_BASE_URL} from '@/config/env';
import {apiMessageCodes, apiMessages, clientText} from '@/shared/lib/api/messages';
import {API_ROUTES} from '@/shared/lib/api/routes';
import {getPresentationLocale} from '@/shared/lib/presentation';
import {sessionStore} from '@/lib/api/session';
import {ApiError, bytesToBase64, createApiClient} from '@/lib/api/core';

export {API_ROUTES, ApiError};

export type TransportSignal = 'online' | 'server' | 'maintenance';
type TransportListener = (signal: TransportSignal) => void;
const sharedTransport = globalThis as { __uavTransportListeners?: Set<TransportListener> };
const transportListeners = (sharedTransport.__uavTransportListeners ??= new Set());

export function onTransportStatus(listener: TransportListener): () => void {
    transportListeners.add(listener);
    return () => {
        transportListeners.delete(listener);
    };
}

function emitTransport(signal: TransportSignal) {
    transportListeners.forEach(listener => listener(signal));
}

/** The only place the app talks HTTP; the architecture check forbids fetch() anywhere else. */
export const apiClient = createApiClient({
    baseUrl: API_BASE_URL,
    fetch: async (input, init) => {
        const isApi = typeof input === 'string' && input.startsWith(API_BASE_URL);
        try {
            const response = await fetch(input, init);
            if (isApi) {
                if (response.status === 502 || response.status === 503 || response.status === 504) {
                    emitTransport('maintenance');
                } else {
                    emitTransport('online');
                }
            }
            return response;
        } catch (error) {
            if (isApi && !init?.signal?.aborted) emitTransport('server');
            throw error;
        }
    },
    session: sessionStore,
    refreshPath: API_ROUTES.auth.refresh,
    // X-Client gives the phone its own refresh token, so signing in here never signs the web portal out.
    headers: () => ({'accept-language': getPresentationLocale(), 'x-client': Platform.OS === 'android' ? 'android' : 'ios'}),
    text: () => clientText[getPresentationLocale()],
    localize: message => (message ? apiMessages[getPresentationLocale()][message] ?? message : message),
    codeOf: message => (message ? apiMessageCodes[message] : undefined),
});

/** PUTs a local file (camera or photo library URI) to a signed storage URL, as the web does with a File. */
export async function uploadToSignedUrl(signedUrl: string, fileUri: string, contentType: string): Promise<void> {
    const file = await (await fetch(fileUri)).blob();
    await apiClient.request<void>(signedUrl, {
        method: 'PUT',
        headers: {'If-None-Match': '*', 'Content-Type': contentType},
        body: file,
    });
}

/**
 * An <Image> source for an API image such as the avatar (stored as /api/v1/users/{id}/avatar?v=…): the API origin is
 * added and the Bearer token sent, as the web's cookie would be; the API answers with a redirect to signed storage.
 */
export function apiImageSource(url?: string | null): { uri: string; headers?: Record<string, string> } | undefined {
    if (!url) return undefined;
    if (!url.startsWith('/api/')) return {uri: url};
    const token = sessionStore.read()?.accessToken;
    return {uri: `${API_BASE_URL}${url}`, headers: token ? {Authorization: `Bearer ${token}`} : undefined};
}

/** Downloads an authenticated API binary (e.g. invoice PDF) and encodes it as a Base64 data: URI for native sharing. */
export async function fetchApiBase64DataUri(path: string, mimeType = 'application/pdf', signal?: AbortSignal): Promise<string> {
    const bytes = await apiClient.getBytes(path, {
        signal,
        headers: {Accept: mimeType},
    });
    return `data:${mimeType};base64,${bytesToBase64(bytes)}`;
}
