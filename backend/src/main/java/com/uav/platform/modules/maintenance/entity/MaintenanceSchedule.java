package com.uav.platform.modules.maintenance.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.uav.entity.Uav;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "maintenance_schedules")
@Getter
@Setter
@NoArgsConstructor
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
}
