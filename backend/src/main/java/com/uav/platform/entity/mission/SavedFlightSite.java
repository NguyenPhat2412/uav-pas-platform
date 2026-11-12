package com.uav.platform.entity.mission;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.mission.MissionType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "saved_flight_sites")
@Getter
@Setter
@NoArgsConstructor
public class SavedFlightSite extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "location_name", nullable = false, length = 255)
    private String locationName;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    @Enumerated(EnumType.STRING)
    @Column(name = "default_mission_type", nullable = false, length = 30)
    private MissionType defaultMissionType;

    @Column(name = "flight_plan", columnDefinition = "TEXT")
    private String flightPlan;

    @Column(length = 1000)
    private String notes;
}
