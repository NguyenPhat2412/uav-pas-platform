package com.uav.platform.modules.mission.entity;


import com.uav.platform.modules.mission.common.*;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.inventory.entity.Equipment;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "mission_equipment_reservations")
public class MissionEquipmentReservation extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mission_id", nullable = false)
    private Mission mission;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;
    @Column(nullable = false)
    private int quantity;
    @Column(nullable = false)
    private boolean released;
    @Column(name = "reserved_by", length = 100)
    private String reservedBy;
    @Column(name = "released_at")
    private LocalDateTime releasedAt;

    protected MissionEquipmentReservation() {}
    public MissionEquipmentReservation(Mission mission, Equipment equipment, int quantity, String reservedBy) {
        if (quantity <= 0) throw new IllegalArgumentException("Quantity must be positive");
        this.mission = mission; this.equipment = equipment; this.quantity = quantity; this.reservedBy = reservedBy;
    }
    public Mission getMission() { return mission; }
    public Equipment getEquipment() { return equipment; }
    public int getQuantity() { return quantity; }
    public boolean isReleased() { return released; }
    public String getReservedBy() { return reservedBy; }
    public LocalDateTime getReleasedAt() { return releasedAt; }
    public void release() { released = true; releasedAt = LocalDateTime.now(); }
}
