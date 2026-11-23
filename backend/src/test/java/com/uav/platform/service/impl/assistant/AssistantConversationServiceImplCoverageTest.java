package com.uav.platform.service.impl.assistant;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dao.assistant.IAssistantAttachmentDao;
import com.uav.platform.dao.assistant.IAssistantConversationDao;
import com.uav.platform.dao.assistant.IAssistantMessageDao;
import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.dao.user.IUserDao;
import com.uav.platform.dto.record.assistant.ChatImage;
import com.uav.platform.dto.record.assistant.ChatThread;
import com.uav.platform.dto.response.assistant.AssistantChatResponse;
import com.uav.platform.dto.response.assistant.AssistantConversationDetailResponse;
import com.uav.platform.dto.response.assistant.AssistantConversationResponse;
import com.uav.platform.entity.assistant.AssistantAttachment;
import com.uav.platform.entity.assistant.AssistantConversation;
import com.uav.platform.entity.assistant.AssistantMessage;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.error.SystemException;
import com.uav.platform.service.audit.AuditLogService;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@ExtendWith(MockitoExtension.class)
class AssistantConversationServiceImplCoverageTest {

    @Mock private IAssistantConversationDao conversations;
    @Mock private IAssistantMessageDao messages;
    @Mock private IUserDao users;
    @Mock private AuditLogService audit;
    @Mock private IAssistantAttachmentDao attachments;

    @InjectMocks private AssistantConversationServiceImpl service;

    private static Authentication auth(String username) {
        return UsernamePasswordAuthenticationToken.authenticated(username, null, List.of());
    }

    private static AppUser user(Long id, String username, UserRole role) {
        AppUser u = new AppUser();
        u.setId(id);
        u.setUsername(username);
        u.setFullName("Full " + username);
        u.setRole(role);
        return u;
    }

    @Test
    void portalsAndDefaultPortalMatchEveryRole() {
        assertEquals(
                Set.of("ADMIN", "OPERATIONS", "CUSTOMER"),
                AssistantConversationServiceImpl.portalsFor(UserRole.ROLE_ADMIN));
        assertEquals(
                Set.of("OPERATIONS"),
                AssistantConversationServiceImpl.portalsFor(UserRole.ROLE_COMMANDER));
        assertEquals(
                Set.of("OPERATIONS"),
                AssistantConversationServiceImpl.portalsFor(UserRole.ROLE_OPERATOR));
        assertEquals(
                Set.of("CUSTOMER"),
                AssistantConversationServiceImpl.portalsFor(UserRole.ROLE_PILOT));

        assertEquals("ADMIN", AssistantConversationServiceImpl.defaultPortal(UserRole.ROLE_ADMIN));
        assertEquals(
                "OPERATIONS",
                AssistantConversationServiceImpl.defaultPortal(UserRole.ROLE_COMMANDER));
        assertEquals(
                "OPERATIONS",
                AssistantConversationServiceImpl.defaultPortal(UserRole.ROLE_OPERATOR));
        assertEquals(
                "CUSTOMER", AssistantConversationServiceImpl.defaultPortal(UserRole.ROLE_PILOT));
    }

    @Test
    void beginCreatesNewThreadTruncatesTitleAndSavesAttachments() {
        AppUser admin = user(10L, "admin", UserRole.ROLE_ADMIN);
        when(users.findByUsername("admin")).thenReturn(Optional.of(admin));
        when(conversations.save(any(AssistantConversation.class)))
                .thenAnswer(
                        inv -> {
                            AssistantConversation c = inv.getArgument(0);
                            c.setId(99L);
                            return c;
                        });
        when(messages.save(any(AssistantMessage.class)))
                .thenAnswer(
                        inv -> {
                            AssistantMessage m = inv.getArgument(0);
                            m.setId(500L);
                            return m;
                        });

        String longQuestion = "  " + "a".repeat(95) + "\n   extra  ";
        String longName = "n".repeat(200);
        List<ChatImage> imgs =
                List.of(
                        new ChatImage("IMAGE", "image/png", longName, new byte[] {1, 2, 3}),
                        new ChatImage("VIDEO_FRAME", "image/jpeg", null, new byte[] {4, 5}));

        ChatThread thread = service.begin(auth("admin"), "OPERATIONS", null, longQuestion, imgs);

        assertEquals(99L, thread.conversationId());
        assertEquals("OPERATIONS", thread.portal());

        ArgumentCaptor<AssistantConversation> convCap =
                ArgumentCaptor.forClass(AssistantConversation.class);
        verify(conversations).save(convCap.capture());
        assertEquals(
                AssistantConversationServiceImpl.TITLE_LENGTH,
                convCap.getValue().getTitle().length());
        assertTrue(convCap.getValue().getTitle().endsWith("…"));
        assertEquals(1, convCap.getValue().getMessageCount());

        ArgumentCaptor<AssistantAttachment> attCap =
                ArgumentCaptor.forClass(AssistantAttachment.class);
        verify(attachments, times(2)).save(attCap.capture());
        assertEquals(160, attCap.getAllValues().get(0).getName().length());
        assertNull(attCap.getAllValues().get(1).getName());
    }

