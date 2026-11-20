package com.uav.platform.transport.websocket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.uav.platform.dto.record.realtime.RealtimeSessionPrincipal;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

class RealtimeOrderBroadcastTest {

    @Test
    void publishOrderUpdatedOnlyReachesCustomerAssignedFleetOperatorAndMarketplaceAdmin()
            throws Exception {
        RealtimeEventBroadcaster broadcaster = new RealtimeEventBroadcaster();

        WebSocketSession customerWs = openSocket("ws-customer");
        WebSocketSession fleetOwnerWs = openSocket("ws-fleet-owner");
        WebSocketSession assignedPilotWs = openSocket("ws-assigned-pilot");
        WebSocketSession otherFleetWs = openSocket("ws-other-fleet");
        WebSocketSession strangerCustomerWs = openSocket("ws-stranger");
        WebSocketSession supportAgentWs = openSocket("ws-support-only");
        WebSocketSession marketplaceAdminWs = openSocket("ws-mkt-admin");

        broadcaster.register(
                customerWs,
                new RealtimeSessionPrincipal(101L, "buyer_a", false, false, false, null));
        broadcaster.register(
                fleetOwnerWs,
                new RealtimeSessionPrincipal(202L, "fleet_owner_b", false, false, false, null));
        broadcaster.register(
                assignedPilotWs,
                new RealtimeSessionPrincipal(203L, "pilot_b1", false, false, false, null));
        broadcaster.register(
                otherFleetWs,
                new RealtimeSessionPrincipal(303L, "fleet_c", false, false, false, null));
        broadcaster.register(
                strangerCustomerWs,
                new RealtimeSessionPrincipal(999L, "stranger", false, false, false, null));
        // Staff with support/telemetry rights ONLY (not MARKETPLACE_MODERATE) must NOT receive
        // marketplace order updates of unrelated customers.
        broadcaster.register(
                supportAgentWs,
                new RealtimeSessionPrincipal(50L, "support_staff", true, true, false, null));
        broadcaster.register(
                marketplaceAdminWs,
                new RealtimeSessionPrincipal(1L, "mkt_admin", false, false, true, null));

        broadcaster.publishOrderUpdated(555L, "IN_PROGRESS", "IN_FLIGHT", 101L, 202L, 203L);

        ArgumentCaptor<TextMessage> frameCaptor = ArgumentCaptor.forClass(TextMessage.class);
        verify(customerWs, times(1)).sendMessage(frameCaptor.capture());
        verify(fleetOwnerWs, times(1)).sendMessage(any(TextMessage.class));
        verify(assignedPilotWs, times(1)).sendMessage(any(TextMessage.class));
        verify(marketplaceAdminWs, times(1)).sendMessage(any(TextMessage.class));

        verify(otherFleetWs, never()).sendMessage(any(TextMessage.class));
        verify(strangerCustomerWs, never()).sendMessage(any(TextMessage.class));
        verify(supportAgentWs, never()).sendMessage(any(TextMessage.class));

        String payload = frameCaptor.getValue().getPayload();
        assertTrue(payload.contains("\"type\":\"ORDER_UPDATED\""));
        assertTrue(payload.contains("\"missionId\":555"));
        assertTrue(payload.contains("\"status\":\"IN_PROGRESS\""));
        assertTrue(payload.contains("\"statusGroup\":\"IN_FLIGHT\""));
        assertEquals(7, broadcaster.activeSessionCount());
    }

    @Test
    void pendingDispatchBeforeFleetAssignmentOnlyReachesCustomerAndMarketplaceAdmin()
            throws Exception {
        RealtimeEventBroadcaster broadcaster = new RealtimeEventBroadcaster();

        WebSocketSession customerWs = openSocket("ws-customer-pending");
        WebSocketSession fleetWs = openSocket("ws-unassigned-fleet");
        WebSocketSession adminWs = openSocket("ws-admin-pending");
        WebSocketSession closedCustomerWs = mock(WebSocketSession.class);
        when(closedCustomerWs.getId()).thenReturn("ws-closed");
        when(closedCustomerWs.isOpen()).thenReturn(false);

        broadcaster.register(
                customerWs,
                new RealtimeSessionPrincipal(101L, "buyer_a", false, false, false, null));
        broadcaster.register(
                closedCustomerWs,
                new RealtimeSessionPrincipal(101L, "buyer_a", false, false, false, null));
        broadcaster.register(
                fleetWs, new RealtimeSessionPrincipal(202L, "fleet_b", false, false, false, null));
        broadcaster.register(
                adminWs, new RealtimeSessionPrincipal(1L, "mkt_admin", false, false, true, null));

        broadcaster.publishOrderUpdated(777L, "PENDING_CONFIRMATION", "PENDING", 101L, null, null);

        verify(customerWs, times(1)).sendMessage(any(TextMessage.class));
        verify(adminWs, times(1)).sendMessage(any(TextMessage.class));
        verify(fleetWs, never()).sendMessage(any(TextMessage.class));
        verify(closedCustomerWs, never()).sendMessage(any(TextMessage.class));
        // Closed session is evicted automatically during broadcast
        assertEquals(3, broadcaster.activeSessionCount());
    }

    private static WebSocketSession openSocket(String id) {
        WebSocketSession ws = mock(WebSocketSession.class);
        when(ws.getId()).thenReturn(id);
        when(ws.isOpen()).thenReturn(true);
        return ws;
    }
}
