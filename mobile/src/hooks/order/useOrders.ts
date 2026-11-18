import {useEffect} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {ordersService} from '@/api/order/orders.api';
import {realtimeWs} from '@/lib/realtime/realtime-ws';
import {useAuth} from '@/providers/AuthContext';
import {queryKeys} from '@/shared/lib/query';

const TRACKING_POLL_MS = 4_000;

/**
 * Subscribes to `ORDER_UPDATED` frames on `/api/v1/ws/realtime` so order summary,
 * missions, projects, and live tracking queries refresh immediately without waiting for poll.
 */
export function useOrderRealtimeSync() {
    const {user, status} = useAuth();
    const qc = useQueryClient();

    useEffect(() => {
        if (status !== 'signed-in' || !user?.id) return;
        const userId = user.id;
        return realtimeWs.subscribe(frame => {
            if (frame.type !== 'ORDER_UPDATED') return;
            void qc.invalidateQueries({queryKey: queryKeys.feature(userId, 'orders')});
            void qc.invalidateQueries({queryKey: queryKeys.feature(userId, 'customer')});
            void qc.invalidateQueries({queryKey: queryKeys.feature(userId, 'projects')});
            void qc.invalidateQueries({queryKey: queryKeys.feature(userId, 'marketplace')});
        });
    }, [qc, status, user?.id]);
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
    useOrderRealtimeSync();
    const valid = Number.isSafeInteger(orderId) && orderId > 0;
    return useQuery({
        queryKey: [...queryKeys.feature(user?.id, 'orders'), 'tracking', orderId],
        queryFn: ({signal}) => ordersService.tracking(orderId, signal),
        enabled: valid && enabled && status === 'signed-in' && permissionsReady && can('MISSION_VIEW'),
        refetchInterval: query => (query.state.status === 'error' ? false : TRACKING_POLL_MS),
        retry: 1,
    });
}
