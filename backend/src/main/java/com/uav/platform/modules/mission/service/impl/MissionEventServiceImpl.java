package com.uav.platform.modules.mission.service.impl;

import com.uav.platform.modules.mission.entity.*;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.mission.repository.MissionEventRepository;
import com.uav.platform.modules.mission.service.MissionAccessService;
import com.uav.platform.modules.mission.service.MissionEventService;
import com.uav.platform.modules.notification.dto.request.CreateNotificationRequest;
import com.uav.platform.modules.notification.enums.NotificationType;
import com.uav.platform.modules.notification.service.NotificationService;
import com.uav.platform.modules.user.entity.AppUser;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

/** Records timeline events and sends the existing best-effort party notifications. */
@Service
@RequiredArgsConstructor
public class MissionEventServiceImpl implements MissionEventService {
    private final MissionEventRepository events;
    private final NotificationService notifications;
    private final MissionAccessService access;

    @Override
    public void record(
            Mission mission,
            MissionEventType type,
            Authentication authentication,
            MissionStatus oldStatus,
            MissionStatus newStatus,
            String description) {
        events.save(
                new MissionEvent(
                        mission,
                        type,
                        authentication == null ? null : access.user(authentication.getName()),
                        oldStatus,
                        newStatus,
                        description,
                        null));
        notifyParties(mission, authentication, type, description);
    }

    @Override
    public void notifyParties(
            Mission mission, Authentication actor, MissionEventType type, String description) {
        if (notifications == null) return;
        String actorName = actor == null ? null : actor.getName();
        AppUser customer = mission.getCustomer();
        AppUser operator = mission.getOperator();
        notifyUser(customer, actorName, mission, type, description);
        if (operator != null && (customer == null || !operator.getId().equals(customer.getId()))) {
            notifyUser(operator, actorName, mission, type, description);
        }
    }

    @Override
    public void notifyUser(
            AppUser recipient,
            String actorName,
            Mission mission,
            MissionEventType type,
            String description) {
        if (recipient == null
                || recipient.getId() == null
                || recipient.getUsername().equals(actorName)) return;
        NotificationType notificationType =
                type == MissionEventType.OPERATOR_ASSIGNED
                        ? NotificationType.MISSION_ASSIGNED
                        : NotificationType.MISSION_STATUS_CHANGED;
        String title =
                "Mission " + (mission.getCode() == null ? mission.getId() : mission.getCode());
        String content = description == null || description.isBlank() ? type.name() : description;
        try {
            notifications.sendNotification(
                    new CreateNotificationRequest(
                            recipient.getId(),
                            title,
                            content,
                            notificationType,
                            "MISSION",
                            mission.getId()));
        } catch (RuntimeException ignored) {
        }
    }
}
