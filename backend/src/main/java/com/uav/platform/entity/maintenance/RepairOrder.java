package com.uav.platform.entity.maintenance;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.enums.maintenance.RepairStatus;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "repair_orders")
@Getter
@Setter
@NoArgsConstructor
public class RepairOrder extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "uav_id", nullable = false)
    private Uav uav;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_id")
    private MaintenanceSchedule schedule;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private LocalDate plannedDate;

    @Column(nullable = false, length = 120)
    private String technicianName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RepairStatus status = RepairStatus.OPEN;

    @Version
    @Column(nullable = false)
    private long version;

    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private LocalDateTime cancelledAt;

    @Column(length = 1000)
    private String inspectionNotes;

    @Column(length = 1000)
    private String cancelReason;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id asc")
    private List<RepairMaterial> materials = new ArrayList<>();
}
