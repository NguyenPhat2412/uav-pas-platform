package com.uav.platform.service.impl;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dao.INotificationDao;
import com.uav.platform.dao.IPushDeviceTokenDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.dto.record.EffectiveNotificationChannels;
import com.uav.platform.dto.record.NotificationDeliveryPayload;
import com.uav.platform.dto.request.CreateNotificationRequest;
import com.uav.platform.dto.request.RegisterPushTokenRequest;
import com.uav.platform.dto.response.NotificationResponse;
import com.uav.platform.dto.response.PushTokenResponse;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.Notification;
import com.uav.platform.entity.PushDeviceToken;
import com.uav.platform.enums.NotificationModuleCode;
import com.uav.platform.enums.NotificationSeverity;
import com.uav.platform.enums.NotificationType;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.NotificationMapper;
import com.uav.platform.service.NotificationService;
import com.uav.platform.transport.RealtimeEventBroadcaster;

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

    private final INotificationDao notificationRepository;
    private final IUserDao userRepository;
    private final NotificationMapper notificationMapper;

    @Autowired(required = false)
    private IPushDeviceTokenDao pushTokenRepository;

    @Autowired(required = false)
    private NotificationDeliveryOperations deliveryOperations;

    @Autowired(required = false)
    private NotificationPolicyOperations policyOperations;

    @Autowired(required = false)
    private RealtimeEventBroadcaster realtime;

    public void setPushTokenRepository(IPushDeviceTokenDao pushTokenRepository) {
        this.pushTokenRepository = pushTokenRepository;
    }

    public void setDeliveryOperations(NotificationDeliveryOperations deliveryOperations) {
        this.deliveryOperations = deliveryOperations;
    }

    public void setPolicyOperations(NotificationPolicyOperations policyOperations) {
        this.policyOperations = policyOperations;
    }

    public void setRealtime(RealtimeEventBroadcaster realtime) {
        this.realtime = realtime;
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

        NotificationModuleCode fallbackModule =
                NotificationPolicyOperations.resolveModuleCode(
                        request.type(), request.referenceType());
        NotificationSeverity fallbackSeverity =
                NotificationPolicyOperations.defaultSeverity(fallbackModule);
        EffectiveNotificationChannels channels =
                policyOperations != null
                        ? policyOperations.evaluate(
                                user.getId(), request.type(), request.referenceType())
                        : null;

        if (channels != null && (!channels.enabled() || !channels.inApp())) {
            return new NotificationResponse(
                    null,
                    user.getId(),
                    request.title(),
                    request.content(),
                    request.type() != null ? request.type() : NotificationType.SYSTEM,
                    channels.moduleCode(),
                    channels.severity(),
                    request.referenceType(),
                    request.referenceId(),
                    true,
                    LocalDateTime.now());
        }

        NotificationModuleCode moduleCode =
                channels != null ? channels.moduleCode() : fallbackModule;
        NotificationSeverity severity = channels != null ? channels.severity() : fallbackSeverity;

        boolean withinCooldown =
                channels != null
                        && channels.cooldownSeconds() > 0
                        && notificationRepository.existsByUserIdAndModuleCodeAndCreatedAtAfter(
                                user.getId(),
                                moduleCode,
                                LocalDateTime.now().minusSeconds(channels.cooldownSeconds()));

        Notification notif =
                NotificationOperations.create(
                        user,
                        request.title(),
                        request.content(),
                        request.type(),
                        moduleCode,
                        severity,
                        request.referenceType(),
                        request.referenceId());

        Notification saved = notificationRepository.save(notif);
        if (deliveryOperations != null && !withinCooldown) {
            Boolean mobilePushAllowed = channels != null ? channels.mobilePush() : null;
            Boolean emailAllowed = channels != null ? channels.email() : null;
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
                            saved.getReferenceId(),
                            mobilePushAllowed,
                            emailAllowed));
        }
        NotificationResponse response = notificationMapper.toResponse(saved);
        if (realtime != null) {
            boolean screenPopup = !withinCooldown && (channels == null || channels.screenPopup());
            boolean desktopOs = !withinCooldown && (channels == null || channels.desktopOs());
            realtime.publishNotificationCreated(
                    user.getId(),
                    response,
                    notificationRepository.countByUserIdAndIsReadFalse(user.getId()),
                    screenPopup,
                    desktopOs);
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
