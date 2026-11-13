package com.uav.platform.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.uav.platform.dto.record.realtime.RealtimeSessionPrincipal;
import com.uav.platform.dto.response.support.PublicSupportThreadSessionResponse;
import com.uav.platform.dto.response.support.SupportAdminSummaryResponse;
import com.uav.platform.dto.response.support.SupportThreadResponse;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Predicate;

/**
 * Thread-safe WebSocket session registry and post-commit event dispatcher for live customer support
 * and instant billing/payment updates.
 */
@Slf4j
@Service
public class RealtimeEventBroadcaster {

    private static final int SEND_TIME_LIMIT_MS = 5_000;
    private static final int BUFFER_SIZE_LIMIT_BYTES = 256 * 1024;
    private static final int MAX_VISITOR_TOKENS_PER_SESSION = 6;

    private final ObjectMapper json;
    private final Map<String, SessionSlot> sessions = new ConcurrentHashMap<>();

    public RealtimeEventBroadcaster() {
        this(null);
    }

    @Autowired
    public RealtimeEventBroadcaster(@Autowired(required = false) ObjectMapper objectMapper) {
        ObjectMapper base = objectMapper != null ? objectMapper.copy() : new ObjectMapper();
        this.json =
                base.findAndRegisterModules()
                        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    public static final class SessionSlot {
        private final WebSocketSession session;
        private final RealtimeSessionPrincipal principal;
        private final Set<String> visitorTokens = ConcurrentHashMap.newKeySet();

        SessionSlot(WebSocketSession rawSession, RealtimeSessionPrincipal principal) {
            this.session =
                    new ConcurrentWebSocketSessionDecorator(
                            rawSession, SEND_TIME_LIMIT_MS, BUFFER_SIZE_LIMIT_BYTES);
            this.principal = principal;
            if (principal.initialVisitorToken() != null
                    && !principal.initialVisitorToken().isBlank()) {
                this.visitorTokens.add(principal.initialVisitorToken().trim());
            }
        }

        public RealtimeSessionPrincipal principal() {
            return principal;
        }

        public boolean hasVisitorToken(String token) {
            return token != null && visitorTokens.contains(token);
        }

        boolean addVisitorToken(String token) {
            if (token == null || token.isBlank()) {
                return false;
            }
            if (visitorTokens.size() >= MAX_VISITOR_TOKENS_PER_SESSION
                    && !visitorTokens.contains(token)) {
                return false;
            }
            visitorTokens.add(token.trim());
            return true;
        }
    }

    public SessionSlot register(WebSocketSession rawSession, RealtimeSessionPrincipal principal) {
        SessionSlot slot = new SessionSlot(rawSession, principal);
        sessions.put(rawSession.getId(), slot);
        return slot;
    }

    public void unregister(String sessionId) {
        if (sessionId != null) {
            sessions.remove(sessionId);
        }
    }

    public SessionSlot findSlot(String sessionId) {
        return sessionId != null ? sessions.get(sessionId) : null;
    }

    public boolean subscribeVisitorToken(String sessionId, String visitorToken) {
        SessionSlot slot = findSlot(sessionId);
        return slot != null && slot.addVisitorToken(visitorToken);
    }

    public int activeSessionCount() {
        return sessions.size();
    }

    public void sendDirect(WebSocketSession target, Map<String, Object> payload) {
        SessionSlot slot = sessions.get(target.getId());
        WebSocketSession safeSession = slot != null ? slot.session : target;
        sendFrame(target.getId(), safeSession, serialize(payload));
    }

    public void publishSupportThreadUpdated(
            String visitorToken,
            PublicSupportThreadSessionResponse visitorSession,
            SupportThreadResponse adminThread,
            SupportAdminSummaryResponse summary) {
        runAfterCommit(
                () -> {
                    String now = Instant.now().toString();
                    if (visitorToken != null && !visitorToken.isBlank() && visitorSession != null) {
                        Map<String, Object> visitorFrame = new LinkedHashMap<>();
                        visitorFrame.put("type", "SUPPORT_THREAD_UPDATED");
                        visitorFrame.put("timestamp", now);
                        visitorFrame.put("session", visitorSession);
                        broadcastMatching(slot -> slot.hasVisitorToken(visitorToken), visitorFrame);
                    }

                    Map<String, Object> adminFrame = new LinkedHashMap<>();
                    adminFrame.put("type", "ADMIN_SUPPORT_UPDATED");
                    adminFrame.put("timestamp", now);
                    adminFrame.put("thread", adminThread);
                    if (visitorSession != null) {
                        adminFrame.put("messages", visitorSession.messages());
                    }
                    if (summary != null) {
                        adminFrame.put("summary", summary);
                    }
                    broadcastMatching(slot -> slot.principal().canAdminSupport(), adminFrame);
                });
    }

    public void publishSupportSummaryUpdated(SupportAdminSummaryResponse summary) {
        if (summary == null) {
            return;
        }
        runAfterCommit(
                () -> {
                    Map<String, Object> frame = new LinkedHashMap<>();
                    frame.put("type", "SUPPORT_SUMMARY_UPDATED");
                    frame.put("timestamp", Instant.now().toString());
                    frame.put("summary", summary);
                    broadcastMatching(slot -> slot.principal().canAdminSupport(), frame);
                });
    }

    public void publishSupportThreadDeleted(
            Long threadId, String visitorToken, SupportAdminSummaryResponse summary) {
        runAfterCommit(
                () -> {
                    String now = Instant.now().toString();
                    if (visitorToken != null && !visitorToken.isBlank()) {
                        Map<String, Object> visitorFrame = new LinkedHashMap<>();
                        visitorFrame.put("type", "SUPPORT_THREAD_DELETED");
                        visitorFrame.put("timestamp", now);
                        visitorFrame.put("threadId", threadId);
                        broadcastMatching(slot -> slot.hasVisitorToken(visitorToken), visitorFrame);
                    }

                    Map<String, Object> adminFrame = new LinkedHashMap<>();
                    adminFrame.put("type", "SUPPORT_THREAD_DELETED");
                    adminFrame.put("timestamp", now);
                    adminFrame.put("threadId", threadId);
                    if (summary != null) {
                        adminFrame.put("summary", summary);
                    }
                    broadcastMatching(slot -> slot.principal().canAdminSupport(), adminFrame);
                });
    }

    public void publishVisitorTyping(Long threadId, String senderName, boolean typing) {
        Map<String, Object> frame = new LinkedHashMap<>();
        frame.put("type", "SUPPORT_VISITOR_TYPING");
        frame.put("timestamp", Instant.now().toString());
        frame.put("threadId", threadId);
        frame.put("senderName", senderName);
        frame.put("typing", typing);
        broadcastMatching(slot -> slot.principal().canAdminSupport(), frame);
    }

    public void publishAdminTyping(
            String visitorToken, Long threadId, String adminUsername, boolean typing) {
        if (visitorToken == null || visitorToken.isBlank()) {
            return;
        }
        Map<String, Object> frame = new LinkedHashMap<>();
        frame.put("type", "SUPPORT_ADMIN_TYPING");
        frame.put("timestamp", Instant.now().toString());
        frame.put("threadId", threadId);
        frame.put("senderName", adminUsername);
        frame.put("typing", typing);
        broadcastMatching(slot -> slot.hasVisitorToken(visitorToken), frame);
    }

    public void publishInvoiceUpdated(
            Long customerUserId, Long invoiceId, String invoiceCode, String status) {
        runAfterCommit(
                () -> {
                    Map<String, Object> frame = new LinkedHashMap<>();
                    frame.put("type", "INVOICE_UPDATED");
                    frame.put("timestamp", Instant.now().toString());
                    frame.put("invoiceId", invoiceId);
                    frame.put("invoiceCode", invoiceCode);
                    frame.put("status", status);
                    broadcastMatching(
                            slot ->
                                    (customerUserId != null
                                                    && customerUserId.equals(
                                                            slot.principal().userId()))
                                            || slot.principal().canManageBilling(),
                            frame);
                });
    }

    /**
     * A new in-app notification, pushed after commit to the recipient's own sockets only (web tabs
     * and phones signed in as that user), with the fresh unread count for the bell.
     */
    public void publishNotificationCreated(
            Long recipientUserId, Object notification, long unreadCount) {
        if (recipientUserId == null) {
            return;
        }
        runAfterCommit(
                () -> {
                    Map<String, Object> frame = new LinkedHashMap<>();
                    frame.put("type", "NOTIFICATION_CREATED");
                    frame.put("timestamp", Instant.now().toString());
                    frame.put("notification", notification);
                    frame.put("unreadCount", unreadCount);
                    broadcastMatching(
                            slot -> recipientUserId.equals(slot.principal().userId()), frame);
                });
    }

    private void runAfterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(
                    new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            action.run();
                        }
                    });
        } else {
            action.run();
        }
    }

    private void broadcastMatching(Predicate<SessionSlot> filter, Map<String, Object> payload) {
        if (sessions.isEmpty()) {
            return;
        }
        TextMessage message = serialize(payload);
        if (message == null) {
            return;
        }
        for (Map.Entry<String, SessionSlot> entry : sessions.entrySet()) {
            SessionSlot slot = entry.getValue();
            if (slot != null && filter.test(slot)) {
                sendFrame(entry.getKey(), slot.session, message);
            }
        }
    }

    private TextMessage serialize(Map<String, Object> payload) {
        try {
            return new TextMessage(json.writeValueAsString(payload));
        } catch (Exception ex) {
            log.warn(
                    "Failed to serialize WebSocket frame {}: {}",
                    payload.get("type"),
                    ex.getMessage());
            return null;
        }
    }

    private void sendFrame(String sessionId, WebSocketSession session, TextMessage message) {
        if (message == null || session == null) {
            return;
        }
        if (!session.isOpen()) {
            sessions.remove(sessionId);
            return;
        }
        try {
            session.sendMessage(message);
        } catch (Exception ex) {
            sessions.remove(sessionId);
            log.debug(
                    "Removed closed/faulted WebSocket session {}: {}", sessionId, ex.getMessage());
        }
    }
}
