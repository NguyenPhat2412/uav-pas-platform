package com.uav.platform.service.impl.notification;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.record.notification.NotificationDeliveryPayload;
import com.uav.platform.dto.request.notification.CreateNotificationRequest;
import com.uav.platform.dto.request.notification.RegisterPushTokenRequest;
import com.uav.platform.dto.response.notification.NotificationResponse;
import com.uav.platform.dto.response.notification.PushTokenResponse;
import com.uav.platform.entity.notification.Notification;
import com.uav.platform.entity.notification.PushDeviceToken;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.notification.NotificationMapper;
import com.uav.platform.repository.notification.NotificationRepository;
import com.uav.platform.repository.notification.PushDeviceTokenRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.notification.NotificationService;
import com.uav.platform.websocket.RealtimeEventBroadcaster;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@Transactional
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final NotificationMapper notificationMapper;

    @Autowired(required = false)
    private PushDeviceTokenRepository pushTokenRepository;

    @Autowired(required = false)
    private NotificationDeliveryOperations deliveryOperations;

    @Autowired(required = false)
    private RealtimeEventBroadcaster realtime;

    public void setPushTokenRepository(PushDeviceTokenRepository pushTokenRepository) {
        this.pushTokenRepository = pushTokenRepository;
    }

    public void setDeliveryOperations(NotificationDeliveryOperations deliveryOperations) {
        this.deliveryOperations = deliveryOperations;
    }

    private AppUser getCurrentUser(Authentication auth) {
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            throw SystemException.unauthorized("Authentication required");
        }
        return userRepository
                .findByUsername(auth.getName())
                .orElseThrow(() -> SystemException.notFound("User not found: " + auth.getName()));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> listForUser(Authentication auth, Pageable pageable) {
        AppUser user = getCurrentUser(auth);
        Page<Notification> page =
                notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable);
        return PageResponse.from(page.map(notificationMapper::toResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public long countUnread(Authentication auth) {
        AppUser user = getCurrentUser(auth);
        return notificationRepository.countByUserIdAndIsReadFalse(user.getId());
    }

    @Override
    public NotificationResponse markAsRead(Long id, Authentication auth) {
        AppUser user = getCurrentUser(auth);
        Notification notification =
                notificationRepository
                        .findById(id)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Notification not found with id: " + id));

        if (!notification.getUser().getId().equals(user.getId())) {
            throw SystemException.notFound("Notification not found with id: " + id);
        }

        notification.setIsRead(true);
        return notificationMapper.toResponse(notificationRepository.save(notification));
    }

    @Override
    public void markAllAsRead(Authentication auth) {
        AppUser user = getCurrentUser(auth);
        notificationRepository.markAllAsReadForUser(user.getId());
    }

    @Override
    public NotificationResponse sendNotification(CreateNotificationRequest request) {
        AppUser user =
                userRepository
                        .findById(request.userId())
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "User not found with id: " + request.userId()));

        Notification notif =
                NotificationOperations.create(
                        user,
                        request.title(),
                        request.content(),
                        request.type(),
                        request.referenceType(),
                        request.referenceId());

        Notification saved = notificationRepository.save(notif);
        if (deliveryOperations != null) {
            deliveryOperations.dispatchAfterCommit(
                    new NotificationDeliveryPayload(
                            saved.getId(),
                            user.getId(),
                            user.getEmail(),
                            user.getFullName(),
                            saved.getTitle(),
                            saved.getContent(),
                            saved.getType(),
                            saved.getReferenceType(),
                            saved.getReferenceId()));
        }
        NotificationResponse response = notificationMapper.toResponse(saved);
        if (realtime != null) {
            realtime.publishNotificationCreated(
                    user.getId(),
                    response,
                    notificationRepository.countByUserIdAndIsReadFalse(user.getId()));
        }
        return response;
    }

    @Override
    public PushTokenResponse registerPushToken(
            RegisterPushTokenRequest request, Authentication auth) {
        AppUser user = getCurrentUser(auth);
        if (pushTokenRepository == null) {
            throw SystemException.internalError("Push token repository is unavailable");
        }
        String normalizedToken = request.token().trim();
        PushDeviceToken existing = pushTokenRepository.findByToken(normalizedToken).orElse(null);
        PushDeviceToken entity =
                NotificationDeliveryOperations.createOrReassign(existing, user, request);
        PushDeviceToken saved = pushTokenRepository.save(entity);
        return NotificationDeliveryOperations.toPushTokenResponse(saved);
    }

    @Override
    public void unregisterPushToken(String token, Authentication auth) {
        if (token == null || token.isBlank()) {
            throw SystemException.badRequest(
                            "Push token không được để trống.", "PUSH_TOKEN_REQUIRED")
                    .at("token");
        }
        AppUser user = getCurrentUser(auth);
        if (pushTokenRepository == null) {
            return;
        }
        pushTokenRepository
                .findByToken(token.trim())
                .ifPresent(
                        existing -> {
                            if (existing.getUser() != null
                                    && user.getId().equals(existing.getUser().getId())) {
                                existing.setActive(false);
                                existing.setLastSeenAt(LocalDateTime.now());
                                pushTokenRepository.save(existing);
                            }
                        });
    }
}