    @Test
    void beginFallsBackToDefaultPortalAndContinuesExistingOwnedThread() {
        AppUser customer = user(7L, "cust", UserRole.ROLE_PILOT);
        when(users.findByUsername("cust")).thenReturn(Optional.of(customer));
        when(conversations.save(any(AssistantConversation.class)))
                .thenAnswer(
                        inv -> {
                            AssistantConversation c = inv.getArgument(0);
                            if (c.getId() == null) c.setId(11L);
                            return c;
                        });
        when(messages.save(any(AssistantMessage.class)))
                .thenAnswer(
                        inv -> {
                            AssistantMessage m = inv.getArgument(0);
                            m.setId(201L);
                            return m;
                        });

        // Disallowed requested portal "ADMIN" for customer -> falls back to "CUSTOMER", null images
        ChatThread created = service.begin(auth("cust"), "ADMIN", null, "Short question", null);
        assertEquals("CUSTOMER", created.portal());
        verify(attachments, never()).save(any());

        // Existing owned thread
        AssistantConversation existing = new AssistantConversation();
        existing.setId(11L);
        existing.setUserId(7L);
        existing.setPortal("CUSTOMER");
        existing.setMessageCount(2);
        when(conversations.findById(11L)).thenReturn(Optional.of(existing));

        ChatThread continued = service.begin(auth("cust"), null, 11L, "Follow up", List.of());
        assertEquals(11L, continued.conversationId());
        assertEquals(3, existing.getMessageCount());
    }

    @Test
    void beginRejectsUnknownUserAndMissingOrUnownedConversation() {
        when(users.findByUsername("ghost")).thenReturn(Optional.empty());
        assertThrows(
                SystemException.class,
                () -> service.begin(auth("ghost"), "CUSTOMER", null, "hi", List.of()));

        AppUser customer = user(7L, "cust", UserRole.ROLE_PILOT);
        when(users.findByUsername("cust")).thenReturn(Optional.of(customer));

        when(conversations.findById(404L)).thenReturn(Optional.empty());
        assertThrows(
                SystemException.class,
                () -> service.begin(auth("cust"), "CUSTOMER", 404L, "hi", List.of()));

        AssistantConversation other = new AssistantConversation();
        other.setId(403L);
        other.setUserId(999L);
        when(conversations.findById(403L)).thenReturn(Optional.of(other));
        assertThrows(
                SystemException.class,
                () -> service.begin(auth("cust"), "CUSTOMER", 403L, "hi", List.of()));
    }

    @Test
    void recordReplyHandlesMissingAndExistingThreadsWithNullableTokens() {
        when(conversations.findById(1L)).thenReturn(Optional.empty());
        service.recordReply(1L, new AssistantChatResponse("hi", 1, "m1", 50L, 10, 20, 1L));
        verify(messages, never()).save(any());

        AssistantConversation thread = new AssistantConversation();
        thread.setId(2L);
        thread.setMessageCount(1);
        thread.setTotalTokens(100);
        when(conversations.findById(2L)).thenReturn(Optional.of(thread));

        service.recordReply(2L, new AssistantChatResponse("answer", 2, "m2", 120L, 30, 45, 2L));
        assertEquals(2, thread.getMessageCount());
        assertEquals(175, thread.getTotalTokens());

        // Null prompt & completion tokens
        service.recordReply(2L, new AssistantChatResponse("answer2", 1, "m1", 80L, null, null, 2L));
        assertEquals(3, thread.getMessageCount());
        assertEquals(175, thread.getTotalTokens());
        verify(messages, times(2)).save(any(AssistantMessage.class));
        verify(conversations, times(2)).save(thread);
    }

