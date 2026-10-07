package com.uav.platform.modules.station.entity;


import com.uav.platform.modules.station.common.*;

import com.uav.platform.common.entity.BaseEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "uav_stations")
public class Station extends BaseEntity {
    @Column(nullable = false, unique = true, length = 40)
    private String code;
    @Column(nullable = false, length = 120)
    private String name;
    @Column(length = 255)
    private String address;
    private Double latitude;
    private Double longitude;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StationStatus status = StationStatus.ACTIVE;

    protected Station() {}

    public Station(String code, String name, String address, Double latitude, Double longitude, StationStatus status) {
        this.code = code;
        this.name = name;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
        this.status = status == null ? StationStatus.ACTIVE : status;
    }

    public String getCode() { return code; }
    public String getName() { return name; }
    public String getAddress() { return address; }
    public Double getLatitude() { return latitude; }
    public Double getLongitude() { return longitude; }
    public StationStatus getStatus() { return status; }
    public void update(String name, String address, Double latitude, Double longitude, StationStatus status) {
        this.name = name; this.address = address; this.latitude = latitude; this.longitude = longitude;
        if (status != null) this.status = status;
    }
}
