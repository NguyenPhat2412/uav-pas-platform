package com.uav.platform.transport.websocket;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.dto.record.realtime.RealtimeSessionPrincipal;
import com.uav.platform.dto.response.support.PublicSupportThreadSessionResponse;
import com.uav.platform.dto.response.support.SupportAdminSummaryResponse;
import com.uav.platform.dto.response.support.SupportMessageResponse;
import com.uav.platform.dto.response.support.SupportThreadResponse;
import com.uav.platform.entity.support.SupportThread;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.repository.support.SupportThreadRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.permission.PermissionService;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.http.server.ServletServerHttpResponse;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

class RealtimeWebSocketHandlerTest {

    private final ObjectMapper json = new ObjectMapper().findAndRegisterModules();
    private UserRepository userRepository;
    private PermissionService permissionService;
    private SupportThreadRepository supportThreadRepository;
    private RealtimeHandshakeInterceptor interceptor;
    private RealtimeEventBroadcaster broadcaster;
    private RealtimeWebSocketHandler handler;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        permissionService = mock(PermissionService.class);
        supportThreadRepository = mock(SupportThreadRepository.class);
        interceptor =
                new RealtimeHandshakeInterceptor(
                        userRepository, permissionService, supportThreadRepository);
        broadcaster = new RealtimeEventBroadcaster(json);
        handler = new RealtimeWebSocketHandler(broadcaster, supportThreadRepository, json);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void handshakeRejectsUnauthenticatedCallerWithoutValidVisitorToken() {
        MockHttpServletRequest rawReq = new MockHttpServletRequest("GET", "/api/v1/ws/realtime");
        MockHttpServletResponse rawRes = new MockHttpServletResponse();
        Map<String, Object> attrs = new HashMap<>();

        boolean allowed =
                interceptor.beforeHandshake(
                        new ServletServerHttpRequest(rawReq),
                        new ServletServerHttpResponse(rawRes),
                        handler,
                        attrs);

        assertFalse(allowed);
        assertEquals(HttpStatus.UNAUTHORIZED.value(), rawRes.getStatus());
        assertTrue(attrs.isEmpty());
    }

    @Test
    void handshakeAcceptsValidVisitorTokenForPublicSupportSession() {
        SupportThread thread = new SupportThread();
        thread.setId(42L);
        thread.setVisitorToken("tok_valid_123");
        when(supportThreadRepository.findByVisitorToken("tok_valid_123"))
                .thenReturn(Optional.of(thread));

        MockHttpServletRequest rawReq = new MockHttpServletRequest("GET", "/api/v1/ws/realtime");
        rawReq.setParameter("visitorToken", "tok_valid_123");
        MockHttpServletResponse rawRes = new MockHttpServletResponse();
        Map<String, Object> attrs = new HashMap<>();

        boolean allowed =
                interceptor.beforeHandshake(
                        new ServletServerHttpRequest(rawReq),
                        new ServletServerHttpResponse(rawRes),
                        handler,
                        attrs);

        assertTrue(allowed);
        RealtimeSessionPrincipal principal =
                (RealtimeSessionPrincipal) attrs.get(RealtimeSessionPrincipal.ATTRIBUTE_KEY);
        assertNotNull(principal);
        assertNull(principal.userId());
        assertFalse(principal.canAdminSupport());
        assertEquals("tok_valid_123", principal.initialVisitorToken());
    }

    @Test
    void handshakeResolvesAdminCapabilitiesForAuthenticatedActiveUser() {
        AppUser admin = new AppUser();
        admin.setId(1L);
        admin.setUsername("admin");
        admin.setStatus(UserStatus.ACTIVE);
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(admin));

        var auth = UsernamePasswordAuthenticationToken.authenticated("admin", null, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
        when(permissionService.has(auth, "SUPPORT_MANAGE")).thenReturn(true);
        when(permissionService.has(auth, "USER_MANAGE")).thenReturn(true);

        MockHttpServletRequest rawReq = new MockHttpServletRequest("GET", "/api/v1/ws/realtime");
        MockHttpServletResponse rawRes = new MockHttpServletResponse();
        Map<String, Object> attrs = new HashMap<>();

        assertTrue(
                interceptor.beforeHandshake(
                        new ServletServerHttpRequest(rawReq),
                        new ServletServerHttpResponse(rawRes),
                        handler,
                        attrs));
        RealtimeSessionPrincipal principal =
                (RealtimeSessionPrincipal) attrs.get(RealtimeSessionPrincipal.ATTRIBUTE_KEY);
        assertEquals(1L, principal.userId());
        assertTrue(principal.canAdminSupport());
        assertTrue(principal.canManageBilling());
    }

