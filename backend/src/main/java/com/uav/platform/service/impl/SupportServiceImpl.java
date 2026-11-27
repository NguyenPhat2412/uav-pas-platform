package com.uav.platform.service.impl;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.common.util.Pageables;
import com.uav.platform.dao.ISupportMessageDao;
import com.uav.platform.dao.ISupportQuickReplyDao;
import com.uav.platform.dao.ISupportThreadDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.dto.request.PublicSupportCreateRequest;
import com.uav.platform.dto.request.PublicSupportMessageRequest;
import com.uav.platform.dto.request.SupportAdminReplyRequest;
import com.uav.platform.dto.request.SupportQuickReplyUpsertRequest;
import com.uav.platform.dto.request.SupportStatusUpdateRequest;
import com.uav.platform.dto.response.PublicSupportThreadSessionResponse;
import com.uav.platform.dto.response.SupportAdminSummaryResponse;
import com.uav.platform.dto.response.SupportQuickReplyResponse;
import com.uav.platform.dto.response.SupportThreadDetailResponse;
import com.uav.platform.dto.response.SupportThreadResponse;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.SupportMessage;
import com.uav.platform.entity.SupportQuickReply;
import com.uav.platform.entity.SupportThread;
import com.uav.platform.enums.UserRole;
import com.uav.platform.service.NotificationService;
import com.uav.platform.service.SupportService;
import com.uav.platform.specification.SupportThreadSpecifications;
import com.uav.platform.transport.RealtimeEventBroadcaster;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
public class SupportServiceImpl implements SupportService {

    private final ISupportThreadDao threadRepository;
    private final ISupportMessageDao messageRepository;
    private final ISupportQuickReplyDao quickReplyRepository;
    private final IUserDao userRepository;
    private final NotificationService notificationService;
    private final RealtimeEventBroadcaster realtimeBroadcaster;

    public SupportServiceImpl(
            ISupportThreadDao threadRepository,
            ISupportMessageDao messageRepository,
            ISupportQuickReplyDao quickReplyRepository,
            IUserDao userRepository,
            NotificationService notificationService) {
        this(
                threadRepository,
                messageRepository,
                quickReplyRepository,
                userRepository,
                notificationService,
                null);
    }

    @Autowired
    public SupportServiceImpl(
            ISupportThreadDao threadRepository,
            ISupportMessageDao messageRepository,
            ISupportQuickReplyDao quickReplyRepository,
            IUserDao userRepository,
            NotificationService notificationService,
            @Autowired(required = false) RealtimeEventBroadcaster realtimeBroadcaster) {
        this.threadRepository = threadRepository;
        this.messageRepository = messageRepository;
        this.quickReplyRepository = quickReplyRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.realtimeBroadcaster = realtimeBroadcaster;
    }

    @Override
    @Transactional
    public PublicSupportThreadSessionResponse createPublicThread(
            PublicSupportCreateRequest request) {
        LocalDateTime now = LocalDateTime.now();
        String content = request.message().trim();
        SupportThread thread =
                threadRepository.save(
                        SupportOperations.newThread(
                                SupportTokenOperations.nextUniqueCode(
                                        now.toLocalDate(), threadRepository::existsByCode),
                                SupportTokenOperations.nextUniqueVisitorToken(
                                        threadRepository::existsByVisitorToken),
                                request,
                                now));
        LocalDateTime deliveredAt =
                realtimeBroadcaster != null && realtimeBroadcaster.hasActiveAdminSupportSubscriber()
                        ? now
                        : null;
        SupportMessage firstMessage =
                messageRepository.save(
                        SupportOperations.createMessage(
                                thread.getId(),
                                SupportOperations.ROLE_VISITOR,
                                thread.getFullName(),
                                content,
                                now,
                                deliveredAt));
        notifyAdminsSafely(
                thread,
                "Yêu cầu hỗ trợ mới [" + thread.getCode() + "]",
                thread.getFullName()
                        + " ("
                        + thread.getContactInfo()
                        + "): "
                        + SupportOperations.preview(content, 160));
        PublicSupportThreadSessionResponse session =
                SupportOperations.toPublicSessionResponse(thread, List.of(firstMessage));
        publishThreadSnapshot(thread, List.of(firstMessage));
        return session;
    }

