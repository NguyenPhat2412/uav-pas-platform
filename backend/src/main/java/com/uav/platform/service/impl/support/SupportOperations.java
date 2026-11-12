package com.uav.platform.service.impl.support;

import com.uav.platform.dto.request.notification.CreateNotificationRequest;
import com.uav.platform.dto.request.support.PublicSupportCreateRequest;
import com.uav.platform.dto.request.support.SupportQuickReplyUpsertRequest;
import com.uav.platform.dto.response.support.PublicSupportThreadSessionResponse;
import com.uav.platform.dto.response.support.SupportMessageResponse;
import com.uav.platform.dto.response.support.SupportQuickReplyResponse;
import com.uav.platform.dto.response.support.SupportThreadResponse;
import com.uav.platform.entity.support.SupportMessage;
import com.uav.platform.entity.support.SupportQuickReply;
import com.uav.platform.entity.support.SupportThread;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.notification.NotificationType;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.service.notification.NotificationService;

import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Pure mapping, entity state transitions, status validation, and notification helpers. */
@Slf4j
public final class SupportOperations {

    public static final String STATUS_OPEN = "OPEN";
    public static final String STATUS_IN_PROGRESS = "IN_PROGRESS";
    public static final String STATUS_RESOLVED = "RESOLVED";
    public static final String ROLE_VISITOR = "VISITOR";
    public static final String ROLE_ADMIN = "ADMIN";
    public static final String DEFAULT_TOPIC = "SURVEY_SERVICE";
    public static final String DEFAULT_SOURCE = "LIVE_WIDGET";
    public static final int PREVIEW_MAX_LENGTH = 280;

    private static final Set<String> VALID_STATUSES =
            Set.of(STATUS_OPEN, STATUS_IN_PROGRESS, STATUS_RESOLVED);

    private SupportOperations() {}

