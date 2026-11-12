package com.uav.platform.service.impl.assistant;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.record.assistant.ChatImage;
import com.uav.platform.dto.record.assistant.ChatThread;
import com.uav.platform.dto.response.assistant.AssistantAttachmentResponse;
import com.uav.platform.dto.response.assistant.AssistantChatResponse;
import com.uav.platform.dto.response.assistant.AssistantConversationDetailResponse;
import com.uav.platform.dto.response.assistant.AssistantConversationResponse;
import com.uav.platform.dto.response.assistant.AssistantMessageResponse;
import com.uav.platform.entity.assistant.AssistantAttachment;
import com.uav.platform.entity.assistant.AssistantConversation;
import com.uav.platform.entity.assistant.AssistantMessage;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.assistant.AssistantAttachmentRepository;
import com.uav.platform.repository.assistant.AssistantConversationRepository;
import com.uav.platform.repository.assistant.AssistantMessageRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.assistant.AssistantConversationService;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.specification.assistant.AssistantConversationSpecifications;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AssistantConversationServiceImpl implements AssistantConversationService {
    static final int TITLE_LENGTH = 80;

    private final AssistantConversationRepository conversations;
    private final AssistantMessageRepository messages;
    private final UserRepository users;
    private final AuditLogService audit;
    private final AssistantAttachmentRepository attachments;

    /** Portals a role may chat from; mirrors the frontend portal guards. */
    static Set<String> portalsFor(UserRole role) {
        if (role == UserRole.ROLE_ADMIN) return Set.of("ADMIN", "OPERATIONS", "CUSTOMER");
        if (role == UserRole.ROLE_COMMANDER || role == UserRole.ROLE_OPERATOR)
            return Set.of("OPERATIONS");
        return Set.of("CUSTOMER");
    }

    static String defaultPortal(UserRole role) {
        if (role == UserRole.ROLE_ADMIN) return "ADMIN";
        if (role == UserRole.ROLE_COMMANDER || role == UserRole.ROLE_OPERATOR) return "OPERATIONS";
        return "CUSTOMER";
    }

    @Override
    @Transactional
    public ChatThread begin(
            Authentication auth,
            String requestedPortal,
            Long conversationId,
            String question,
            List<ChatImage> images) {
        AppUser user =
                users.findByUsername(auth.getName())
                        .orElseThrow(() -> SystemException.unauthorized("Unknown user"));
        LocalDateTime now = LocalDateTime.now();
        AssistantConversation thread;
        if (conversationId != null) {
            thread =
                    conversations
                            .findById(conversationId)
                            .filter(c -> c.getUserId().equals(user.getId()))
                            .orElseThrow(
                                    () ->
                                            SystemException.notFound(
                                                    "Conversation not found",
                                                    "ASSISTANT_CONVERSATION_NOT_FOUND"));
        } else {
            String portal =
                    requestedPortal != null && portalsFor(user.getRole()).contains(requestedPortal)
                            ? requestedPortal
                            : defaultPortal(user.getRole());
            thread = new AssistantConversation();
            thread.setUserId(user.getId());
            thread.setUsername(user.getUsername());
            thread.setFullName(user.getFullName());
            thread.setPortal(portal);
            String oneLine = question.strip().replaceAll("\\s+", " ");
            thread.setTitle(
                    oneLine.length() > TITLE_LENGTH
                            ? oneLine.substring(0, TITLE_LENGTH - 1) + "…"
                            : oneLine);
            thread.setCreatedAt(now);
        }
        thread.setMessageCount(thread.getMessageCount() + 1);
        thread.setUpdatedAt(now);
        thread = conversations.save(thread);

        AssistantMessage message = new AssistantMessage();
        message.setConversationId(thread.getId());
        message.setRole("user");
        message.setContent(question);
        message.setCreatedAt(now);
        message = messages.save(message);
        for (ChatImage image : images == null ? List.<ChatImage>of() : images) {
            AssistantAttachment a = new AssistantAttachment();
            a.setMessageId(message.getId());
            a.setKind(image.kind());
            a.setMimeType(image.mimeType());
            a.setName(
                    image.name() == null
                            ? null
                            : image.name().substring(0, Math.min(160, image.name().length())));
            a.setSizeBytes(image.data().length);
            a.setData(image.data());
            a.setCreatedAt(now);
            attachments.save(a);
        }
        return new ChatThread(thread.getId(), thread.getPortal());
    }

    @Override
    @Transactional
    public void recordReply(Long conversationId, AssistantChatResponse reply) {
        AssistantConversation thread = conversations.findById(conversationId).orElse(null);
        if (thread == null) return;
        LocalDateTime now = LocalDateTime.now();
        AssistantMessage message = new AssistantMessage();
        message.setConversationId(conversationId);
        message.setRole("assistant");
        message.setContent(reply.reply());
        message.setMode((short) reply.mode());
        message.setModel(reply.model());
        message.setPromptTokens(reply.promptTokens());
        message.setCompletionTokens(reply.completionTokens());
        message.setLatencyMs((int) Math.min(Integer.MAX_VALUE, reply.latencyMs()));
        message.setCreatedAt(now);
        messages.save(message);
        thread.setMessageCount(thread.getMessageCount() + 1);
        thread.setTotalTokens(
                thread.getTotalTokens()
                        + (reply.promptTokens() == null ? 0 : reply.promptTokens())
                        + (reply.completionTokens() == null ? 0 : reply.completionTokens()));
        thread.setUpdatedAt(now);
        conversations.save(thread);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<AssistantConversationResponse> list(
            String portal, String query, int page, int size) {
        var spec =
                AssistantConversationSpecifications.inPortal(portal)
                        .and(AssistantConversationSpecifications.matching(query));
        var pageable =
                PageRequest.of(
                        Math.max(0, page),
                        Math.min(100, Math.max(1, size)),
                        Sort.by(Sort.Direction.DESC, "updatedAt"));
        return PageResponse.from(
                conversations
                        .findAll(spec, pageable)
                        .map(AssistantConversationServiceImpl::toResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public AssistantConversationDetailResponse detail(Long id) {
        AssistantConversation thread =
                conversations
                        .findById(id)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Conversation not found",
                                                "ASSISTANT_CONVERSATION_NOT_FOUND"));
        List<AssistantMessage> stored = messages.findByConversationIdOrderByIdAsc(id);
        Map<Long, List<AssistantAttachmentResponse>> files =
                stored.isEmpty()
                        ? Map.of()
                        : attachments
                                .findByMessageIdInOrderByIdAsc(
                                        stored.stream().map(AssistantMessage::getId).toList())
                                .stream()
                                .collect(
                                        Collectors.groupingBy(
                                                AssistantAttachment::getMessageId,
                                                Collectors.mapping(
                                                        a ->
                                                                new AssistantAttachmentResponse(
                                                                        a.getId(),
                                                                        a.getKind(),
                                                                        a.getMimeType(),
                                                                        a.getName(),
                                                                        a.getSizeBytes(),
                                                                        AssistantAttachmentOperations
                                                                                .dataUrl(
                                                                                        a
                                                                                                .getMimeType(),
                                                                                        a
                                                                                                .getData())),
                                                        Collectors.toList())));
        List<AssistantMessageResponse> turns =
                stored.stream()
                        .map(
                                m ->
                                        new AssistantMessageResponse(
                                                m.getId(),
                                                m.getRole(),
                                                m.getContent(),
                                                m.getMode() == null ? null : m.getMode().intValue(),
                                                m.getModel(),
                                                m.getPromptTokens(),
                                                m.getCompletionTokens(),
                                                m.getLatencyMs(),
                                                m.getCreatedAt(),
                                                files.getOrDefault(m.getId(), List.of())))
                        .toList();
        return new AssistantConversationDetailResponse(toResponse(thread), turns);
    }

    @Override
    @Transactional
    public void delete(Long id, Authentication auth) {
        AssistantConversation thread =
                conversations
                        .findById(id)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Conversation not found",
                                                "ASSISTANT_CONVERSATION_NOT_FOUND"));
        conversations.delete(thread);
        audit.record(
                null,
                auth.getName(),
                AuditAction.DELETE,
                "ASSISTANT_CONVERSATION",
                String.valueOf(id),
                "portal="
                        + thread.getPortal()
                        + ", user="
                        + thread.getUsername()
                        + ", messages="
                        + thread.getMessageCount());
    }

    static AssistantConversationResponse toResponse(AssistantConversation c) {
        return new AssistantConversationResponse(
                c.getId(),
                c.getUserId(),
                c.getUsername(),
                c.getFullName(),
                c.getPortal(),
                c.getTitle(),
                c.getMessageCount(),
                c.getTotalTokens(),
                c.getCreatedAt(),
                c.getUpdatedAt());
    }
}