    @Override
    @Transactional
    public PublicSupportThreadSessionResponse getPublicThread(
            String visitorToken, boolean markRead) {
        SupportThread thread = findByVisitorTokenOrThrow(visitorToken);
        LocalDateTime now = LocalDateTime.now();
        boolean clearedUnread = false;
        if (markRead && thread.getUnreadForVisitor() > 0) {
            thread.setUnreadForVisitor(0);
            thread = threadRepository.save(thread);
            clearedUnread = true;
        }
        List<SupportMessage> messages =
                messageRepository.findByThreadIdOrderByCreatedAtAscIdAsc(thread.getId());
        List<SupportMessage> changed =
                markRead
                        ? SupportOperations.stampRead(
                                messages, SupportOperations.ROLE_ADMIN, thread.getFullName(), now)
                        : SupportOperations.stampDelivered(
                                messages, SupportOperations.ROLE_ADMIN, now);
        if (!changed.isEmpty()) {
            messageRepository.saveAll(changed);
        }
        PublicSupportThreadSessionResponse session =
                SupportOperations.toPublicSessionResponse(thread, messages);
        if (clearedUnread || !changed.isEmpty()) {
            publishThreadSnapshot(thread, messages);
        }
        return session;
    }

    @Override
    @Transactional
    public PublicSupportThreadSessionResponse postPublicMessage(
            String visitorToken, PublicSupportMessageRequest request) {
        SupportThread thread = findByVisitorTokenOrThrow(visitorToken);
        LocalDateTime now = LocalDateTime.now();
        String content = request.content().trim();
        List<SupportMessage> existing =
                messageRepository.findByThreadIdOrderByCreatedAtAscIdAsc(thread.getId());
        List<SupportMessage> readByVisitor =
                SupportOperations.stampRead(
                        existing, SupportOperations.ROLE_ADMIN, thread.getFullName(), now);
        if (!readByVisitor.isEmpty()) {
            messageRepository.saveAll(readByVisitor);
        }
        LocalDateTime deliveredAt =
                realtimeBroadcaster != null && realtimeBroadcaster.hasActiveAdminSupportSubscriber()
                        ? now
                        : null;
        messageRepository.save(
                SupportOperations.createMessage(
                        thread.getId(),
                        SupportOperations.ROLE_VISITOR,
                        thread.getFullName(),
                        content,
                        now,
                        deliveredAt));
        thread.setUnreadForVisitor(0);
        SupportOperations.applyVisitorMessage(thread, content, now);
        thread = threadRepository.save(thread);
        notifyAdminsSafely(
                thread,
                "Tin nhắn mới từ khách [" + thread.getCode() + "]",
                thread.getFullName() + ": " + SupportOperations.preview(content, 160));
        List<SupportMessage> messages =
                messageRepository.findByThreadIdOrderByCreatedAtAscIdAsc(thread.getId());
        publishThreadSnapshot(thread, messages);
        return SupportOperations.toPublicSessionResponse(thread, messages);
    }

