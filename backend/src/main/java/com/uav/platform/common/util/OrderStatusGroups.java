package com.uav.platform.common.util;

import com.uav.platform.enums.mission.MissionStatus;

import java.util.List;
import java.util.Locale;

/**
 * Maps internal {@link MissionStatus} and review completion into the 5 Shopee-style customer order
 * groups defined in CONTRACT.md §1 (PENDING, SCHEDULED, IN_FLIGHT, DELIVERED, TO_REVIEW) plus
 * CANCELLED for terminal aborted/rejected missions.
 */
public final class OrderStatusGroups {

    public static final String PENDING = "PENDING";
    public static final String SCHEDULED = "SCHEDULED";
    public static final String IN_FLIGHT = "IN_FLIGHT";
    public static final String DELIVERED = "DELIVERED";
    public static final String TO_REVIEW = "TO_REVIEW";
    public static final String CANCELLED = "CANCELLED";

    public static final List<MissionStatus> PENDING_STATUSES =
            List.of(MissionStatus.DRAFT, MissionStatus.PENDING_CONFIRMATION);

    public static final List<MissionStatus> SCHEDULED_STATUSES =
            List.of(MissionStatus.CONFIRMED, MissionStatus.RESOURCE_RESERVED, MissionStatus.READY);

    public static final List<MissionStatus> TERMINAL_NON_ACTIVE_STATUSES =
            List.of(
                    MissionStatus.COMPLETED,
                    MissionStatus.CANCELLED,
                    MissionStatus.REJECTED,
                    MissionStatus.FAILED);

    public static final List<MissionStatus> CANCELLED_STATUSES =
            List.of(MissionStatus.CANCELLED, MissionStatus.REJECTED, MissionStatus.FAILED);

    private OrderStatusGroups() {}

    public static String fromMission(MissionStatus status, boolean reviewed) {
        if (status == null) {
            return PENDING;
        }
        return switch (status) {
            case DRAFT, PENDING_CONFIRMATION -> PENDING;
            case CONFIRMED, RESOURCE_RESERVED, READY -> SCHEDULED;
            case IN_PROGRESS -> IN_FLIGHT;
            case COMPLETED -> reviewed ? DELIVERED : TO_REVIEW;
            case CANCELLED, REJECTED, FAILED -> CANCELLED;
        };
    }

    public static String normalizeGroupParam(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return raw.trim().toUpperCase(Locale.ROOT);
    }
}
