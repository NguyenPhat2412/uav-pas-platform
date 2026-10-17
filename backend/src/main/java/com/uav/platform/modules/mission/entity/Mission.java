package com.uav.platform.modules.mission.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.uav.entity.Uav;
import com.uav.platform.modules.user.entity.AppUser;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "missions",
        uniqueConstraints = @UniqueConstraint(name = "uk_mission_code", columnNames = "code"))
@Getter
@Setter
@NoArgsConstructor
public class Mission extends BaseEntity {
    @Version
    @Column(nullable = false, columnDefinition = "bigint default 0")
    private long version;

    @Column(nullable = false, unique = true, length = 30)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private AppUser customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id")
    private ServiceOffering service;

    @Enumerated(EnumType.STRING)
    @Column(name = "mission_type", nullable = false, length = 30)
    private MissionType missionType;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(length = 2000)
    private String description;

    @Column(name = "requested_date", nullable = false)
    private LocalDate requestedDate;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "expected_end_time", nullable = false)
    private LocalDateTime expectedEndTime;

    @Column(name = "location_name", nullable = false, length = 255)
    private String locationName;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "station_id")
    private Station station;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uav_id")
    private Uav uav;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "operator_id")
    private AppUser operator;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MissionPriority priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private MissionStatus status = MissionStatus.DRAFT;

    @Column(length = 2000)
    private String notes;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "completion_note", length = 2000)
    private String completionNote;

    @Column(name = "equipment_condition", length = 500)
    private String equipmentCondition;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @Column(name = "failure_notes", length = 2000)
    private String failureNotes;

    @Column(name = "operator_accepted", nullable = false)
    private boolean operatorAccepted;

    @Column(name = "billing_status", nullable = false, length = 20)
    private String billingStatus = "NOT_REQUESTED";

    @Column(name = "operator_conflict_note", length = 1000)
    private String operatorConflictNote;
}
