package com.uav.platform.modules.maintenance.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.maintenance.enums.DueStatus;
import com.uav.platform.modules.uav.entity.Uav;

import jakarta.persistence.*;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "maintenance_schedules")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MaintenanceSchedule extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "uav_id", nullable = false)
    private Uav uav;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false)
    private int intervalDays;

    @Column(nullable = false)
    private LocalDate nextDueDate;

    private LocalDate lastCompletedDate;

    @Column(nullable = false)
    private boolean active = true;

    @Version
    @Column(nullable = false)
    private long version;

    public MaintenanceSchedule(Uav uav, String title, int intervalDays, LocalDate nextDueDate) {
        this.uav = uav;
        update(title, intervalDays, nextDueDate, true);
    }

    public void update(String title, int intervalDays, LocalDate nextDueDate, boolean active) {
        this.title = title;
        this.intervalDays = intervalDays;
        this.nextDueDate = nextDueDate;
        this.active = active;
        setUpdatedAt(LocalDateTime.now());
    }

    public void completedOn(LocalDate date) {
        lastCompletedDate = date;
        nextDueDate = date.plusDays(intervalDays);
    }

    public DueStatus dueStatus(LocalDate today) {
        if (!active) return DueStatus.PAUSED;
        if (nextDueDate.isBefore(today)) return DueStatus.OVERDUE;
        return nextDueDate.equals(today) ? DueStatus.DUE : DueStatus.UPCOMING;
    }
}