    @Override
    @Transactional(readOnly = true)
    public SupportAdminSummaryResponse getAdminSummary() {
        return new SupportAdminSummaryResponse(
                threadRepository.count(),
                threadRepository.countByStatus(SupportOperations.STATUS_OPEN),
                threadRepository.countByStatus(SupportOperations.STATUS_IN_PROGRESS),
                threadRepository.countByStatus(SupportOperations.STATUS_RESOLVED),
                threadRepository.countByUnreadForAdminGreaterThan(0),
                threadRepository.sumUnreadForAdmin());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<SupportThreadResponse> listAdminThreads(
            String status, String topic, Boolean unreadOnly, String q, int page, int size) {
        var spec =
                SupportThreadSpecifications.withStatus(status)
                        .and(SupportThreadSpecifications.withTopic(topic))
                        .and(SupportThreadSpecifications.unreadOnly(unreadOnly))
                        .and(SupportThreadSpecifications.matching(q));
        Page<SupportThread> result =
                threadRepository.findAll(spec, Pageables.desc(page, size, "updatedAt"));
        Map<Long, Long> counts =
                result.isEmpty()
                        ? Map.of()
                        : SupportOperations.toCountMap(
                                messageRepository.countGroupedByThreadIds(
                                        result.getContent().stream()
                                                .map(SupportThread::getId)
                                                .toList()));
        return PageResponse.from(
                result,
                t -> SupportOperations.toThreadResponse(t, counts.getOrDefault(t.getId(), 0L)));
    }

    @Override
    @Transactional
    public int acknowledgeAdminDelivered() {
        List<SupportMessage> undelivered =
                messageRepository.findBySenderRoleAndDeliveredAtIsNull(
                        SupportOperations.ROLE_VISITOR);
        if (undelivered.isEmpty()) {
            return 0;
        }
        LocalDateTime now = LocalDateTime.now();
        Set<Long> affectedThreadIds = new LinkedHashSet<>();
        for (SupportMessage message : undelivered) {
            message.setDeliveredAt(now);
            if (message.getThreadId() != null) {
                affectedThreadIds.add(message.getThreadId());
            }
        }
        messageRepository.saveAll(undelivered);
        for (Long threadId : affectedThreadIds) {
            threadRepository
                    .findById(threadId)
                    .ifPresent(
                            thread -> {
                                List<SupportMessage> messages =
                                        messageRepository.findByThreadIdOrderByCreatedAtAscIdAsc(
                                                threadId);
                                publishThreadSnapshot(thread, messages);
                            });
        }
        return undelivered.size();
    }

    @Override
    @Transactional
    public SupportThreadDetailResponse getAdminThreadDetail(Long id, Authentication auth) {
        SupportThread thread = findByIdOrThrow(id);
        LocalDateTime now = LocalDateTime.now();
        boolean clearedAdminUnread = false;
        if (thread.getUnreadForAdmin() > 0) {
            thread.setUnreadForAdmin(0);
            thread = threadRepository.save(thread);
            clearedAdminUnread = true;
        }
        String viewerName = resolveViewerAdminName(auth);
        List<SupportMessage> messages =
                messageRepository.findByThreadIdOrderByCreatedAtAscIdAsc(thread.getId());
        List<SupportMessage> readMessages =
                SupportOperations.stampRead(
                        messages, SupportOperations.ROLE_VISITOR, viewerName, now);
        if (!readMessages.isEmpty()) {
            messageRepository.saveAll(readMessages);
        }
        if (clearedAdminUnread || !readMessages.isEmpty()) {
            publishThreadSnapshot(thread, messages);
        }
        return new SupportThreadDetailResponse(
                SupportOperations.toThreadResponse(thread, messages.size()),
                messages.stream().map(SupportOperations::toMessageResponse).toList());
    }

    @Override
    @Transactional
    public SupportThreadDetailResponse replyAsAdmin(
            Long id, SupportAdminReplyRequest request, Authentication auth) {
        SupportThread thread = findByIdOrThrow(id);
        LocalDateTime now = LocalDateTime.now();
        String adminUsername =
                auth != null && auth.getName() != null && !auth.getName().isBlank()
                        ? auth.getName().trim()
                        : "admin";
        String adminDisplayName = resolveAdminDisplayName(adminUsername);
        String content = request.content().trim();
        List<SupportMessage> existing =
                messageRepository.findByThreadIdOrderByCreatedAtAscIdAsc(thread.getId());
        List<SupportMessage> readVisitorMessages =
                SupportOperations.stampRead(
                        existing, SupportOperations.ROLE_VISITOR, adminDisplayName, now);
        if (!readVisitorMessages.isEmpty()) {
            messageRepository.saveAll(readVisitorMessages);
        }
        LocalDateTime deliveredAt =
                realtimeBroadcaster != null
                                && realtimeBroadcaster.hasActiveVisitorSubscriber(
                                        thread.getVisitorToken())
                        ? now
                        : null;
        messageRepository.save(
                SupportOperations.createMessage(
                        thread.getId(),
                        SupportOperations.ROLE_ADMIN,
                        adminDisplayName,
                        content,
                        now,
                        deliveredAt));
        SupportOperations.applyAdminReply(thread, adminUsername, content, request.status(), now);
        thread = threadRepository.save(thread);
        List<SupportMessage> messages =
                messageRepository.findByThreadIdOrderByCreatedAtAscIdAsc(thread.getId());
        publishThreadSnapshot(thread, messages);
        return new SupportThreadDetailResponse(
                SupportOperations.toThreadResponse(thread, messages.size()),
                messages.stream().map(SupportOperations::toMessageResponse).toList());
    }

    @Override
    @Transactional
    public SupportThreadResponse updateThreadStatus(Long id, SupportStatusUpdateRequest request) {
        SupportThread thread = findByIdOrThrow(id);
        thread.setStatus(SupportOperations.requireValidStatus(request.status()));
        thread.setUpdatedAt(LocalDateTime.now());
        thread = threadRepository.save(thread);
        List<SupportMessage> messages =
                messageRepository.findByThreadIdOrderByCreatedAtAscIdAsc(thread.getId());
        publishThreadSnapshot(thread, messages);
        return SupportOperations.toThreadResponse(thread, messages.size());
    }

    @Override
    @Transactional
    public void deleteThread(Long id) {
        SupportThread thread = findByIdOrThrow(id);
        String visitorToken = thread.getVisitorToken();
        messageRepository.deleteByThreadId(thread.getId());
        threadRepository.delete(thread);
        if (realtimeBroadcaster != null) {
            realtimeBroadcaster.publishSupportThreadDeleted(id, visitorToken, getAdminSummary());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<SupportQuickReplyResponse> listQuickReplies() {
        return quickReplyRepository.findAllByOrderBySortOrderAscIdAsc().stream()
                .map(SupportOperations::toQuickReplyResponse)
                .toList();
    }

    @Override
    @Transactional
    public SupportQuickReplyResponse createQuickReply(
            SupportQuickReplyUpsertRequest request, Authentication auth) {
        SupportQuickReply entity = new SupportQuickReply();
        SupportOperations.applyQuickReplyFields(entity, request);
        entity.setCreatedBy(
                auth != null && auth.getName() != null && !auth.getName().isBlank()
                        ? auth.getName().trim()
                        : null);
        entity.setCreatedAt(LocalDateTime.now());
        return SupportOperations.toQuickReplyResponse(quickReplyRepository.save(entity));
    }

    @Override
    @Transactional
    public SupportQuickReplyResponse updateQuickReply(
            Long id, SupportQuickReplyUpsertRequest request) {
        SupportQuickReply entity = findQuickReplyOrThrow(id);
        SupportOperations.applyQuickReplyFields(entity, request);
        return SupportOperations.toQuickReplyResponse(quickReplyRepository.save(entity));
    }

    @Override
    @Transactional
    public void deleteQuickReply(Long id) {
        quickReplyRepository.delete(findQuickReplyOrThrow(id));
    }

    private void publishThreadSnapshot(SupportThread thread, List<SupportMessage> messages) {
        if (realtimeBroadcaster == null) {
            return;
        }
        PublicSupportThreadSessionResponse visitorSession =
                SupportOperations.toPublicSessionResponse(thread, messages);
        SupportThreadResponse adminThread =
                SupportOperations.toThreadResponse(thread, messages.size());
        realtimeBroadcaster.publishSupportThreadUpdated(
                thread.getVisitorToken(), visitorSession, adminThread, getAdminSummary());
    }

    private SupportThread findByVisitorTokenOrThrow(String visitorToken) {
        if (visitorToken == null || visitorToken.isBlank()) {
            throw SupportOperations.threadNotFound();
        }
        return threadRepository
                .findByVisitorToken(visitorToken.trim())
                .orElseThrow(SupportOperations::threadNotFound);
    }

    private SupportThread findByIdOrThrow(Long id) {
        return threadRepository.findById(id).orElseThrow(SupportOperations::threadNotFound);
    }

    private SupportQuickReply findQuickReplyOrThrow(Long id) {
        return quickReplyRepository.findById(id).orElseThrow(SupportOperations::quickReplyNotFound);
    }

    private String resolveViewerAdminName(Authentication auth) {
        if (auth != null && auth.getName() != null && !auth.getName().isBlank()) {
            return resolveAdminDisplayName(auth.getName().trim());
        }
        return "Quản trị viên";
    }

    private String resolveAdminDisplayName(String adminUsername) {
        return userRepository
                .findByUsername(adminUsername)
                .map(AppUser::getFullName)
                .filter(name -> !name.isBlank())
                .map(String::trim)
                .orElse(adminUsername);
    }

    private void notifyAdminsSafely(SupportThread thread, String title, String content) {
        try {
            SupportOperations.notifyActiveAdminsSafely(
                    userRepository.findByRole(UserRole.ROLE_ADMIN),
                    notificationService,
                    thread,
                    title,
                    content);
        } catch (Exception ex) {
            log.warn(
                    "Failed to dispatch admin notifications for support thread {}: {}",
                    thread.getCode(),
                    ex.getMessage());
        }
    }
}