    @Test
    void customerWithDashboardViewIsNotSupportStaff() {
        // Customers hold DASHBOARD_VIEW by default; it must not open the staff support feed.
        AppUser customer = new AppUser();
        customer.setId(7L);
        customer.setUsername("pilot");
        customer.setStatus(UserStatus.ACTIVE);
        when(userRepository.findByUsername("pilot")).thenReturn(Optional.of(customer));
        var auth = UsernamePasswordAuthenticationToken.authenticated("pilot", null, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
        when(permissionService.has(auth, "DASHBOARD_VIEW")).thenReturn(true);

        Map<String, Object> attrs = new HashMap<>();
        assertTrue(
                interceptor.beforeHandshake(
                        new ServletServerHttpRequest(
                                new MockHttpServletRequest("GET", "/api/v1/ws/realtime")),
                        new ServletServerHttpResponse(new MockHttpServletResponse()),
                        handler,
                        attrs));
        RealtimeSessionPrincipal principal =
                (RealtimeSessionPrincipal) attrs.get(RealtimeSessionPrincipal.ATTRIBUTE_KEY);
        assertEquals(7L, principal.userId());
        assertFalse(principal.canAdminSupport());
        assertFalse(principal.canManageBilling());
    }

    @Test
    void supportAndBillingEventsRouteStrictlyToAuthorizedRecipients() throws Exception {
        WebSocketSession visitorSession =
                openSession(
                        "s-visitor",
                        new RealtimeSessionPrincipal(null, null, false, false, "tok_abc"));
        WebSocketSession customerSession =
                openSession(
                        "s-customer",
                        new RealtimeSessionPrincipal(99L, "cust1", false, false, null));
        WebSocketSession strangerSession =
                openSession(
                        "s-stranger",
                        new RealtimeSessionPrincipal(200L, "cust2", false, false, null));
        WebSocketSession adminSession =
                openSession("s-admin", new RealtimeSessionPrincipal(1L, "admin", true, true, null));

        handler.afterConnectionEstablished(visitorSession);
        handler.afterConnectionEstablished(customerSession);
        handler.afterConnectionEstablished(strangerSession);
        handler.afterConnectionEstablished(adminSession);

        clearInvocations(visitorSession, customerSession, strangerSession, adminSession);

        LocalDateTime now = LocalDateTime.of(2026, 11, 12, 23, 45);
        PublicSupportThreadSessionResponse pubSnap =
                new PublicSupportThreadSessionResponse(
                        15L,
                        "SUP-20261112-ABCD",
                        "tok_abc",
                        "Nguyen Van A",
                        "UAV Corp",
                        "a@example.com",
                        "BILLING_PLAN",
                        "IN_PROGRESS",
                        1,
                        now,
                        now,
                        List.of(
                                new SupportMessageResponse(
                                        1L, "ADMIN", "Admin", "Đã hỗ trợ đối soát", now)));
        SupportThreadResponse adminThread =
                new SupportThreadResponse(
                        15L,
                        "SUP-20261112-ABCD",
                        "Nguyen Van A",
                        "UAV Corp",
                        "a@example.com",
                        "BILLING_PLAN",
                        "CUSTOMER_PORTAL",
                        "IN_PROGRESS",
                        0,
                        1,
                        "Đã hỗ trợ đối soát",
                        "ADMIN",
                        "admin",
                        1L,
                        now,
                        now);
        SupportAdminSummaryResponse summary = new SupportAdminSummaryResponse(3, 1, 1, 1, 0, 0);

        broadcaster.publishSupportThreadUpdated("tok_abc", pubSnap, adminThread, summary);

        JsonNode visitorFrame = lastSentJson(visitorSession);
        assertEquals("SUPPORT_THREAD_UPDATED", visitorFrame.path("type").asText());
        assertEquals("SUP-20261112-ABCD", visitorFrame.path("session").path("code").asText());

        JsonNode adminFrame = lastSentJson(adminSession);
        assertEquals("ADMIN_SUPPORT_UPDATED", adminFrame.path("type").asText());
        assertEquals("CUSTOMER_PORTAL", adminFrame.path("thread").path("source").asText());

        verify(customerSession, never()).sendMessage(any());
        verify(strangerSession, never()).sendMessage(any());

        clearInvocations(visitorSession, customerSession, strangerSession, adminSession);

        broadcaster.publishInvoiceUpdated(99L, 501L, "INV-20261112-XYZ123", "PAID");

        JsonNode custInvoice = lastSentJson(customerSession);
        assertEquals("INVOICE_UPDATED", custInvoice.path("type").asText());
        assertEquals(501L, custInvoice.path("invoiceId").asLong());
        assertEquals("PAID", custInvoice.path("status").asText());

        JsonNode adminInvoice = lastSentJson(adminSession);
        assertEquals("INVOICE_UPDATED", adminInvoice.path("type").asText());

        verify(visitorSession, never()).sendMessage(any());
        verify(strangerSession, never()).sendMessage(any());

        handler.afterConnectionClosed(visitorSession, CloseStatus.NORMAL);
        assertEquals(3, broadcaster.activeSessionCount());
    }

    @Test
    void typingAndPingFramesPropagateBetweenVisitorAndAdmin() throws Exception {
        SupportThread thread = new SupportThread();
        thread.setId(88L);
        thread.setVisitorToken("tok_live_88");
        thread.setFullName("Khach Hang VIP");
        when(supportThreadRepository.findByVisitorToken("tok_live_88"))
                .thenReturn(Optional.of(thread));
        when(supportThreadRepository.findById(88L)).thenReturn(Optional.of(thread));

        WebSocketSession customerWs =
                openSession("s-cust", new RealtimeSessionPrincipal(10L, "vip", false, false, null));
        WebSocketSession adminWs =
                openSession("s-adm", new RealtimeSessionPrincipal(1L, "admin", true, true, null));

        handler.afterConnectionEstablished(customerWs);
        handler.afterConnectionEstablished(adminWs);
        clearInvocations(customerWs, adminWs);

        handler.handleTextMessage(customerWs, new TextMessage("{\"type\":\"PING\"}"));
        assertEquals("PONG", lastSentJson(customerWs).path("type").asText());
        clearInvocations(customerWs);

        handler.handleTextMessage(
                customerWs,
                new TextMessage(
                        "{\"type\":\"SUBSCRIBE_VISITOR\",\"visitorToken\":\"tok_live_88\"}"));
        assertEquals("SUBSCRIBED_VISITOR", lastSentJson(customerWs).path("type").asText());
        clearInvocations(customerWs, adminWs);

        handler.handleTextMessage(
                customerWs,
                new TextMessage(
                        "{\"type\":\"VISITOR_TYPING\",\"visitorToken\":\"tok_live_88\",\"typing\":true}"));
        JsonNode adminReceived = lastSentJson(adminWs);
        assertEquals("SUPPORT_VISITOR_TYPING", adminReceived.path("type").asText());
        assertEquals(88L, adminReceived.path("threadId").asLong());
        assertTrue(adminReceived.path("typing").asBoolean());

        clearInvocations(customerWs, adminWs);

        handler.handleTextMessage(
                adminWs,
                new TextMessage("{\"type\":\"ADMIN_TYPING\",\"threadId\":88,\"typing\":true}"));
        JsonNode visitorReceived = lastSentJson(customerWs);
        assertEquals("SUPPORT_ADMIN_TYPING", visitorReceived.path("type").asText());
        assertEquals("admin", visitorReceived.path("senderName").asText());
        assertTrue(visitorReceived.path("typing").asBoolean());
    }

    @Test
    void notificationReachesOnlyTheRecipientsOwnSockets() throws Exception {
        WebSocketSession recipient =
                openSession("r", new RealtimeSessionPrincipal(7L, "pilot", false, false, null));
        WebSocketSession otherCustomer =
                openSession("o", new RealtimeSessionPrincipal(8L, "other", false, false, null));
        WebSocketSession staff =
                openSession("s", new RealtimeSessionPrincipal(1L, "admin", true, true, null));
        for (WebSocketSession ws : List.of(recipient, otherCustomer, staff))
            handler.afterConnectionEstablished(ws);
        clearInvocations(recipient, otherCustomer, staff);

        broadcaster.publishNotificationCreated(
                7L, Map.of("id", 42, "title", "Nhiệm vụ đã xác nhận"), 3);

        JsonNode frame = lastSentJson(recipient);
        assertEquals("NOTIFICATION_CREATED", frame.path("type").asText());
        assertEquals(42, frame.path("notification").path("id").asInt());
        assertEquals(3, frame.path("unreadCount").asInt());
        verify(otherCustomer, never()).sendMessage(any());
        verify(staff, never()).sendMessage(any());
    }

    private WebSocketSession openSession(String id, RealtimeSessionPrincipal principal) {
        WebSocketSession ws = mock(WebSocketSession.class);
        Map<String, Object> attrs = new HashMap<>();
        attrs.put(RealtimeSessionPrincipal.ATTRIBUTE_KEY, principal);
        when(ws.getId()).thenReturn(id);
        when(ws.isOpen()).thenReturn(true);
        when(ws.getAttributes()).thenReturn(attrs);
        return ws;
    }

    private JsonNode lastSentJson(WebSocketSession ws) throws Exception {
        ArgumentCaptor<TextMessage> captor = ArgumentCaptor.forClass(TextMessage.class);
        verify(ws, atLeastOnce()).sendMessage(captor.capture());
        List<TextMessage> all = captor.getAllValues();
        return json.readTree(all.get(all.size() - 1).getPayload());
    }
}
