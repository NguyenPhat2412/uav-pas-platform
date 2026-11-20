import {apiClient, API_ROUTES} from '@/lib/api/client';
import type {
    CustomerOrderSummary,
    OrderStatusGroup,
    OrderTrackingSnapshot,
} from '@/shared/types/project/project.types';

export interface TrackingLinkQuality {
    sent?: number;
    delivered?: number;
    lost?: number;
    lossPct?: number;
    averageLatencyMs?: number;
}

export interface MobileOrderTrackingSnapshot
    extends Omit<OrderTrackingSnapshot, 'link' | 'waypoints' | 'track'> {
    missionCode?: string | null;
    statusGroup?: OrderStatusGroup | string | null;
    activeSimulation?: boolean;
    link?: string | number | TrackingLinkQuality | null;
    waypoints?: number[][] | null;
    track?: number[][] | null;
}

/**
 * Customer order summary (5 Shopee status groups) and simulated UAV flight tracking APIs
 * per docs/overnight/CONTRACT.md §2 (`OrderTrackingResponse`).
 */
export const ordersService = {
    summary: (signal?: AbortSignal) =>
        apiClient.get<CustomerOrderSummary>(API_ROUTES.orders.summary, {signal}),
    tracking: (id: number | string, signal?: AbortSignal) =>
        apiClient.get<MobileOrderTrackingSnapshot>(API_ROUTES.orders.tracking(id), {signal}),
};
