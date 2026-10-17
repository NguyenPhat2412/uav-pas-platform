package com.uav.platform.modules.notification.service.impl;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.notification.dto.request.CreateNotificationRequest;
import com.uav.platform.modules.notification.dto.response.NotificationResponse;
import com.uav.platform.modules.notification.entity.Notification;
import com.uav.platform.modules.notification.mapper.NotificationMapper;
import com.uav.platform.modules.notification.repository.NotificationRepository;
import com.uav.platform.modules.notification.service.NotificationService;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.repository.UserRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationServiceImpl(
            NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    private AppUser getCurrentUser(Authentication auth) {
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
        return PageResponse.from(page.map(NotificationMapper::toResponse));
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
        return NotificationMapper.toResponse(notificationRepository.save(notification));
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
                new Notification(
                        user,
                        request.title(),
                        request.content(),
                        request.type(),
                        request.referenceType(),
                        request.referenceId());

        return NotificationMapper.toResponse(notificationRepository.save(notif));
    }
}
