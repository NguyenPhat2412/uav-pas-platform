package com.uav.platform.service.impl.support;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.common.util.Pageables;
import com.uav.platform.dto.request.support.PublicSupportCreateRequest;
import com.uav.platform.dto.request.support.PublicSupportMessageRequest;
import com.uav.platform.dto.request.support.SupportAdminReplyRequest;
import com.uav.platform.dto.request.support.SupportQuickReplyUpsertRequest;
import com.uav.platform.dto.request.support.SupportStatusUpdateRequest;
import com.uav.platform.dto.response.support.PublicSupportThreadSessionResponse;
import com.uav.platform.dto.response.support.SupportAdminSummaryResponse;
import com.uav.platform.dto.response.support.SupportQuickReplyResponse;
import com.uav.platform.dto.response.support.SupportThreadDetailResponse;
import com.uav.platform.dto.response.support.SupportThreadResponse;
import com.uav.platform.entity.support.SupportMessage;
import com.uav.platform.entity.support.SupportQuickReply;
import com.uav.platform.entity.support.SupportThread;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.repository.support.SupportMessageRepository;
import com.uav.platform.repository.support.SupportQuickReplyRepository;
import com.uav.platform.repository.support.SupportThreadRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.notification.NotificationService;
import com.uav.platform.service.support.SupportService;
import com.uav.platform.specification.support.SupportThreadSpecifications;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class SupportServiceImpl implements SupportService {

    private final SupportThreadRepository threadRepository;
    private final SupportMessageRepository messageRepository;
    private final SupportQuickReplyRepository quickReplyRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

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
        SupportMessage firstMessage =
                messageRepository.save(
                        SupportOperations.createMessage(
                                thread.getId(),
                                SupportOperations.ROLE_VISITOR,
                                thread.getFullName(),
                                content,
                                now));
        notifyAdminsSafely(
                thread,
                "Yêu cầu hỗ trợ mới [" + thread.getCode() + "]",
                thread.getFullName()
                        + " ("
                        + thread.getContactInfo()
                        + "): "
                        + SupportOperations.preview(content, 160));
        return SupportOperations.toPublicSessionResponse(thread, List.of(firstMessage));
    }

    @Override
    @Transactional
    public PublicSupportThreadSessionResponse getPublicThread(
            String visitorToken, boolean markRead) {
        SupportThread thread = findByVisitorTokenOrThrow(visitorToken);
        if (markRead && thread.getUnreadForVisitor() > 0) {
            thread.setUnreadForVisitor(0);
            thread = threadRepository.save(thread);
        }
        List<SupportMessage> messages =
                messageRepository.findByThreadIdOrderByCreatedAtAscIdAsc(thread.getId());
        return SupportOperations.toPublicSessionResponse(thread, messages);
    }

    @Override
    @Transactional
    public PublicSupportThreadSessionResponse postPublicMessage(
            String visitorToken, PublicSupportMessageRequest request) {
        SupportThread thread = findByVisitorTokenOrThrow(visitorToken);
        LocalDateTime now = LocalDateTime.now();
        String content = request.content().trim();
        messageRepository.save(
                SupportOperations.createMessage(
                        thread.getId(),
                        SupportOperations.ROLE_VISITOR,
                        thread.getFullName(),
                        content,
                        now));
        SupportOperations.applyVisitorMessage(thread, content, now);
        thread = threadRepository.save(thread);
        notifyAdminsSafely(
                thread,
                "Tin nhắn mới từ khách [" + thread.getCode() + "]",
                thread.getFullName() + ": " + SupportOperations.preview(content, 160));
        return SupportOperations.toPublicSessionResponse(
                thread, messageRepository.findByThreadIdOrderByCreatedAtAscIdAsc(thread.getId()));
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
    public SupportThreadDetailResponse getAdminThreadDetail(Long id) {
        SupportThread thread = findByIdOrThrow(id);
        if (thread.getUnreadForAdmin() > 0) {
            thread.setUnreadForAdmin(0);
            thread = threadRepository.save(thread);
        }
        return buildDetailResponse(thread);
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
        String content = request.content().trim();
        messageRepository.save(
                SupportOperations.createMessage(
                        thread.getId(),
                        SupportOperations.ROLE_ADMIN,
                        resolveAdminDisplayName(adminUsername),
                        content,
                        now));
        SupportOperations.applyAdminReply(thread, adminUsername, content, request.status(), now);
        return buildDetailResponse(threadRepository.save(thread));
    }

    @Override
    @Transactional
    public SupportThreadResponse updateThreadStatus(Long id, SupportStatusUpdateRequest request) {
        SupportThread thread = findByIdOrThrow(id);
        thread.setStatus(SupportOperations.requireValidStatus(request.status()));
        thread.setUpdatedAt(LocalDateTime.now());
        thread = threadRepository.save(thread);
        return SupportOperations.toThreadResponse(
                thread, messageRepository.countByThreadId(thread.getId()));
    }

    @Override
    @Transactional
    public void deleteThread(Long id) {
        SupportThread thread = findByIdOrThrow(id);
        messageRepository.deleteByThreadId(thread.getId());
        threadRepository.delete(thread);
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

    private SupportThreadDetailResponse buildDetailResponse(SupportThread thread) {
        List<SupportMessage> messages =
                messageRepository.findByThreadIdOrderByCreatedAtAscIdAsc(thread.getId());
        return new SupportThreadDetailResponse(
                SupportOperations.toThreadResponse(thread, messages.size()),
                messages.stream().map(SupportOperations::toMessageResponse).toList());
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
