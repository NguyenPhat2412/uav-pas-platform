import type {InvoiceStatus} from '@/types';
import type {PublicSupportThreadSession} from '@/types/support/support.types';

export type RealtimeConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export type RealtimeClientFrame =
    | { type: 'PING' }
    | { type: 'SUBSCRIBE_VISITOR'; visitorToken: string }
    | { type: 'VISITOR_TYPING'; visitorToken: string; typing: boolean };

export type RealtimeServerFrame =
    | { type: 'CONNECTED'; timestamp: string; authenticated: boolean; adminSupport: boolean }
    | { type: 'PONG'; timestamp: string }
    | { type: 'SUBSCRIBED_VISITOR'; visitorToken: string; timestamp: string }
    | { type: 'SUPPORT_THREAD_UPDATED'; timestamp: string; session: PublicSupportThreadSession }
    | { type: 'SUPPORT_ADMIN_TYPING'; timestamp: string; threadId: number; senderName?: string | null; typing: boolean }
    | { type: 'SUPPORT_THREAD_DELETED'; timestamp: string; threadId: number }
    | { type: 'INVOICE_UPDATED'; timestamp: string; invoiceId: number; invoiceCode: string; status: InvoiceStatus | string };

export interface RealtimeAcquireOptions {
    authenticated?: boolean;
    visitorToken?: string | null;
}

const BACKOFF_STEPS_MS = [1_000, 2_000, 4_000, 10_000] as const;
const HEARTBEAT_INTERVAL_MS = 25_000;
const IDLE_TEARDOWN_GRACE_MS = 250;
const SESSION_EVENT_NAME = 'uav:session';
const REALTIME_WS_PATH = '/api/v1/ws/realtime';

/**
 * Derives the WebSocket URL (`ws://` or `wss://` + `/api/v1/ws/realtime`) from `NEXT_PUBLIC_API_URL`
 * (or browser origin when configured as a relative proxy path), appending `?visitorToken=...` when present.
 */
export function resolveRealtimeWsUrl(visitorToken?: string | null, rawApiUrl?: string): string {
    const configured = (rawApiUrl ?? process.env.NEXT_PUBLIC_API_URL ?? '').trim();
    const cleaned = configured
        .replace(/\/+$/, '')
        .replace(/\/api\/v1\/ws\/realtime$/i, '')
        .replace(/\/api\/v1$/i, '');

    let wsOrigin: string;
    if (/^https?:\/\//i.test(cleaned)) {
        wsOrigin = cleaned.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
    } else if (/^wss?:\/\//i.test(cleaned)) {
        wsOrigin = cleaned;
    } else if (configured.startsWith('/') && typeof window !== 'undefined' && window.location?.host) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsOrigin = `${protocol}//${window.location.host}`;
    } else {
        wsOrigin = 'ws://localhost:8080';
    }

    const token = visitorToken?.trim();
    const query = token ? `?visitorToken=${encodeURIComponent(token)}` : '';
    return `${wsOrigin}${REALTIME_WS_PATH}${query}`;
}

export interface RealtimeManagerEnv {
    createSocket?: (url: string) => WebSocket;
    isBrowser?: () => boolean;
    resolveUrl?: (visitorToken?: string | null) => string;
    heartbeatMs?: number;
    idleGraceMs?: number;
    backoffStepsMs?: readonly number[];
}

