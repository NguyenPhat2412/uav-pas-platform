import {useEffect, useRef} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {ordersService} from '@/api/orders.api';
import {sessionStore} from '@/lib/api/session';
import {realtimeWs} from '@/lib/realtime/realtime-ws';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {describeOrderRealtimeToast} from '@/shared/forms/project-form';
import {projectKeys} from '@/shared/hooks/project-query-keys';
import {displayLabel} from '@/shared/lib/presentation';
import {queryKeys} from '@/shared/lib/query';

const TRACKING_POLL_MS = 4_000;
let lastOrderToastDedupeKey = '';

/**
 * Subscribes to `ORDER_UPDATED` frames on `/api/v1/ws/realtime` so Home (`OrderStatusBarCard`),
 * Projects (`ProjectListScreen` / `ProjectDetailScreen`), Orders, and Simulated Flight Tracking
 * (`OrderTrackingScreen`) refresh immediately without waiting for poll, with optional deduplicated toast.
 */
export function useOrderRealtimeSync(options?: { notifyToast?: boolean; targetOrderId?: number }) {
    const {user, status} = useAuth();
    const {t} = useI18n();
    const toast = useToast();
    const qc = useQueryClient();
    const notifyToast = Boolean(options?.notifyToast);
    const targetOrderId = options?.targetOrderId;
    const tRef = useRef(t);
    const toastRef = useRef(toast);

    useEffect(() => {
        tRef.current = t;
        toastRef.current = toast;
    }, [t, toast]);

    useEffect(() => {
        if (status !== 'signed-in' || !user?.id) return;
        const userId = user.id;
        realtimeWs.syncAccessToken(sessionStore.read()?.accessToken ?? null);
        return realtimeWs.subscribe(frame => {
            if (frame.type !== 'ORDER_UPDATED') return;
            const resolvedId = Number(frame.missionId || frame.orderId || 0);
            void qc.invalidateQueries({queryKey: projectKeys.all(userId)});
            void qc.invalidateQueries({queryKey: queryKeys.feature(userId, 'orders')});
            void qc.invalidateQueries({queryKey: queryKeys.feature(userId, 'customer')});
            void qc.invalidateQueries({queryKey: queryKeys.feature(userId, 'marketplace')});
            if (resolvedId > 0 && targetOrderId === resolvedId) {
                void qc.invalidateQueries({queryKey: projectKeys.orderTracking(userId, resolvedId)});
            }
            if (notifyToast && resolvedId > 0) {
                const meta = describeOrderRealtimeToast({
                    missionId: resolvedId,
                    status: frame.status,
                    statusGroup: frame.statusGroup,
                });
                if (lastOrderToastDedupeKey !== meta.dedupeKey) {
                    lastOrderToastDedupeKey = meta.dedupeKey;
                    const statusText = displayLabel(frame.status);
                    toastRef.current.show(
                        tRef.current('mobile.overnight.orderUpdatedToast', {
                            id: resolvedId,
                            status: statusText,
                        }),
                        meta.tone === 'warning' ? 'error' : meta.tone,
                    );
                }
            }
        });
    }, [notifyToast, qc, status, targetOrderId, user?.id]);
}

/**
 * Fetches `GET /api/v1/orders/summary` -> `{ pending, scheduled, inFlight, delivered, toReview }`.
 */
export function useCustomerOrderSummary() {
    const {user, status, can, permissionsReady} = useAuth();
    useOrderRealtimeSync();
    const query = useQuery({
        queryKey: [...queryKeys.feature(user?.id, 'orders'), 'summary'],
        queryFn: ({signal}) => ordersService.summary(signal),
        enabled: status === 'signed-in' && permissionsReady && can('MISSION_VIEW'),
        retry: false,
    });
    const isNotFound =
        query.isError &&
        typeof query.error === 'object' &&
        query.error !== null &&
        'status' in query.error &&
        (query.error as { status?: unknown }).status === 404;
    return {...query, isNotFound};
}

/**
 * Fetches `GET /api/v1/orders/{id}/tracking` for simulated flight tracking with
 * `ORDER_UPDATED` WebSocket push + 4s polling fallback.
 */
export function useOrderTracking(orderId: number, enabled = true) {
    const {user, status, can, permissionsReady} = useAuth();
    useOrderRealtimeSync({targetOrderId: orderId});
    const valid = Number.isSafeInteger(orderId) && orderId > 0;
    return useQuery({
        queryKey: [...queryKeys.feature(user?.id, 'orders'), 'tracking', orderId],
        queryFn: ({signal}) => ordersService.tracking(orderId, signal),
        enabled: valid && enabled && status === 'signed-in' && permissionsReady && can('MISSION_VIEW'),
        refetchInterval: query => (query.state.status === 'error' ? false : TRACKING_POLL_MS),
        retry: 1,
    });
}
