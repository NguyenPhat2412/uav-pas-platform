package com.uav.platform.entity.airspace;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.enums.airspace.AirspaceGeometryType;
import com.uav.platform.enums.airspace.AirspaceZoneType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "airspace_zones",
        uniqueConstraints = @UniqueConstraint(name = "uk_airspace_zone_code", columnNames = "code"))
@Getter
@Setter
@NoArgsConstructor
public class AirspaceZone extends BaseEntity {

    @Column(nullable = false, unique = true, length = 40)
    private String code;

    @Column(nullable = false, length = 180)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "zone_type", nullable = false, length = 20)
    private AirspaceZoneType zoneType;

    @Enumerated(EnumType.STRING)
    @Column(name = "geometry_type", nullable = false, length = 20)
    private AirspaceGeometryType geometryType;

    @Column(name = "center_lat", nullable = false, precision = 10, scale = 7)
    private BigDecimal centerLat;

    @Column(name = "center_lng", nullable = false, precision = 10, scale = 7)
    private BigDecimal centerLng;

    @Column(name = "radius_meters")
    private Integer radiusMeters;

    @Column(name = "polygon_vertices", columnDefinition = "TEXT")
    private String polygonVertices;

    @Column(name = "max_altitude_agl_m")
    private Integer maxAltitudeAglM;

    @Column(nullable = false, length = 180)
    private String authority;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "effective_from")
    private LocalDateTime effectiveFrom;

    @Column(name = "effective_until")
    private LocalDateTime effectiveUntil;

    @Column(length = 1000)
    private String description;
}
