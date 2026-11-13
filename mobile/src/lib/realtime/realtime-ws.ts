import {API_BASE_URL} from '@/config/env';
import {onSessionEnded, onSessionTokenChanged, sessionStore} from '@/lib/api/session';
import {readSupportVisitorToken, readTokens} from '@/lib/storage/secure-tokens';
import type {InvoiceStatus} from '@/shared/types/customer';
import type {PublicSupportThreadSession, SupportAdminSummary, SupportChatMessage, SupportThread} from '@/shared/types/support/support.types';

export type SupportThreadItem = SupportThread;
export type SupportMessageItem = SupportChatMessage;

export type RealtimeClientFrame =
    | { type: 'PING' }
    | { type: 'SUBSCRIBE_VISITOR'; visitorToken: string }
    | { type: 'VISITOR_TYPING'; visitorToken: string; typing: boolean }
    | { type: 'ADMIN_TYPING'; threadId: number; typing: boolean };

export type RealtimeServerFrame =
    | { type: 'CONNECTED'; timestamp: string; authenticated: boolean; adminSupport: boolean }
    | { type: 'PONG'; timestamp: string }
    | { type: 'SUBSCRIBED_VISITOR'; visitorToken: string; timestamp: string }
    | { type: 'SUPPORT_THREAD_UPDATED'; timestamp: string; session: PublicSupportThreadSession }
    | { type: 'SUPPORT_ADMIN_TYPING'; timestamp: string; threadId: number; senderName?: string; typing: boolean }
    | { type: 'SUPPORT_THREAD_DELETED'; timestamp: string; threadId: number; summary?: SupportAdminSummary }
    | { type: 'ADMIN_SUPPORT_UPDATED'; timestamp: string; thread: SupportThreadItem; messages?: SupportMessageItem[]; summary?: SupportAdminSummary }
    | { type: 'SUPPORT_SUMMARY_UPDATED'; timestamp: string; summary: SupportAdminSummary }
    | { type: 'SUPPORT_VISITOR_TYPING'; timestamp: string; threadId: number; senderName?: string; typing: boolean }
    | { type: 'INVOICE_UPDATED'; timestamp: string; invoiceId: number; invoiceCode: string; status: InvoiceStatus | string };

export interface RealtimeSocketLike {
    readonly readyState: number;
    onopen: (() => void) | null;
    onmessage: ((event: { data?: unknown }) => void) | null;
    onerror: (() => void) | null;
    onclose: (() => void) | null;
    send(data: string): void;
    close(code?: number, reason?: string): void;
}

export type RealtimeSocketConstructor = new (url: string) => RealtimeSocketLike;

export interface RealtimeWsOptions {
    getBaseUrl: () => string;
    getAccessTokenSync?: () => string | null;
    getAccessTokenAsync?: () => Promise<string | null>;
    getVisitorTokenAsync?: () => Promise<string | null>;
    getWebSocket?: () => RealtimeSocketConstructor | undefined;
    heartbeatMs?: number;
    backoffBaseMs?: number;
    backoffMaxMs?: number;
}

export const HEARTBEAT_INTERVAL_MS = 25_000;
const DEFAULT_BACKOFF_BASE_MS = 1_000;
const DEFAULT_BACKOFF_MAX_MS = 30_000;
const WS_OPEN = 1;

/** Converts an HTTP(S) API base URL into `/api/v1/ws/realtime` with optional handshake tokens. */
export function buildRealtimeWsUrl(
    apiBaseUrl: string,
    auth?: { accessToken?: string | null; visitorToken?: string | null },
): string {
    const cleaned = apiBaseUrl.trim().replace(/\/+$/, '').replace(/\/api\/v1$/i, '');
    const wsOrigin = cleaned.replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://');
    const endpoint = `${wsOrigin}/api/v1/ws/realtime`;
    const query: string[] = [];
    const accessToken = auth?.accessToken?.trim();
    const visitorToken = auth?.visitorToken?.trim();
    if (accessToken) query.push(`accessToken=${encodeURIComponent(accessToken)}`);
    if (visitorToken) query.push(`visitorToken=${encodeURIComponent(visitorToken)}`);
    return query.length > 0 ? `${endpoint}?${query.join('&')}` : endpoint;
}

function unrefTimer(timer: unknown): void {
    if (timer && typeof timer === 'object' && 'unref' in timer && typeof (timer as { unref?: unknown }).unref === 'function') {
        (timer as { unref: () => void }).unref();
    }
}

