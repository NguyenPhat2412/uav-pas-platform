package com.uav.platform.modules.mission.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.inventory.entity.Equipment;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "mission_equipment_reservations")
@Getter
@Setter
@NoArgsConstructor
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
}
