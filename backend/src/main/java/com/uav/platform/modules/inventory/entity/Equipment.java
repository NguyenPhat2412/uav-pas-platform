package com.uav.platform.modules.inventory.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.inventory.enums.*;
import com.uav.platform.modules.station.entity.Station;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "equipment")
@Getter
@Setter
@NoArgsConstructor
public class Equipment extends BaseEntity {
    @Version
    @Column(nullable = false, columnDefinition = "bigint default 0")
    private long version;

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EquipmentType type;

    @Column(unique = true, length = 100)
    private String serialNumber;

    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false)
    private int availableQuantity;

    @Column(nullable = false)
    private int reservedQuantity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EquipmentStatus status = EquipmentStatus.ACTIVE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "station_id")
    private Station station;

    public Equipment(String name, EquipmentType type, String serialNumber, Station station) {
        this.name = name;
        this.type = type;
        this.serialNumber = serialNumber;
        this.station = station;
    }
}
