import React from 'react';
import {OrderTrackingScreen} from '@/components/order/OrderTrackingScreen';

/**
 * Customer simulated UAV flight & delivery milestone tracking route (`/customer/orders/[id]/tracking`).
 *
 * Synced live via `ORDER_UPDATED` WebSocket frames on `/api/v1/ws/realtime`
 * with 4s polling fallback against `GET /api/v1/orders/{id}/tracking`.
 *
 * Renders Apple Map with simulated UAV position, telemetry stat tiles,
 * and a vertical Shopee-style 5-milestone order timeline.
 *
 * Thin route boundary maintained per mobile architecture guard.
 */
export default function OrderTrackingRoute() {
    return <OrderTrackingScreen/>;
}
