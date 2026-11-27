package com.uav.platform.service.impl;

import com.uav.platform.dao.IUserDao;
import com.uav.platform.dto.request.CreateNotificationRequest;
import com.uav.platform.entity.AppUser;
import com.uav.platform.enums.NotificationType;
import com.uav.platform.service.NotificationService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class NotificationBroadcastOperations {

    private final IUserDao userRepository;
    private final NotificationService notificationService;

    public void notifyActor(
            String actorUsername,
            String title,
            String content,
            NotificationType type,
            String referenceType,
            Long referenceId) {
        if (actorUsername == null || actorUsername.isBlank()) {
            return;
        }
        try {
            AppUser actor = userRepository.findByUsername(actorUsername.trim()).orElse(null);
            if (actor == null || actor.getId() == null) {
                return;
            }
            notificationService.sendNotification(
                    new CreateNotificationRequest(
                            actor.getId(), title, content, type, referenceType, referenceId));
        } catch (RuntimeException ex) {
            log.warn(
                    "Best-effort module notification skipped for actor={} ref={}: {}",
                    actorUsername,
                    referenceType,
                    ex.getMessage());
        }
    }
}
