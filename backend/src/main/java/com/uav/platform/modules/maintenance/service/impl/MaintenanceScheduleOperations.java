package com.uav.platform.modules.maintenance.service.impl;

import com.uav.platform.modules.maintenance.entity.*;
import com.uav.platform.modules.maintenance.enums.DueStatus;
import com.uav.platform.modules.uav.entity.Uav;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Internal service implementation rules; persistence entities contain data only. */
public final class MaintenanceScheduleOperations {
    private MaintenanceScheduleOperations() {}

    public static MaintenanceSchedule create(
            Uav uav, String title, int intervalDays, LocalDate nextDueDate) {
        MaintenanceSchedule value = new MaintenanceSchedule();

        value.setUav(uav);
        update(value, title, intervalDays, nextDueDate, true);

        return value;
    }

    public static void update(
            MaintenanceSchedule value,
            String title,
            int intervalDays,
            LocalDate nextDueDate,
            boolean active) {
        value.setTitle(title);
        value.setIntervalDays(intervalDays);
        value.setNextDueDate(nextDueDate);
        value.setActive(active);
        value.setUpdatedAt(LocalDateTime.now());
    }

    public static void completedOn(MaintenanceSchedule value, LocalDate date) {
        value.setLastCompletedDate(date);
        value.setNextDueDate(date.plusDays(value.getIntervalDays()));
    }

    public static DueStatus dueStatus(MaintenanceSchedule value, LocalDate today) {
        if (!value.isActive()) return DueStatus.PAUSED;
        if (value.getNextDueDate().isBefore(today)) return DueStatus.OVERDUE;
        return value.getNextDueDate().equals(today) ? DueStatus.DUE : DueStatus.UPCOMING;
    }
}
