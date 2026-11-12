package com.uav.platform.controller.support;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.uav.platform.dto.request.notification.CreateNotificationRequest;
import com.uav.platform.entity.support.SupportMessage;
import com.uav.platform.entity.support.SupportQuickReply;
import com.uav.platform.entity.support.SupportThread;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.notification.NotificationType;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.error.GlobalExceptionHandler;
import com.uav.platform.repository.support.SupportMessageRepository;
import com.uav.platform.repository.support.SupportQuickReplyRepository;
import com.uav.platform.repository.support.SupportThreadRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.impl.support.SupportServiceImpl;
import com.uav.platform.service.notification.NotificationService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

class SupportControllerAndServiceTest {

    private SupportThreadRepository threads;
    private SupportMessageRepository messages;
    private SupportQuickReplyRepository quickReplies;
    private UserRepository users;
    private NotificationService notifications;
    private MockMvc mvc;

    private final Map<Long, SupportThread> threadStore = new LinkedHashMap<>();
    private final List<SupportMessage> messageStore = new ArrayList<>();
    private final Map<Long, SupportQuickReply> quickReplyStore = new LinkedHashMap<>();
    private final AtomicLong seq = new AtomicLong(100);

    @BeforeEach
    void setUp() {
        threads = mock(SupportThreadRepository.class);
        messages = mock(SupportMessageRepository.class);
        quickReplies = mock(SupportQuickReplyRepository.class);
        users = mock(UserRepository.class);
        notifications = mock(NotificationService.class);

        when(threads.save(any()))
                .thenAnswer(
                        call -> {
                            SupportThread t = call.getArgument(0);
                            if (t.getId() == null) t.setId(seq.incrementAndGet());
                            threadStore.put(t.getId(), t);
                            return t;
                        });
        when(threads.findById(anyLong()))
                .thenAnswer(call -> Optional.ofNullable(threadStore.get(call.getArgument(0))));
        when(threads.findByVisitorToken(anyString()))
                .thenAnswer(
                        call -> {
                            String tok = call.getArgument(0);
                            return threadStore.values().stream()
                                    .filter(t -> tok.equals(t.getVisitorToken()))
                                    .findFirst();
                        });
        doAnswer(
                        call -> {
                            SupportThread t = call.getArgument(0);
                            threadStore.remove(t.getId());
                            return null;
                        })
                .when(threads)
                .delete(any(SupportThread.class));

        when(messages.save(any()))
                .thenAnswer(
                        call -> {
                            SupportMessage m = call.getArgument(0);
                            if (m.getId() == null) m.setId(seq.incrementAndGet());
                            messageStore.add(m);
                            return m;
                        });
        when(messages.findByThreadIdOrderByCreatedAtAscIdAsc(anyLong()))
                .thenAnswer(
                        call -> {
                            Long tid = call.getArgument(0);
                            return messageStore.stream()
                                    .filter(m -> tid.equals(m.getThreadId()))
                                    .toList();
                        });
        when(messages.countByThreadId(anyLong()))
                .thenAnswer(
                        call -> {
                            Long tid = call.getArgument(0);
                            return messageStore.stream()
                                    .filter(m -> tid.equals(m.getThreadId()))
                                    .count();
                        });

        when(quickReplies.save(any()))
                .thenAnswer(
                        call -> {
                            SupportQuickReply r = call.getArgument(0);
                            if (r.getId() == null) r.setId(seq.incrementAndGet());
                            quickReplyStore.put(r.getId(), r);
                            return r;
                        });
        when(quickReplies.findById(anyLong()))
                .thenAnswer(call -> Optional.ofNullable(quickReplyStore.get(call.getArgument(0))));
        when(quickReplies.findAllByOrderBySortOrderAscIdAsc())
                .thenAnswer(call -> List.copyOf(quickReplyStore.values()));

        SupportServiceImpl service =
                new SupportServiceImpl(threads, messages, quickReplies, users, notifications);
        mvc =
                MockMvcBuilders.standaloneSetup(
                                new PublicSupportController(service),
                                new AdminSupportController(service))
                        .setControllerAdvice(new GlobalExceptionHandler())
                        .build();
    }

