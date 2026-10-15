package com.uav.platform.modules.maintenance.entity;

import com.uav.platform.modules.maintenance.common.RepairStatus;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.uav.entity.Uav;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity @Table(name = "repair_orders")
@Getter @NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RepairOrder extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "uav_id", nullable = false) private Uav uav;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "schedule_id") private MaintenanceSchedule schedule;
    @Column(nullable = false, length = 160) private String title;
    @Column(length = 2000) private String description;
    @Column(nullable = false) private LocalDate plannedDate;
    @Column(nullable = false, length = 120) private String technicianName;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private RepairStatus status = RepairStatus.OPEN;
    @Version @Column(nullable = false) private long version;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private LocalDateTime cancelledAt;
    @Column(length = 1000) private String inspectionNotes;
    @Column(length = 1000) private String cancelReason;
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true) @OrderBy("id asc")
    private List<RepairMaterial> materials = new ArrayList<>();

    public RepairOrder(Uav uav, MaintenanceSchedule schedule, String title, String description,
                       LocalDate plannedDate, String technicianName) {
        this.uav = uav; this.schedule = schedule; update(title, description, plannedDate, technicianName);
    }
    public void update(String title, String description, LocalDate plannedDate, String technicianName) {
        this.title = title; this.description = description; this.plannedDate = plannedDate;
        this.technicianName = technicianName; touch();
    }
    public void replaceMaterials(List<RepairMaterial> items) { materials.clear(); materials.addAll(items); touch(); }
    public void start(LocalDateTime now) { status = RepairStatus.IN_PROGRESS; startedAt = now; touch(); }
    public void complete(LocalDateTime now, String notes) { status = RepairStatus.COMPLETED; completedAt = now; inspectionNotes = notes; touch(); }
    public void cancel(LocalDateTime now, String reason) { status = RepairStatus.CANCELLED; cancelledAt = now; cancelReason = reason; touch(); }
    public BigDecimal totalMaterialCost() { return materials.stream().map(RepairMaterial::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add); }
    private void touch() { setUpdatedAt(LocalDateTime.now()); }
}