export function createRealtimeWsManager(env: RealtimeManagerEnv = {}) {
    const isBrowser = env.isBrowser ?? (() => typeof window !== 'undefined' && typeof WebSocket !== 'undefined');
    const createSocket = env.createSocket ?? ((url: string) => new WebSocket(url));
    const resolveUrl = env.resolveUrl ?? ((visitorToken?: string | null) => resolveRealtimeWsUrl(visitorToken));
    const heartbeatMs = env.heartbeatMs ?? HEARTBEAT_INTERVAL_MS;
    const idleGraceMs = env.idleGraceMs ?? IDLE_TEARDOWN_GRACE_MS;
    const backoffSteps = env.backoffStepsMs ?? BACKOFF_STEPS_MS;

    let socket: WebSocket | null = null;
    let status: RealtimeConnectionStatus = 'disconnected';
    let authenticatedRefs = 0;
    const visitorTokenRefs = new Map<string, number>();
    const subscribedOnSocket = new Set<string>();
    let serverAuthenticated: boolean | null = null;
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let teardownTimer: ReturnType<typeof setTimeout> | null = null;
    let windowListenersAttached = false;

    const statusListeners = new Set<(next: RealtimeConnectionStatus) => void>();
    const eventListeners = new Set<(frame: RealtimeServerFrame) => void>();

    const hasConsumers = () => authenticatedRefs > 0 || visitorTokenRefs.size > 0;

    const setStatus = (next: RealtimeConnectionStatus) => {
        if (status === next) return;
        status = next;
        for (const listener of statusListeners) listener(next);
    };

    const stopHeartbeat = () => {
        if (heartbeatTimer !== null) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
    };

    const clearReconnect = () => {
        if (reconnectTimer !== null) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
    };

    const clearTeardown = () => {
        if (teardownTimer !== null) {
            clearTimeout(teardownTimer);
            teardownTimer = null;
        }
    };

    const sendFrame = (payload: RealtimeClientFrame): boolean => {
        if (!isBrowser() || !socket || socket.readyState !== 1) return false;
        try {
            socket.send(JSON.stringify(payload));
            return true;
        } catch {
            return false;
        }
    };

    const subscribePendingVisitors = () => {
        for (const token of visitorTokenRefs.keys()) {
            if (!subscribedOnSocket.has(token)) {
                if (sendFrame({type: 'SUBSCRIBE_VISITOR', visitorToken: token})) {
                    subscribedOnSocket.add(token);
                }
            }
        }
    };

    const closeCurrentSocket = () => {
        stopHeartbeat();
        subscribedOnSocket.clear();
        serverAuthenticated = null;
        const active = socket;
        socket = null;
        if (active) {
            active.onopen = null;
            active.onmessage = null;
            active.onerror = null;
            active.onclose = null;
            if (active.readyState === 0 || active.readyState === 1) {
                try {
                    active.close();
                } catch {
                    // Ignore close errors on already-closing sockets.
                }
            }
        }
    };

    const scheduleReconnect = () => {
        if (!isBrowser() || !hasConsumers() || reconnectTimer !== null) return;
        const delay = backoffSteps[Math.min(reconnectAttempt, backoffSteps.length - 1)] ?? 10_000;
        reconnectAttempt += 1;
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            if (hasConsumers()) connect();
        }, delay);
    };

    const connect = () => {
        if (!isBrowser() || !hasConsumers()) return;
        if (socket && (socket.readyState === 0 || socket.readyState === 1)) return;

        clearReconnect();
        subscribedOnSocket.clear();
        serverAuthenticated = null;
        const primaryToken = visitorTokenRefs.keys().next().value ?? null;
        const url = resolveUrl(primaryToken);

        let ws: WebSocket;
        try {
            setStatus('connecting');
            ws = createSocket(url);
        } catch {
            setStatus('disconnected');
            scheduleReconnect();
            return;
        }

        socket = ws;
        if (primaryToken) subscribedOnSocket.add(primaryToken);

        ws.onopen = () => {
            if (socket !== ws) return;
            reconnectAttempt = 0;
            setStatus('connected');
            subscribePendingVisitors();
            stopHeartbeat();
            heartbeatTimer = setInterval(() => {
                sendFrame({type: 'PING'});
            }, heartbeatMs);
        };

        ws.onmessage = (event: MessageEvent) => {
            if (socket !== ws || typeof event.data !== 'string') return;
            let parsed: unknown;
            try {
                parsed = JSON.parse(event.data);
            } catch {
                return;
            }
            if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) return;
            const frame = parsed as RealtimeServerFrame;
            if (frame.type === 'CONNECTED') {
                serverAuthenticated = Boolean(frame.authenticated);
            }
            for (const listener of eventListeners) listener(frame);
        };

        ws.onerror = () => {
            // Browser fires onclose right after onerror; reconnect is coordinated in onclose.
        };

        ws.onclose = () => {
            if (socket !== ws) return;
            stopHeartbeat();
            subscribedOnSocket.clear();
            serverAuthenticated = null;
            socket = null;
            setStatus('disconnected');
            if (hasConsumers()) scheduleReconnect();
        };
    };

    const reconnectNow = () => {
        clearReconnect();
        reconnectAttempt = 0;
        closeCurrentSocket();
        if (hasConsumers()) {
            connect();
        } else {
            setStatus('disconnected');
        }
    };

    const onSessionEvent = () => {
        if (hasConsumers()) reconnectNow();
    };

    const onBrowserOnline = () => {
        if (hasConsumers() && (!socket || (socket.readyState !== 0 && socket.readyState !== 1))) {
            clearReconnect();
            reconnectAttempt = 0;
            connect();
        }
    };

    const attachWindowListeners = () => {
        if (windowListenersAttached || typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
        windowListenersAttached = true;
        window.addEventListener(SESSION_EVENT_NAME, onSessionEvent);
        window.addEventListener('online', onBrowserOnline);
    };

    const detachWindowListeners = () => {
        if (!windowListenersAttached || typeof window === 'undefined' || typeof window.removeEventListener !== 'function') return;
        windowListenersAttached = false;
        window.removeEventListener(SESSION_EVENT_NAME, onSessionEvent);
        window.removeEventListener('online', onBrowserOnline);
    };

    const teardownAll = () => {
        clearTeardown();
        clearReconnect();
        reconnectAttempt = 0;
        closeCurrentSocket();
        detachWindowListeners();
        setStatus('disconnected');
    };

    const acquire = (options: RealtimeAcquireOptions = {}): (() => void) => {
        if (!isBrowser()) return () => {};
        const wantAuth = Boolean(options.authenticated);
        const token = options.visitorToken?.trim() || null;
        if (!wantAuth && !token) return () => {};

        clearTeardown();
        attachWindowListeners();

        const hadAuthBefore = authenticatedRefs > 0;
        if (wantAuth) authenticatedRefs += 1;
        if (token) visitorTokenRefs.set(token, (visitorTokenRefs.get(token) ?? 0) + 1);

        if (!socket || (socket.readyState !== 0 && socket.readyState !== 1)) {
            connect();
        } else if (wantAuth && !hadAuthBefore && serverAuthenticated === false) {
            reconnectNow();
        } else if (token && socket.readyState === 1) {
            subscribePendingVisitors();
        }

        let released = false;
        return () => {
            if (released) return;
            released = true;
            if (wantAuth) authenticatedRefs = Math.max(0, authenticatedRefs - 1);
            if (token) {
                const next = (visitorTokenRefs.get(token) ?? 1) - 1;
                if (next <= 0) visitorTokenRefs.delete(token);
                else visitorTokenRefs.set(token, next);
            }
            if (!hasConsumers()) {
                clearTeardown();
                teardownTimer = setTimeout(() => {
                    teardownTimer = null;
                    if (!hasConsumers()) teardownAll();
                }, idleGraceMs);
            }
        };
    };

    const subscribeStatus = (listener: (next: RealtimeConnectionStatus) => void): (() => void) => {
        if (!isBrowser()) return () => {};
        statusListeners.add(listener);
        return () => {
            statusListeners.delete(listener);
        };
    };

    const subscribeEvents = (listener: (frame: RealtimeServerFrame) => void): (() => void) => {
        if (!isBrowser()) return () => {};
        eventListeners.add(listener);
        return () => {
            eventListeners.delete(listener);
        };
    };

    const sendVisitorTyping = (visitorToken: string, typing: boolean): boolean => {
        const normalized = visitorToken.trim();
        if (!normalized) return false;
        return sendFrame({type: 'VISITOR_TYPING', visitorToken: normalized, typing});
    };

    return {
        acquire,
        getStatus: (): RealtimeConnectionStatus => (isBrowser() ? status : 'disconnected'),
        subscribeStatus,
        subscribeEvents,
        sendFrame,
        sendVisitorTyping,
        disconnectAll: teardownAll,
    };
}

const realtimeWs = createRealtimeWsManager();

export const acquireRealtimeConnection = realtimeWs.acquire;
export const getRealtimeStatus = realtimeWs.getStatus;
export const subscribeRealtimeStatus = realtimeWs.subscribeStatus;
export const subscribeRealtimeEvents = realtimeWs.subscribeEvents;
export const sendFrame = realtimeWs.sendFrame;
export const sendVisitorTyping = realtimeWs.sendVisitorTyping;
