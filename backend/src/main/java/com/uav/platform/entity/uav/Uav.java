package com.uav.platform.entity.uav;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.entity.station.Station;
import com.uav.platform.enums.uav.*;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "uavs")
@Getter
@Setter
@NoArgsConstructor
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

    public Uav(String model, String serialNumber, String manufacturer) {
        this.model = model;
        this.serialNumber = serialNumber;
        this.manufacturer = manufacturer;
    }
}
