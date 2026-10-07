package com.uav.platform.modules.inventory.entity;


import com.uav.platform.modules.inventory.common.*;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.station.entity.Station;
import jakarta.persistence.*;

@Entity
@Table(name = "equipment")
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

    protected Equipment() {}
    public Equipment(String name, EquipmentType type, String serialNumber, Station station) {
        this.name = name; this.type = type; this.serialNumber = serialNumber; this.station = station;
    }
    public String getName() { return name; }
    public EquipmentType getType() { return type; }
    public String getSerialNumber() { return serialNumber; }
    public int getQuantity() { return quantity; }
    public int getAvailableQuantity() { return availableQuantity; }
    public int getReservedQuantity() { return reservedQuantity; }
    public EquipmentStatus getStatus() { return status; }
    public Station getStation() { return station; }
    public void update(String name, EquipmentType type, Station station) { this.name = name; this.type = type; this.station = station; }
    public void stockIn(int amount) { requirePositive(amount); quantity += amount; availableQuantity += amount; }
    public void stockOut(int amount) { requirePositive(amount); if (availableQuantity < amount) throw new IllegalStateException("Insufficient available equipment"); quantity -= amount; availableQuantity -= amount; }
    public void reserve(int amount) { requirePositive(amount); if (availableQuantity < amount) throw new IllegalStateException("Insufficient available equipment"); availableQuantity -= amount; reservedQuantity += amount; }
    public void release(int amount) { requirePositive(amount); if (reservedQuantity < amount) throw new IllegalStateException("Insufficient reserved equipment"); reservedQuantity -= amount; availableQuantity += amount; }
    public void transferOut(int amount) { stockOut(amount); }
    public void setStation(Station station) { this.station = station; }
    private void requirePositive(int amount) { if (amount <= 0) throw new IllegalArgumentException("Quantity must be positive"); }
}
