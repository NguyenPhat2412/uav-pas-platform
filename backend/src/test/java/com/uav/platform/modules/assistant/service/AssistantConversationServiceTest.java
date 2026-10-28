package com.uav.platform.modules.assistant.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.assistant.dto.record.ChatImage;
import com.uav.platform.modules.assistant.dto.response.AssistantChatResponse;
import com.uav.platform.modules.assistant.entity.AssistantAttachment;
import com.uav.platform.modules.assistant.entity.AssistantConversation;
import com.uav.platform.modules.assistant.entity.AssistantMessage;
import com.uav.platform.modules.assistant.repository.AssistantAttachmentRepository;
import com.uav.platform.modules.assistant.repository.AssistantConversationRepository;
import com.uav.platform.modules.assistant.repository.AssistantMessageRepository;
import com.uav.platform.modules.assistant.service.impl.AssistantConversationServiceImpl;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.repository.UserRepository;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.List;
import java.util.Optional;

class AssistantConversationServiceTest {
    final AssistantConversationRepository conversations =
            mock(AssistantConversationRepository.class);
    final AssistantMessageRepository messages = mock(AssistantMessageRepository.class);
    final UserRepository users = mock(UserRepository.class);
    final AuditLogService audit = mock(AuditLogService.class);
    final AssistantAttachmentRepository files = mock(AssistantAttachmentRepository.class);
    final AssistantConversationServiceImpl service =
            new AssistantConversationServiceImpl(conversations, messages, users, audit, files);

    private UsernamePasswordAuthenticationToken as(String username, long id, UserRole role) {
        AppUser u = mock(AppUser.class);
        when(u.getId()).thenReturn(id);
        when(u.getUsername()).thenReturn(username);
        when(u.getFullName()).thenReturn("Name " + username);
        when(u.getRole()).thenReturn(role);
        when(users.findByUsername(username)).thenReturn(Optional.of(u));
        when(conversations.save(any()))
                .thenAnswer(
                        i -> {
                            AssistantConversation c = i.getArgument(0);
                            if (c.getId() == null) c.setId(42L);
                            return c;
                        });
        when(messages.save(any()))
                .thenAnswer(
                        i -> {
                            AssistantMessage m = i.getArgument(0);
                            if (m.getId() == null) m.setId(500L);
                            return m;
                        });
        return new UsernamePasswordAuthenticationToken(username, "", List.of());
    }

    @Test
    void customerCannotFileAChatUnderAnotherPortalAndLongTitlesAreCut() {
        var thread =
                service.begin(
                        as("cus", 7, UserRole.ROLE_PILOT),
                        "ADMIN",
                        null,
                        "x".repeat(200),
                        List.of());
        assertEquals("CUSTOMER", thread.portal());
        ArgumentCaptor<AssistantConversation> saved =
                ArgumentCaptor.forClass(AssistantConversation.class);
        verify(conversations).save(saved.capture());
        assertEquals(80, saved.getValue().getTitle().length());
        assertEquals(1, saved.getValue().getMessageCount());
        verify(messages)
                .save(argThat(m -> "user".equals(m.getRole()) && m.getConversationId() == 42L));
    }

    @Test
    void adminMayChatFromOperationsButNotContinueSomeoneElsesThread() {
        var auth = as("boss", 1, UserRole.ROLE_ADMIN);
        assertEquals(
                "OPERATIONS", service.begin(auth, "OPERATIONS", null, "hi", List.of()).portal());
        AssistantConversation foreign = new AssistantConversation();
        foreign.setId(9L);
        foreign.setUserId(2L);
        when(conversations.findById(9L)).thenReturn(Optional.of(foreign));
        SystemException e =
                assertThrows(
                        SystemException.class,
                        () -> service.begin(auth, "ADMIN", 9L, "hi", List.of()));
        assertTrue(e.getMessage().contains("not found"));
    }

    @Test
    void replyAddsTokensAndDeleteIsAudited() {
        AssistantConversation c = new AssistantConversation();
        c.setId(5L);
        c.setUserId(1L);
        c.setPortal("CUSTOMER");
        c.setUsername("cus");
        c.setMessageCount(1);
        when(conversations.findById(5L)).thenReturn(Optional.of(c));
        service.recordReply(5L, new AssistantChatResponse("ok", 1, "m", 120, 30, 12, 5L));
        assertEquals(2, c.getMessageCount());
        assertEquals(42, c.getTotalTokens());
        verify(messages)
                .save(
                        argThat(
                                (AssistantMessage m) ->
                                        "assistant".equals(m.getRole())
                                                && m.getLatencyMs() == 120));
        service.delete(5L, new UsernamePasswordAuthenticationToken("admin", "", List.of()));
        verify(conversations).delete(c);
        verify(audit)
                .record(
                        isNull(),
                        eq("admin"),
                        any(),
                        eq("ASSISTANT_CONVERSATION"),
                        eq("5"),
                        contains("messages=2"));
    }

    @Test
    void imagesAreStoredAgainstTheQuestion() {
        byte[] png = {(byte) 0x89, 'P', 'N', 'G', 1, 2, 3, 4};
        service.begin(
                as("cus", 7, UserRole.ROLE_PILOT),
                "CUSTOMER",
                null,
                "Ảnh này là gì?",
                List.of(new ChatImage("VIDEO_FRAME", "image/png", "clip.mp4 @ 00:03", png)));
        verify(files)
                .save(
                        argThat(
                                (AssistantAttachment a) ->
                                        a.getMessageId() == 500L
                                                && "VIDEO_FRAME".equals(a.getKind())
                                                && a.getSizeBytes() == 8
                                                && "image/png".equals(a.getMimeType())));
    }
}
