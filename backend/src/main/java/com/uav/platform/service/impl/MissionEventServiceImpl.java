package com.uav.platform.service.impl;

import com.uav.platform.dao.IMissionEventDao;
import com.uav.platform.dto.request.CreateNotificationRequest;
import com.uav.platform.entity.*;
import com.uav.platform.entity.AppUser;
import com.uav.platform.enums.*;
import com.uav.platform.enums.NotificationType;
import com.uav.platform.service.MissionAccessService;
import com.uav.platform.service.MissionEventService;
import com.uav.platform.service.NotificationService;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

/** Records timeline events and sends the existing best-effort party notifications. */
@Service
@RequiredArgsConstructor
public class MissionEventServiceImpl implements MissionEventService {
    private final IMissionEventDao events;
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
        if (type == MissionEventType.SUBMITTED) {
            // Dispatch staff must learn about a new request without polling the list.
            for (AppUser staff : access.dispatchers()) {
                if (customer != null && staff.getId().equals(customer.getId())) continue;
                if (operator != null && staff.getId().equals(operator.getId())) continue;
                notifyUser(staff, actorName, mission, type, description);
            }
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
                                || type == MissionEventType.OPERATOR_REPLACED
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

    @Override
    public boolean deliversNotifications() {
        return notifications != null;
    }
}