export function createRealtimeWsClient(options: RealtimeWsOptions) {
    const heartbeatMs = options.heartbeatMs ?? HEARTBEAT_INTERVAL_MS;
    const backoffBaseMs = options.backoffBaseMs ?? DEFAULT_BACKOFF_BASE_MS;
    const backoffMaxMs = options.backoffMaxMs ?? DEFAULT_BACKOFF_MAX_MS;

    let socket: RealtimeSocketLike | null = null;
    let connected = false;
    let connecting = false;
    let attempt = 0;
    let connectEpoch = 0;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let knownAccessToken: string | null | undefined = undefined;
    let activeAccessToken: string | null = null;
    let visitorToken: string | null = null;
    let hydratedVisitor = false;
    let subscribedVisitorToken: string | null = null;

    const frameListeners = new Set<(frame: RealtimeServerFrame) => void>();
    const statusListeners = new Set<(isConnected: boolean) => void>();

    function setConnected(next: boolean) {
        if (connected === next) return;
        connected = next;
        for (const listener of [...statusListeners]) {
            try { listener(next); } catch { /* isolate listener */ }
        }
    }

    function clearPing() {
        if (pingTimer !== null) clearInterval(pingTimer);
        pingTimer = null;
    }

    function clearReconnect() {
        if (reconnectTimer !== null) clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    function sendFrame(frame: RealtimeClientFrame): boolean {
        if (!socket || socket.readyState !== WS_OPEN) return false;
        try { socket.send(JSON.stringify(frame)); return true; } catch { return false; }
    }

    function teardownSocket() {
        clearPing();
        clearReconnect();
        connecting = false;
        subscribedVisitorToken = null;
        const current = socket;
        socket = null;
        if (current) {
            current.onopen = current.onmessage = current.onerror = current.onclose = null;
            try { current.close(1000, 'client_reconnect'); } catch { /* already closed */ }
        }
        setConnected(false);
    }

    function scheduleReconnect() {
        if (reconnectTimer !== null || frameListeners.size === 0) return;
        const delay = Math.min(backoffMaxMs, backoffBaseMs * 2 ** attempt);
        attempt += 1;
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            if (frameListeners.size > 0) void openConnection();
        }, delay);
        unrefTimer(reconnectTimer);
    }

    const currentSyncAccess = () =>
        knownAccessToken !== undefined ? knownAccessToken : (options.getAccessTokenSync?.()?.trim() || null);

    async function resolveHandshakeTokens(): Promise<{ accessToken: string | null; visitorToken: string | null }> {
        const accessToken =
            currentSyncAccess() ?? ((await options.getAccessTokenAsync?.().catch(() => null))?.trim() || null);
        if (!hydratedVisitor && visitorToken === null && options.getVisitorTokenAsync) {
            const storedVisitor = await options.getVisitorTokenAsync().catch(() => null);
            hydratedVisitor = true;
            if (visitorToken === null && storedVisitor?.trim()) visitorToken = storedVisitor.trim();
        }
        return {accessToken, visitorToken};
    }

    async function openConnection(): Promise<void> {
        if (socket || connecting || frameListeners.size === 0) return;
        const SocketCtor = options.getWebSocket
            ? options.getWebSocket()
            : (globalThis.WebSocket as unknown as RealtimeSocketConstructor | undefined);
        if (typeof SocketCtor !== 'function') {
            setConnected(false);
            return;
        }

        connecting = true;
        const epoch = ++connectEpoch;
        const handshake = await resolveHandshakeTokens();
        if (epoch !== connectEpoch || frameListeners.size === 0 || (!handshake.accessToken && !handshake.visitorToken)) {
            connecting = false;
            if (!handshake.accessToken && !handshake.visitorToken) setConnected(false);
            return;
        }

        let ws: RealtimeSocketLike;
        try {
            ws = new SocketCtor(buildRealtimeWsUrl(options.getBaseUrl(), handshake));
        } catch {
            connecting = false;
            setConnected(false);
            scheduleReconnect();
            return;
        }

        socket = ws;
        activeAccessToken = handshake.accessToken;
        subscribedVisitorToken = handshake.visitorToken;

        ws.onopen = () => {
            if (socket !== ws) return;
            connecting = false;
            attempt = 0;
            setConnected(true);
            clearPing();
            pingTimer = setInterval(() => void sendFrame({type: 'PING'}), heartbeatMs);
            unrefTimer(pingTimer);
            if (visitorToken && visitorToken !== subscribedVisitorToken) {
                if (sendFrame({type: 'SUBSCRIBE_VISITOR', visitorToken})) subscribedVisitorToken = visitorToken;
            }
        };

        ws.onmessage = event => {
            if (socket !== ws || typeof event?.data !== 'string') return;
            let parsed: RealtimeServerFrame | null = null;
            try {
                const candidate = JSON.parse(event.data) as Partial<RealtimeServerFrame> | null;
                if (candidate && typeof candidate === 'object' && typeof candidate.type === 'string') {
                    parsed = candidate as RealtimeServerFrame;
                }
            } catch {
                return;
            }
            if (!parsed) return;
            if (parsed.type === 'CONNECTED') setConnected(true);
            else if (parsed.type === 'SUBSCRIBED_VISITOR' && parsed.visitorToken) subscribedVisitorToken = parsed.visitorToken;
            for (const listener of [...frameListeners]) {
                try {
                    listener(parsed);
                } catch { /* isolate listener */ }
            }
        };

        ws.onerror = () => undefined;
        ws.onclose = () => {
            if (socket !== ws) return;
            socket = null;
            connecting = false;
            subscribedVisitorToken = null;
            clearPing();
            setConnected(false);
            scheduleReconnect();
        };
    }

    function ensureConnected() {
        const latestSyncToken = currentSyncAccess();
        if ((socket || connecting) && latestSyncToken !== activeAccessToken && latestSyncToken !== null) {
            connectEpoch += 1;
            teardownSocket();
            attempt = 0;
        }
        if (!socket && !connecting && reconnectTimer === null && frameListeners.size > 0) {
            void openConnection();
        }
    }

    return {
        isConnected: () => connected,
        subscribe(listener: (frame: RealtimeServerFrame) => void): () => void {
            frameListeners.add(listener);
            ensureConnected();
            return () => {
                frameListeners.delete(listener);
                if (frameListeners.size === 0) {
                    connectEpoch += 1;
                    teardownSocket();
                }
            };
        },
        subscribeStatus(listener: (isConnected: boolean) => void): () => void {
            statusListeners.add(listener);
            listener(connected);
            return () => void statusListeners.delete(listener);
        },
        syncAccessToken(nextToken?: string | null): void {
            knownAccessToken = nextToken === undefined ? undefined : (nextToken?.trim() || null);
            const resolved = currentSyncAccess();
            if ((socket || connecting) && resolved !== activeAccessToken) {
                connectEpoch += 1;
                teardownSocket();
                attempt = 0;
                if (frameListeners.size > 0) void openConnection();
            } else if (frameListeners.size > 0) {
                clearReconnect();
                attempt = 0;
                ensureConnected();
            }
        },
        setVisitorToken(nextVisitorToken: string | null): void {
            const cleaned = nextVisitorToken?.trim() || null;
            hydratedVisitor = true;
            const prev = visitorToken;
            visitorToken = cleaned;
            if (cleaned) {
                if (socket && socket.readyState === WS_OPEN) {
                    if (subscribedVisitorToken !== cleaned && sendFrame({type: 'SUBSCRIBE_VISITOR', visitorToken: cleaned})) {
                        subscribedVisitorToken = cleaned;
                    }
                } else if (frameListeners.size > 0) {
                    clearReconnect();
                    attempt = 0;
                    ensureConnected();
                }
            } else if (prev !== null && subscribedVisitorToken !== null && (socket || connecting)) {
                connectEpoch += 1;
                teardownSocket();
                attempt = 0;
                if (frameListeners.size > 0) void openConnection();
            }
        },
        subscribeVisitor(token: string): boolean {
            const cleaned = token.trim();
            if (!cleaned) return false;
            hydratedVisitor = true;
            visitorToken = cleaned;
            if (socket && socket.readyState === WS_OPEN) {
                const sent = sendFrame({type: 'SUBSCRIBE_VISITOR', visitorToken: cleaned});
                if (sent) subscribedVisitorToken = cleaned;
                return sent;
            }
            if (frameListeners.size > 0) {
                clearReconnect();
                attempt = 0;
                ensureConnected();
            }
            return false;
        },
        sendVisitorTyping(token: string, typing: boolean): boolean {
            const cleaned = token.trim();
            return cleaned ? sendFrame({type: 'VISITOR_TYPING', visitorToken: cleaned, typing: Boolean(typing)}) : false;
        },
        sendAdminTyping(threadId: number, typing: boolean): boolean {
            return Number.isSafeInteger(threadId) && threadId > 0
                ? sendFrame({type: 'ADMIN_TYPING', threadId, typing: Boolean(typing)})
                : false;
        },
        disconnect(): void {
            connectEpoch += 1;
            teardownSocket();
        },
    };
}

export type RealtimeWsClient = ReturnType<typeof createRealtimeWsClient>;

export const realtimeWs = createRealtimeWsClient({
    getBaseUrl: () => API_BASE_URL,
    getAccessTokenSync: () => sessionStore.read()?.accessToken ?? null,
    getAccessTokenAsync: async () => (await readTokens())?.accessToken ?? null,
    getVisitorTokenAsync: () => readSupportVisitorToken(),
});

onSessionTokenChanged(token => realtimeWs.syncAccessToken(token));
onSessionEnded(() => realtimeWs.syncAccessToken(null));

export const sendVisitorTyping = (visitorToken: string, typing: boolean) => realtimeWs.sendVisitorTyping(visitorToken, typing);
export const sendAdminTyping = (threadId: number, typing: boolean) => realtimeWs.sendAdminTyping(threadId, typing);
