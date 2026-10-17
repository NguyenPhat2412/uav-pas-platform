package com.uav.platform.modules.mission.service.impl;

import com.uav.platform.modules.mission.entity.*;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.uav.entity.Uav;
import com.uav.platform.modules.user.entity.AppUser;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumSet;

/** Internal service implementation rules; persistence entities contain data only. */
public final class MissionOperations {
    private MissionOperations() {}

    public static Mission draft(
            AppUser customer,
            MissionType type,
            String title,
            String description,
            LocalDate requestedDate,
            LocalDateTime startTime,
            LocalDateTime expectedEndTime,
            String locationName,
            BigDecimal latitude,
            BigDecimal longitude,
            MissionPriority priority,
            String notes) {
        if (type == null
                || title == null
                || title.isBlank()
                || requestedDate == null
                || startTime == null
                || expectedEndTime == null
                || !expectedEndTime.isAfter(startTime)
                || locationName == null
                || locationName.isBlank()) {
            throw new IllegalArgumentException("Mission input is invalid");
        }
        Mission mission = new Mission();
        mission.setCustomer(customer);
        mission.setMissionType(type);
        mission.setTitle(title.trim());
        mission.setDescription(description);
        mission.setRequestedDate(requestedDate);
        mission.setStartTime(startTime);
        mission.setExpectedEndTime(expectedEndTime);
        mission.setLocationName(locationName.trim());
        mission.setLatitude(latitude);
        mission.setLongitude(longitude);
        mission.setPriority(priority == null ? MissionPriority.NORMAL : priority);
        mission.setNotes(notes);
        return mission;
    }

    public static void complete(Mission value, String completionNote, String equipmentCondition) {
        value.setCompletionNote(completionNote);
        value.setEquipmentCondition(equipmentCondition);
        transitionTo(value, MissionStatus.COMPLETED);
    }

    public static void fail(Mission value, String failureReason, String failureNotes) {
        value.setFailureReason(failureReason);
        value.setFailureNotes(failureNotes);
        transitionTo(value, MissionStatus.FAILED);
    }

    public static void acceptOperator(Mission value) {
        requirePreflight(value);
        value.setOperatorAccepted(true);
        value.setOperatorConflictNote(null);
    }

    public static void reportOperatorConflict(Mission value, String note) {
        requirePreflight(value);
        value.setOperatorAccepted(false);
        value.setOperatorConflictNote(note);
        if (value.getStatus() == MissionStatus.READY)
            value.setStatus(MissionStatus.RESOURCE_RESERVED);
    }

    public static void invalidateAcceptance(Mission value) {
        value.setOperatorAccepted(false);
        value.setOperatorConflictNote(null);
    }

    public static void requireMediaWritable(Mission value) {
        if (value.getStatus() == MissionStatus.COMPLETED
                || value.getStatus() == MissionStatus.FAILED
                || value.getStatus() == MissionStatus.CANCELLED
                || value.getStatus() == MissionStatus.REJECTED) {
            throw com.uav.platform.error.SystemException.conflict("MISSION_MEDIA_LOCKED");
        }
    }

    private static void requirePreflight(Mission value) {
        if (value.getStatus() != MissionStatus.CONFIRMED
                && value.getStatus() != MissionStatus.RESOURCE_RESERVED
                && value.getStatus() != MissionStatus.READY) {
            throw new IllegalStateException("MISSION_INVALID_STATUS");
        }
    }

