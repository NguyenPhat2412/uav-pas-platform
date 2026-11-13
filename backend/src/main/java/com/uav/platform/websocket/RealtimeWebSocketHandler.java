package com.uav.platform.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.dto.record.realtime.RealtimeSessionPrincipal;
import com.uav.platform.entity.support.SupportThread;
import com.uav.platform.repository.support.SupportThreadRepository;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Bidirectional JSON WebSocket handler for live customer support (typing indicators, visitor thread
 * subscriptions) and server-pushed real-time support & payment updates.
 */
@Slf4j
@Component
public class RealtimeWebSocketHandler extends TextWebSocketHandler {

    private static final int MAX_INBOUND_FRAME_LENGTH = 4_096;

    private final RealtimeEventBroadcaster broadcaster;
    private final SupportThreadRepository supportThreadRepository;
    private final ObjectMapper json;

    @Autowired
    public RealtimeWebSocketHandler(
            RealtimeEventBroadcaster broadcaster,
            SupportThreadRepository supportThreadRepository,
            @Autowired(required = false) ObjectMapper objectMapper) {
        this.broadcaster = broadcaster;
        this.supportThreadRepository = supportThreadRepository;
        this.json = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        Object attr = session.getAttributes().get(RealtimeSessionPrincipal.ATTRIBUTE_KEY);
        if (!(attr instanceof RealtimeSessionPrincipal principal)) {
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }
        broadcaster.register(session, principal);

        Map<String, Object> ready = new LinkedHashMap<>();
        ready.put("type", "CONNECTED");
        ready.put("timestamp", Instant.now().toString());
        ready.put("authenticated", principal.userId() != null);
        ready.put("adminSupport", principal.canAdminSupport());
        broadcaster.sendDirect(session, ready);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        String payload = message.getPayload();
        if (payload == null || payload.isBlank() || payload.length() > MAX_INBOUND_FRAME_LENGTH) {
            return;
        }
        RealtimeEventBroadcaster.SessionSlot slot = broadcaster.findSlot(session.getId());
        if (slot == null) {
            return;
        }
        try {
            JsonNode node = json.readTree(payload);
            String type = textOrNull(node, "type");
            if (type == null) {
                return;
            }
            switch (type) {
                case "PING" -> {
                    Map<String, Object> pong = new LinkedHashMap<>();
                    pong.put("type", "PONG");
                    pong.put("timestamp", Instant.now().toString());
                    broadcaster.sendDirect(session, pong);
                }
                case "SUBSCRIBE_VISITOR" -> handleSubscribeVisitor(session, node);
                case "VISITOR_TYPING" -> handleVisitorTyping(slot, node);
                case "ADMIN_TYPING" -> handleAdminTyping(slot, node);
                default -> {
                    // Ignore unknown client frame types safely.
                }
            }
        } catch (Exception ex) {
            log.debug(
                    "Ignored malformed WebSocket frame on {}: {}",
                    session.getId(),
                    ex.getMessage());
        }
    }

    private void handleSubscribeVisitor(WebSocketSession session, JsonNode node) {
        String visitorToken = textOrNull(node, "visitorToken");
        if (visitorToken == null || visitorToken.length() > 64) {
            return;
        }
        if (supportThreadRepository.findByVisitorToken(visitorToken).isEmpty()) {
            return;
        }
        if (broadcaster.subscribeVisitorToken(session.getId(), visitorToken)) {
            Map<String, Object> ack = new LinkedHashMap<>();
            ack.put("type", "SUBSCRIBED_VISITOR");
            ack.put("visitorToken", visitorToken);
            ack.put("timestamp", Instant.now().toString());
            broadcaster.sendDirect(session, ack);
        }
    }

    private void handleVisitorTyping(RealtimeEventBroadcaster.SessionSlot slot, JsonNode node) {
        String visitorToken = textOrNull(node, "visitorToken");
        if (visitorToken == null || !slot.hasVisitorToken(visitorToken)) {
            return;
        }
        boolean typing = node.path("typing").asBoolean(false);
        SupportThread thread =
                supportThreadRepository.findByVisitorToken(visitorToken).orElse(null);
        if (thread != null) {
            broadcaster.publishVisitorTyping(thread.getId(), thread.getFullName(), typing);
        }
    }

    private void handleAdminTyping(RealtimeEventBroadcaster.SessionSlot slot, JsonNode node) {
        if (!slot.principal().canAdminSupport()) {
            return;
        }
        long threadId = node.path("threadId").asLong(-1L);
        if (threadId <= 0) {
            return;
        }
        boolean typing = node.path("typing").asBoolean(false);
        SupportThread thread = supportThreadRepository.findById(threadId).orElse(null);
        if (thread != null) {
            String sender =
                    slot.principal().username() != null ? slot.principal().username() : "ADMIN";
            broadcaster.publishAdminTyping(
                    thread.getVisitorToken(), thread.getId(), sender, typing);
        }
    }

    private static String textOrNull(JsonNode node, String field) {
        JsonNode child = node.get(field);
        if (child == null || !child.isTextual()) {
            return null;
        }
        String trimmed = child.asText().trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        broadcaster.unregister(session.getId());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        broadcaster.unregister(session.getId());
    }
}
