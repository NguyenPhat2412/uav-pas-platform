package com.uav.platform.modules.uav.entity;


import com.uav.platform.modules.uav.common.*;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.station.entity.Station;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "uavs")
public class Uav extends BaseEntity {
    @Column(nullable = false, length = 100)
    private String model;
    @Column(name = "serial_number", nullable = false, unique = true, length = 100)
    private String serialNumber;
    @Column(nullable = false, length = 120)
    private String manufacturer;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UavStatus status = UavStatus.AVAILABLE;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "station_id")
    private Station station;
    @Column(name = "last_maintenance_at")
    private LocalDateTime lastMaintenanceAt;

    protected Uav() {}
    public Uav(String model, String serialNumber, String manufacturer) {
        this.model = model; this.serialNumber = serialNumber; this.manufacturer = manufacturer;
    }
    public String getModel() { return model; }
    public String getSerialNumber() { return serialNumber; }
    public String getManufacturer() { return manufacturer; }
    public UavStatus getStatus() { return status; }
    public Station getStation() { return station; }
    public LocalDateTime getLastMaintenanceAt() { return lastMaintenanceAt; }
    public void update(String model, String manufacturer) { this.model = model; this.manufacturer = manufacturer; }
    public void setStatus(UavStatus status) { this.status = status; }
    public void setStation(Station station) { this.station = station; }
    public void markMaintenance() { this.status = UavStatus.MAINTENANCE; this.lastMaintenanceAt = LocalDateTime.now(); }
}
