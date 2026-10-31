package com.uav.platform.service.impl.notification;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.notification.CreateNotificationRequest;
import com.uav.platform.dto.response.notification.NotificationResponse;
import com.uav.platform.entity.notification.Notification;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.notification.NotificationMapper;
import com.uav.platform.repository.notification.NotificationRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.notification.NotificationService;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final NotificationMapper notificationMapper;

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

        return notificationMapper.toResponse(notificationRepository.save(notif));
    }
}
