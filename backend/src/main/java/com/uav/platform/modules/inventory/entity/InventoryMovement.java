package com.uav.platform.modules.inventory.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.inventory.enums.*;
import com.uav.platform.modules.station.entity.Station;

import jakarta.persistence.*;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "inventory_movements")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InventoryMovement extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MovementType type;

    @Column(nullable = false)
    private int quantity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_station_id")
    private Station fromStation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_station_id")
    private Station toStation;

    @Column(length = 100)
    private String actor;

    @Column(length = 255)
    private String note;

    @Column(name = "request_id", unique = true, length = 120)
    private String requestId;

    public InventoryMovement(
            Equipment equipment,
            MovementType type,
            int quantity,
            Station fromStation,
            Station toStation,
            String actor,
            String note) {
        this.equipment = equipment;
        this.type = type;
        this.quantity = quantity;
        this.fromStation = fromStation;
        this.toStation = toStation;
        this.actor = actor;
        this.note = note;
    }

    public InventoryMovement(
            Equipment equipment,
            MovementType type,
            int quantity,
            Station fromStation,
            Station toStation,
            String actor,
            String note,
            String requestId) {
        this(equipment, type, quantity, fromStation, toStation, actor, note);
        this.requestId = requestId;
    }
}
