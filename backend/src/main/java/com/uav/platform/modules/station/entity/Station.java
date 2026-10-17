package com.uav.platform.modules.station.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.station.enums.*;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "uav_stations")
@Getter
@Setter
@NoArgsConstructor
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
}