    @Test
    void twoWayPublicAndAdminChatLifecycleWorksAndSwallowsNotificationErrors() throws Exception {
        AppUser activeAdmin = new AppUser();
        activeAdmin.setId(1L);
        activeAdmin.setUsername("admin");
        activeAdmin.setFullName("Quản trị Điều phối");
        activeAdmin.setRole(UserRole.ROLE_ADMIN);
        activeAdmin.setStatus(UserStatus.ACTIVE);

        AppUser lockedAdmin = new AppUser();
        lockedAdmin.setId(2L);
        lockedAdmin.setUsername("locked_admin");
        lockedAdmin.setRole(UserRole.ROLE_ADMIN);
        lockedAdmin.setStatus(UserStatus.ACTIVE);
        lockedAdmin.setManualLocked(true);

        when(users.findByRole(UserRole.ROLE_ADMIN)).thenReturn(List.of(activeAdmin, lockedAdmin));
        when(users.findByUsername("admin")).thenReturn(Optional.of(activeAdmin));
        when(notifications.sendNotification(any()))
                .thenThrow(new RuntimeException("SMTP down"))
                .thenReturn(null);

        // 1. Visitor creates inquiry thread -> 201 Created even if notification throws
        mvc.perform(
                        post("/api/v1/public/support/threads")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "fullName": "Nguyễn Minh Quân",
                                          "organization": "Viện Đo đạc GIS",
                                          "contactInfo": "0912345678",
                                          "topic": "SURVEY_SERVICE",
                                          "source": "LIVE_WIDGET",
                                          "message": "Cần khảo sát bình đồ 120ha tại Hòa Lạc"
                                        }
                                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.unreadForVisitor").value(0))
                .andExpect(jsonPath("$.messages.length()").value(1))
                .andExpect(jsonPath("$.messages[0].senderRole").value("VISITOR"));

        SupportThread stored = threadStore.values().iterator().next();
        assertTrue(stored.getCode().matches("^SUP-\\d{8}-[0-9A-Z]{4}$"));
        assertTrue(stored.getVisitorToken().matches("^[0-9a-f]{48}$"));
        assertEquals(1, stored.getUnreadForAdmin());

        ArgumentCaptor<CreateNotificationRequest> notifCaptor =
                ArgumentCaptor.forClass(CreateNotificationRequest.class);
        verify(notifications, times(1)).sendNotification(notifCaptor.capture());
        assertEquals(1L, notifCaptor.getValue().userId());
        assertEquals(NotificationType.SYSTEM, notifCaptor.getValue().type());
        assertEquals("SUPPORT", notifCaptor.getValue().referenceType());

        // 2. Admin opens thread detail -> clears unreadForAdmin
        mvc.perform(get("/api/v1/admin/support/threads/" + stored.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.thread.unreadForAdmin").value(0));

        // 3. Admin replies -> transitions OPEN -> IN_PROGRESS and increments unreadForVisitor
        var adminAuth = new UsernamePasswordAuthenticationToken("admin", "n/a", List.of());
        mvc.perform(
                        post("/api/v1/admin/support/threads/" + stored.getId() + "/reply")
                                .principal(adminAuth)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"content\":\"Đội kỹ thuật đã tiếp nhận tọa độ.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.thread.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.thread.unreadForVisitor").value(1))
                .andExpect(jsonPath("$.thread.assignedAdminUsername").value("admin"))
                .andExpect(jsonPath("$.messages[1].senderRole").value("ADMIN"))
                .andExpect(jsonPath("$.messages[1].senderName").value("Quản trị Điều phối"));

        // 4. Visitor polls with markRead=true -> clears unreadForVisitor
        mvc.perform(
                        get("/api/v1/public/support/threads/" + stored.getVisitorToken())
                                .param("markRead", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadForVisitor").value(0))
                .andExpect(jsonPath("$.messages.length()").value(2));

        // 5. Admin marks RESOLVED, then visitor replies -> reopens to OPEN
        mvc.perform(
                        patch("/api/v1/admin/support/threads/" + stored.getId() + "/status")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"status\":\"RESOLVED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"));

        mvc.perform(
                        post("/api/v1/public/support/threads/"
                                        + stored.getVisitorToken()
                                        + "/messages")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"content\":\"Cho tôi bổ sung thêm khu vực số 2\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.messages.length()").value(3));

        // 6. Unknown visitor token -> 404, invalid status -> 400
        mvc.perform(get("/api/v1/public/support/threads/unknown-token"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("SUPPORT_THREAD_NOT_FOUND"));

        mvc.perform(
                        patch("/api/v1/admin/support/threads/" + stored.getId() + "/status")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"status\":\"ARCHIVED\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_SUPPORT_STATUS"));
    }

    @Test
    void quickRepliesAndSummaryEndpointsWorkCleanly() throws Exception {
        var adminAuth = new UsernamePasswordAuthenticationToken("admin", "n/a", List.of());
        mvc.perform(
                        post("/api/v1/admin/support/quick-replies")
                                .principal(adminAuth)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "title": "Chào khách hàng",
                                          "topic": "GENERAL_SUPPORT",
                                          "content": "Xin chào {name}, UAV PAS hỗ trợ ngay!",
                                          "sortOrder": 10
                                        }
                                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Chào khách hàng"))
                .andExpect(jsonPath("$.createdBy").value("admin"));

        Long qrId = quickReplyStore.keySet().iterator().next();
        mvc.perform(get("/api/v1/admin/support/quick-replies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(qrId));

        mvc.perform(delete("/api/v1/admin/support/quick-replies/" + qrId))
                .andExpect(status().isNoContent());

        when(threads.count()).thenReturn(4L);
        when(threads.countByStatus("OPEN")).thenReturn(2L);
        when(threads.countByStatus("IN_PROGRESS")).thenReturn(1L);
        when(threads.countByStatus("RESOLVED")).thenReturn(1L);
        when(threads.countByUnreadForAdminGreaterThan(0)).thenReturn(2L);
        when(threads.sumUnreadForAdmin()).thenReturn(5L);

        mvc.perform(get("/api/v1/admin/support/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalThreads").value(4))
                .andExpect(jsonPath("$.unreadThreads").value(2))
                .andExpect(jsonPath("$.unreadMessages").value(5));
    }
}