    public static String normalizeOrNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public static String normalizeCodeOrDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim().toUpperCase(Locale.ROOT);
    }

    public static String normalizeValidStatusOrNull(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        String normalized = status.trim().toUpperCase(Locale.ROOT);
        return VALID_STATUSES.contains(normalized) ? normalized : null;
    }

    public static String requireValidStatus(String status) {
        String normalized = normalizeValidStatusOrNull(status);
        if (normalized == null) {
            throw SystemException.badRequest(
                            "Trạng thái hỗ trợ không hợp lệ (chỉ chấp nhận OPEN, IN_PROGRESS, RESOLVED).",
                            "INVALID_SUPPORT_STATUS")
                    .at("status");
        }
        return normalized;
    }

    public static SystemException threadNotFound() {
        return SystemException.notFound(
                "Không tìm thấy yêu cầu hỗ trợ.", "SUPPORT_THREAD_NOT_FOUND");
    }

    public static SystemException quickReplyNotFound() {
        return SystemException.notFound(
                "Không tìm thấy mẫu phản hồi nhanh.", "SUPPORT_QUICK_REPLY_NOT_FOUND");
    }

    public static String preview(String content, int maxLength) {
        if (content == null || content.isBlank()) {
            return "";
        }
        String oneLine = content.strip().replaceAll("\\s+", " ");
        return oneLine.length() <= maxLength ? oneLine : oneLine.substring(0, maxLength - 1) + "…";
    }

    public static SupportThread newThread(
            String code,
            String visitorToken,
            PublicSupportCreateRequest request,
            LocalDateTime now) {
        SupportThread thread = new SupportThread();
        thread.setCode(code);
        thread.setVisitorToken(visitorToken);
        thread.setFullName(request.fullName().trim());
        thread.setOrganization(normalizeOrNull(request.organization()));
        thread.setContactInfo(request.contactInfo().trim());
        thread.setTopic(normalizeCodeOrDefault(request.topic(), DEFAULT_TOPIC));
        thread.setSource(normalizeCodeOrDefault(request.source(), DEFAULT_SOURCE));
        thread.setStatus(STATUS_OPEN);
        thread.setUnreadForAdmin(1);
        thread.setUnreadForVisitor(0);
        thread.setLastSenderRole(ROLE_VISITOR);
        thread.setLastMessagePreview(preview(request.message().trim(), PREVIEW_MAX_LENGTH));
        thread.setCreatedAt(now);
        thread.setUpdatedAt(now);
        return thread;
    }

    public static void applyVisitorMessage(
            SupportThread thread, String content, LocalDateTime now) {
        thread.setUnreadForAdmin(thread.getUnreadForAdmin() + 1);
        thread.setLastSenderRole(ROLE_VISITOR);
        thread.setLastMessagePreview(preview(content, PREVIEW_MAX_LENGTH));
        thread.setUpdatedAt(now);
        if (STATUS_RESOLVED.equalsIgnoreCase(thread.getStatus())) {
            thread.setStatus(STATUS_OPEN);
        }
    }

    public static void applyAdminReply(
            SupportThread thread,
            String adminUsername,
            String content,
            String requestedStatus,
            LocalDateTime now) {
        thread.setUnreadForAdmin(0);
        thread.setUnreadForVisitor(thread.getUnreadForVisitor() + 1);
        thread.setLastSenderRole(ROLE_ADMIN);
        thread.setAssignedAdminUsername(adminUsername);
        thread.setLastMessagePreview(preview(content, PREVIEW_MAX_LENGTH));
        thread.setUpdatedAt(now);
        String validStatus = normalizeValidStatusOrNull(requestedStatus);
        if (validStatus != null) {
            thread.setStatus(validStatus);
        } else if (STATUS_OPEN.equalsIgnoreCase(thread.getStatus())) {
            thread.setStatus(STATUS_IN_PROGRESS);
        }
    }

    public static void applyQuickReplyFields(
            SupportQuickReply entity, SupportQuickReplyUpsertRequest request) {
        entity.setTitle(request.title().trim());
        entity.setTopic(
                request.topic() != null && !request.topic().isBlank()
                        ? request.topic().trim().toUpperCase(Locale.ROOT)
                        : null);
        entity.setContent(request.content().trim());
        entity.setSortOrder(request.sortOrder() != null ? request.sortOrder() : 0);
    }

    public static SupportMessage createMessage(
            Long threadId,
            String senderRole,
            String senderName,
            String content,
            LocalDateTime createdAt) {
        SupportMessage message = new SupportMessage();
        message.setThreadId(threadId);
        message.setSenderRole(senderRole);
        message.setSenderName(senderName);
        message.setContent(content);
        message.setCreatedAt(createdAt);
        return message;
    }

    public static Map<Long, Long> toCountMap(List<Object[]> rows) {
        Map<Long, Long> map = new HashMap<>();
        for (Object[] row : rows) {
            if (row != null
                    && row.length >= 2
                    && row[0] instanceof Long id
                    && row[1] instanceof Number cnt) {
                map.put(id, cnt.longValue());
            }
        }
        return map;
    }

    public static void notifyActiveAdminsSafely(
            List<AppUser> admins,
            NotificationService notificationService,
            SupportThread thread,
            String title,
            String content) {
        for (AppUser admin : admins) {
            if (admin.getId() == null
                    || admin.getStatus() != UserStatus.ACTIVE
                    || admin.isManualLocked()) {
                continue;
            }
            try {
                notificationService.sendNotification(
                        new CreateNotificationRequest(
                                admin.getId(),
                                title,
                                content,
                                NotificationType.SYSTEM,
                                "SUPPORT",
                                thread.getId()));
            } catch (Exception ex) {
                log.warn(
                        "Failed to notify admin {} for support thread {}: {}",
                        admin.getUsername(),
                        thread.getCode(),
                        ex.getMessage());
            }
        }
    }

    public static SupportMessageResponse toMessageResponse(SupportMessage m) {
        return new SupportMessageResponse(
                m.getId(), m.getSenderRole(), m.getSenderName(), m.getContent(), m.getCreatedAt());
    }

    public static PublicSupportThreadSessionResponse toPublicSessionResponse(
            SupportThread t, List<SupportMessage> messages) {
        return new PublicSupportThreadSessionResponse(
                t.getId(),
                t.getCode(),
                t.getVisitorToken(),
                t.getFullName(),
                t.getOrganization(),
                t.getContactInfo(),
                t.getTopic(),
                t.getStatus(),
                t.getUnreadForVisitor(),
                t.getCreatedAt(),
                t.getUpdatedAt(),
                messages.stream().map(SupportOperations::toMessageResponse).toList());
    }

    public static SupportThreadResponse toThreadResponse(SupportThread t, long messageCount) {
        return new SupportThreadResponse(
                t.getId(),
                t.getCode(),
                t.getFullName(),
                t.getOrganization(),
                t.getContactInfo(),
                t.getTopic(),
                t.getSource(),
                t.getStatus(),
                t.getUnreadForAdmin(),
                t.getUnreadForVisitor(),
                t.getLastMessagePreview(),
                t.getLastSenderRole(),
                t.getAssignedAdminUsername(),
                messageCount,
                t.getCreatedAt(),
                t.getUpdatedAt());
    }

    public static SupportQuickReplyResponse toQuickReplyResponse(SupportQuickReply r) {
        return new SupportQuickReplyResponse(
                r.getId(),
                r.getTitle(),
                r.getTopic(),
                r.getContent(),
                r.getSortOrder(),
                r.getCreatedBy(),
                r.getCreatedAt());
    }
}
