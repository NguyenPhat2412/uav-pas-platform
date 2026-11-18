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
        WebSocketSession providerWs = openSocket("ws-provider");
        WebSocketSession strangerWs = openSocket("ws-stranger");
        WebSocketSession adminWs = openSocket("ws-admin");

        broadcaster.register(
                customerWs,
                new RealtimeSessionPrincipal(101L, "buyer_a", false, false, false, null));
        broadcaster.register(
                providerWs,
                new RealtimeSessionPrincipal(202L, "fleet_b", false, false, false, null));
        broadcaster.register(
                strangerWs,
                new RealtimeSessionPrincipal(999L, "stranger", false, false, false, null));
        broadcaster.register(
                adminWs, new RealtimeSessionPrincipal(1L, "mkt_admin", false, false, true, null));

        broadcaster.publishOrderUpdated(555L, "IN_PROGRESS", "IN_FLIGHT", 101L, 202L, 202L);

        ArgumentCaptor<TextMessage> frameCaptor = ArgumentCaptor.forClass(TextMessage.class);
        verify(customerWs, times(1)).sendMessage(frameCaptor.capture());
        verify(providerWs, times(1)).sendMessage(any(TextMessage.class));
        verify(adminWs, times(1)).sendMessage(any(TextMessage.class));
        verify(strangerWs, never()).sendMessage(any(TextMessage.class));

        String payload = frameCaptor.getValue().getPayload();
        assertTrue(payload.contains("\"type\":\"ORDER_UPDATED\""));
        assertTrue(payload.contains("\"missionId\":555"));
        assertTrue(payload.contains("\"statusGroup\":\"IN_FLIGHT\""));
        assertEquals(4, broadcaster.activeSessionCount());
    }

    private static WebSocketSession openSocket(String id) {
        WebSocketSession ws = mock(WebSocketSession.class);
        when(ws.getId()).thenReturn(id);
        when(ws.isOpen()).thenReturn(true);
        return ws;
    }
}