    public static void updateDraft(
            Mission value,
            String title,
            String description,
            LocalDate requestedDate,
            LocalDateTime startTime,
            LocalDateTime expectedEndTime,
            String locationName,
            BigDecimal latitude,
            BigDecimal longitude,
            MissionPriority priority,
            String notes) {
        if (value.getStatus() != MissionStatus.DRAFT)
            throw new IllegalStateException("MISSION_INVALID_STATUS");
        if (title == null
                || title.isBlank()
                || requestedDate == null
                || startTime == null
                || expectedEndTime == null
                || !expectedEndTime.isAfter(startTime)
                || locationName == null
                || locationName.isBlank()) {
            throw new IllegalArgumentException("Mission input is invalid");
        }
        value.setTitle(title.trim());
        value.setDescription(description);
        value.setRequestedDate(requestedDate);
        value.setStartTime(startTime);
        value.setExpectedEndTime(expectedEndTime);
        value.setLocationName(locationName.trim());
        value.setLatitude(latitude);
        value.setLongitude(longitude);
        value.setPriority(priority == null ? MissionPriority.NORMAL : priority);
        value.setNotes(notes);
    }

    public static void assignStation(Mission value, Station station) {
        value.setStation(station);
    }

    public static void assignUav(Mission value, Uav uav) {
        value.setUav(uav);
    }

    /** Re-dispatch is a pre-flight operation, separate from ordinary lifecycle transitions. */
    public static void redispatchUav(Mission value, Uav replacement, boolean equipmentReserved) {
        if (value.getStatus() != MissionStatus.CONFIRMED
                && value.getStatus() != MissionStatus.RESOURCE_RESERVED
                && value.getStatus() != MissionStatus.READY) {
            throw new IllegalStateException("MISSION_INVALID_STATUS");
        }
        value.setUav(replacement);
        value.setOperatorAccepted(false);
        value.setOperatorConflictNote(null);
        value.setStatus(
                hasRequiredResources(value, equipmentReserved)
                        ? MissionStatus.RESOURCE_RESERVED
                        : MissionStatus.CONFIRMED);
    }

    public static void resetDispatch(Mission value, boolean equipmentReserved) {
        requirePreflight(value);
        value.setOperatorAccepted(false);
        value.setOperatorConflictNote(null);
        value.setStatus(
                hasRequiredResources(value, equipmentReserved)
                        ? MissionStatus.RESOURCE_RESERVED
                        : MissionStatus.CONFIRMED);
    }

    public static void assignOperator(Mission value, AppUser operator) {
        value.setOperator(operator);
    }

    public static boolean hasRequiredResources(Mission value, boolean equipmentReserved) {
        return value.getStation() != null
                && value.getUav() != null
                && value.getOperator() != null
                && equipmentReserved;
    }

    public static void transitionTo(Mission value, MissionStatus target) {
        if (target == null || !allowedTransitions(value.getStatus()).contains(target)) {
            throw new IllegalStateException("MISSION_INVALID_STATUS");
        }
        value.setStatus(target);
        if (target == MissionStatus.CANCELLED) value.setCancelledAt(LocalDateTime.now());
        if (target == MissionStatus.COMPLETED) value.setCompletedAt(LocalDateTime.now());
    }

    private static EnumSet<MissionStatus> allowedTransitions(MissionStatus current) {
        return switch (current) {
            case DRAFT -> EnumSet.of(MissionStatus.PENDING_CONFIRMATION, MissionStatus.CANCELLED);
            case PENDING_CONFIRMATION ->
                    EnumSet.of(
                            MissionStatus.CONFIRMED,
                            MissionStatus.CANCELLED,
                            MissionStatus.REJECTED);
            case CONFIRMED ->
                    EnumSet.of(
                            MissionStatus.RESOURCE_RESERVED,
                            MissionStatus.CANCELLED,
                            MissionStatus.REJECTED);
            case RESOURCE_RESERVED ->
                    EnumSet.of(MissionStatus.READY, MissionStatus.CANCELLED, MissionStatus.FAILED);
            case READY ->
                    EnumSet.of(
                            MissionStatus.IN_PROGRESS,
                            MissionStatus.CANCELLED,
                            MissionStatus.FAILED);
            case IN_PROGRESS -> EnumSet.of(MissionStatus.COMPLETED, MissionStatus.FAILED);
            case COMPLETED, CANCELLED, REJECTED, FAILED -> EnumSet.noneOf(MissionStatus.class);
        };
    }
}
