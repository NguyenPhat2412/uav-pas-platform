package com.uav.platform.modules.sar.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.sar.enums.SarStatus;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "sar_missions")
@Getter
@Setter
@NoArgsConstructor
public class SarMission extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mission_id", nullable = false, unique = true)
    private Mission mission;

    @Column(name = "search_area_polygon", nullable = false, columnDefinition = "TEXT")
    private String searchAreaPolygon;

    @Column(name = "lkp_latitude", nullable = false)
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.NUMERIC)
    private Double lkpLatitude;

    @Column(name = "lkp_longitude", nullable = false)
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.NUMERIC)
    private Double lkpLongitude;

    @Column(name = "drift_radius_meters")
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.NUMERIC)
    private Double driftRadiusMeters = 500.0;

    @Enumerated(EnumType.STRING)
    @Column(name = "sar_status", nullable = false, length = 40)
    private SarStatus sarStatus = SarStatus.SEARCHING;

    @Column(name = "emergency_contact", length = 100)
    private String emergencyContact;

    @Column(name = "victim_count_estimated")
    private Integer victimCountEstimated = 1;

    @Column(length = 2000)
    private String notes;

    /** Optimistic version: SAR edits send expectedVersion so a stale form cannot overwrite the area. */
    @Version
    @Column(name = "version", nullable = false)
    private long version;
}
