import {apiClient, API_ROUTES} from '@/lib/api/client';
import type {
    CustomerOrderSummary,
    OrderTrackingSnapshot,
} from '@/shared/types/project/project.types';

/**
 * Customer order summary (5 Shopee status groups) and simulated UAV flight tracking APIs
 * per docs/overnight/CONTRACT.md §2.
 */
export const ordersService = {
    summary: (signal?: AbortSignal) =>
        apiClient.get<CustomerOrderSummary>(API_ROUTES.orders.summary, {signal}),
    tracking: (id: number | string, signal?: AbortSignal) =>
        apiClient.get<OrderTrackingSnapshot>(API_ROUTES.orders.tracking(id), {signal}),
};