    @Test
    @SuppressWarnings("unchecked")
    void listClampsPageAndSizeAndMapsConversations() {
        AssistantConversation conv = new AssistantConversation();
        conv.setId(5L);
        conv.setUserId(7L);
        conv.setUsername("cust");
        conv.setFullName("Customer A");
        conv.setPortal("CUSTOMER");
        conv.setTitle("Hello");
        conv.setMessageCount(2);
        conv.setTotalTokens(50);
        conv.setCreatedAt(LocalDateTime.now());
        conv.setUpdatedAt(LocalDateTime.now());

        when(conversations.findAll(any(HibernateSpecification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(conv)));

        PageResponse<AssistantConversationResponse> res = service.list("CUSTOMER", "hel", -3, 500);
        assertEquals(1, res.content().size());
        assertEquals(5L, res.content().get(0).id());

        ArgumentCaptor<Pageable> pageCap = ArgumentCaptor.forClass(Pageable.class);
        verify(conversations).findAll(any(HibernateSpecification.class), pageCap.capture());
        assertEquals(0, pageCap.getValue().getPageNumber());
        assertEquals(100, pageCap.getValue().getPageSize());

        service.list(null, null, 1, 0);
        verify(conversations, times(2))
                .findAll(any(HibernateSpecification.class), pageCap.capture());
        assertEquals(1, pageCap.getValue().getPageSize());
    }

    @Test
    void detailReturnsTurnsWithAttachmentsAndHandlesEmptyAndMissing() {
        when(conversations.findById(404L)).thenReturn(Optional.empty());
        assertThrows(SystemException.class, () -> service.detail(404L));

        AssistantConversation conv = new AssistantConversation();
        conv.setId(10L);
        conv.setUserId(1L);
        conv.setUsername("u");
        conv.setPortal("ADMIN");
        conv.setTitle("T");
        when(conversations.findById(10L)).thenReturn(Optional.of(conv));
        when(messages.findByConversationIdOrderByIdAsc(10L)).thenReturn(List.of());

        AssistantConversationDetailResponse emptyDetail = service.detail(10L);
        assertTrue(emptyDetail.messages().isEmpty());
        verify(attachments, never()).findByMessageIdInOrderByIdAsc(any());

        AssistantMessage userMsg = new AssistantMessage();
        userMsg.setId(101L);
        userMsg.setConversationId(10L);
        userMsg.setRole("user");
        userMsg.setContent("Check photo");
        userMsg.setMode(null);

        AssistantMessage botMsg = new AssistantMessage();
        botMsg.setId(102L);
        botMsg.setConversationId(10L);
        botMsg.setRole("assistant");
        botMsg.setContent("Looks good");
        botMsg.setMode((short) 2);
        botMsg.setModel("gpt");

        AssistantAttachment att = new AssistantAttachment();
        att.setId(301L);
        att.setMessageId(101L);
        att.setKind("IMAGE");
        att.setMimeType("image/png");
        att.setName("shot.png");
        att.setSizeBytes(3);
        att.setData(new byte[] {1, 2, 3});

        when(messages.findByConversationIdOrderByIdAsc(10L)).thenReturn(List.of(userMsg, botMsg));
        when(attachments.findByMessageIdInOrderByIdAsc(List.of(101L, 102L)))
                .thenReturn(List.of(att));

        AssistantConversationDetailResponse detail = service.detail(10L);
        assertEquals(2, detail.messages().size());
        assertNull(detail.messages().get(0).mode());
        assertEquals(1, detail.messages().get(0).attachments().size());
        assertTrue(
                detail.messages()
                        .get(0)
                        .attachments()
                        .get(0)
                        .dataUrl()
                        .startsWith("data:image/png;base64,"));
        assertEquals(2, detail.messages().get(1).mode());
        assertTrue(detail.messages().get(1).attachments().isEmpty());
    }

    @Test
    void deleteRemovesThreadAndAuditsOrThrowsNotFound() {
        when(conversations.findById(999L)).thenReturn(Optional.empty());
        assertThrows(SystemException.class, () -> service.delete(999L, auth("admin")));

        AssistantConversation conv = new AssistantConversation();
        conv.setId(8L);
        conv.setPortal("OPERATIONS");
        conv.setUsername("pilot1");
        conv.setMessageCount(4);
        when(conversations.findById(8L)).thenReturn(Optional.of(conv));

        service.delete(8L, auth("admin"));
        verify(conversations).delete(conv);
        verify(audit)
                .record(
                        isNull(),
                        eq("admin"),
                        eq(AuditAction.DELETE),
                        eq("ASSISTANT_CONVERSATION"),
                        eq("8"),
                        contains("portal=OPERATIONS"));
    }
}
