export interface OpsSupportChatMessage {
    id: number;
    senderRole: 'VISITOR' | 'ADMIN';
    senderName: string;
    content: string;
    createdAt: string;
}

export type OpsSupportStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface OpsSupportThread {
    id: number;
    code: string;
    fullName: string;
    organization?: string | null;
    contactInfo: string;
    topic: string;
    source: string;
    status: OpsSupportStatus;
    unreadForAdmin: number;
    unreadForVisitor: number;
    lastMessagePreview?: string | null;
    lastSenderRole: 'VISITOR' | 'ADMIN';
    assignedAdminUsername?: string | null;
    messageCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface OpsSupportSummary {
    totalThreads: number;
    openThreads: number;
    inProgressThreads: number;
    resolvedThreads: number;
    unreadThreads: number;
    unreadMessages: number;
}

export interface OpsSupportThreadDetail {
    thread: OpsSupportThread;
    messages: OpsSupportChatMessage[];
}

export interface OpsSupportQuickReply {
    id: number;
    title: string;
    topic?: string | null;
    content: string;
    sortOrder: number;
    createdBy?: string | null;
    createdAt: string;
}

export type OperationsRealtimeFrame =
    | { type: 'CONNECTED'; timestamp: string; authenticated: boolean; adminSupport: boolean }
    | { type: 'PONG'; timestamp: string }
    | {
          type: 'ADMIN_SUPPORT_UPDATED';
          timestamp: string;
          thread: OpsSupportThread;
          messages?: OpsSupportChatMessage[];
          summary?: OpsSupportSummary;
      }
    | { type: 'SUPPORT_SUMMARY_UPDATED'; timestamp: string; summary: OpsSupportSummary }
    | { type: 'SUPPORT_THREAD_DELETED'; timestamp: string; threadId: number; summary?: OpsSupportSummary }
    | { type: 'SUPPORT_VISITOR_TYPING'; timestamp: string; threadId: number; senderName?: string; typing: boolean };

type FrameListener = (frame: OperationsRealtimeFrame) => void;
type StatusListener = (connected: boolean) => void;

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || '').trim();
const SESSION_EVENT_NAME = 'uav:session';

export function buildOperationsRealtimeWsUrl(rawApiUrl = API_ORIGIN): string {
    const cleaned = rawApiUrl
        .replace(/\/+$/, '')
        .replace(/\/api\/v1\/ws\/realtime$/i, '')
        .replace(/\/api\/v1$/i, '');
    if (/^https?:\/\//i.test(cleaned)) {
        return `${cleaned.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:')}/api/v1/ws/realtime`;
    }
    if (/^wss?:\/\//i.test(cleaned)) {
        return `${cleaned}/api/v1/ws/realtime`;
    }
    if (rawApiUrl.startsWith('/') && typeof window !== 'undefined' && window.location?.host) {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${proto}//${window.location.host}/api/v1/ws/realtime`;
    }
    return 'ws://localhost:8080/api/v1/ws/realtime';
}

class OperationsRealtimeClient {
    private socket: WebSocket | null = null;
    private connected = false;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    private retryAttempt = 0;
    private windowListenersAttached = false;
    private readonly frameListeners = new Set<FrameListener>();
    private readonly statusListeners = new Set<StatusListener>();

    private readonly handleSessionChanged = () => {
        if (!this.hasSubscribers()) return;
        this.clearReconnect();
        this.retryAttempt = 0;
        if (this.socket) {
            const prev = this.socket;
            this.socket = null;
            prev.onopen = prev.onmessage = prev.onerror = prev.onclose = null;
            try { prev.close(); } catch { /* ignore */ }
        }
        this.stopHeartbeat();
        this.setConnected(false);
        this.ensureConnected();
    };

    private readonly handleBrowserOnline = () => {
        if (this.hasSubscribers() && !this.socket) {
            this.clearReconnect();
            this.retryAttempt = 0;
            this.ensureConnected();
        }
    };

    private attachWindowListeners(): void {
        if (this.windowListenersAttached || typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
        this.windowListenersAttached = true;
        window.addEventListener(SESSION_EVENT_NAME, this.handleSessionChanged);
        window.addEventListener('online', this.handleBrowserOnline);
    }

    private detachWindowListeners(): void {
        if (!this.windowListenersAttached || typeof window === 'undefined' || typeof window.removeEventListener !== 'function') return;
        this.windowListenersAttached = false;
        window.removeEventListener(SESSION_EVENT_NAME, this.handleSessionChanged);
        window.removeEventListener('online', this.handleBrowserOnline);
    }

    subscribeFrames(listener: FrameListener): () => void {
        this.frameListeners.add(listener);
        this.attachWindowListeners();
        this.ensureConnected();
        return () => {
            this.frameListeners.delete(listener);
            this.teardownIfIdle();
        };
    }

    subscribeStatus(listener: StatusListener): () => void {
        this.statusListeners.add(listener);
        listener(this.connected);
        this.attachWindowListeners();
        this.ensureConnected();
        return () => {
            this.statusListeners.delete(listener);
            this.teardownIfIdle();
        };
    }

    isConnected(): boolean {
        return this.connected;
    }

    send(frame: Record<string, unknown>): boolean {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
        try {
            this.socket.send(JSON.stringify(frame));
            return true;
        } catch {
            return false;
        }
    }

    private hasSubscribers(): boolean {
        return this.frameListeners.size > 0 || this.statusListeners.size > 0;
    }

    private ensureConnected(): void {
        if (typeof window === 'undefined' || typeof WebSocket === 'undefined') return;
        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            return;
        }
        this.clearReconnect();
        try {
            const ws = new WebSocket(buildOperationsRealtimeWsUrl());
            this.socket = ws;

            ws.onopen = () => {
                if (this.socket !== ws) return;
                this.retryAttempt = 0;
                this.setConnected(true);
                this.startHeartbeat();
            };

            ws.onmessage = event => {
                if (typeof event.data !== 'string') return;
                try {
                    const parsed = JSON.parse(event.data) as OperationsRealtimeFrame;
                    if (parsed && typeof parsed.type === 'string') {
                        for (const fn of this.frameListeners) fn(parsed);
                    }
                } catch {
                    // Ignore malformed frames.
                }
            };

            ws.onerror = () => undefined;

            ws.onclose = () => {
                if (this.socket === ws) this.socket = null;
                this.stopHeartbeat();
                this.setConnected(false);
                if (this.hasSubscribers()) this.scheduleReconnect();
            };
        } catch {
            this.setConnected(false);
            if (this.hasSubscribers()) this.scheduleReconnect();
        }
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimer !== null || !this.hasSubscribers()) return;
        const delayMs = Math.min(1000 * 2 ** Math.min(this.retryAttempt, 3), 8000);
        this.retryAttempt += 1;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.hasSubscribers()) this.ensureConnected();
        }, delayMs);
    }

    private startHeartbeat(): void {
        this.stopHeartbeat();
        this.heartbeatTimer = setInterval(() => {
            this.send({type: 'PING'});
        }, 25_000);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatTimer !== null) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    private clearReconnect(): void {
        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    private setConnected(next: boolean): void {
        if (this.connected === next) return;
        this.connected = next;
        for (const fn of this.statusListeners) fn(next);
    }

    private teardownIfIdle(): void {
        if (this.hasSubscribers()) return;
        this.detachWindowListeners();
        this.clearReconnect();
        this.stopHeartbeat();
        if (this.socket) {
            try { this.socket.close(); } catch { /* ignore */ }
            this.socket = null;
        }
        this.setConnected(false);
    }
}

export const operationsRealtimeClient = new OperationsRealtimeClient();
