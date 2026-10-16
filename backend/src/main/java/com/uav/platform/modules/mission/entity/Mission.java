package com.uav.platform.modules.mission.entity;


import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.uav.entity.Uav;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumSet;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "missions", uniqueConstraints = @UniqueConstraint(name = "uk_mission_code", columnNames = "code"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
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
    private UavService service;
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
    @Column(name = "operator_conflict_note", length = 1000)
    private String operatorConflictNote;

    public static Mission draft(AppUser customer, MissionType type, String title, String description,
                                 LocalDate requestedDate, LocalDateTime startTime, LocalDateTime expectedEndTime,
                                 String locationName, BigDecimal latitude, BigDecimal longitude,
                                 MissionPriority priority, String notes) {
        if (type == null || title == null || title.isBlank() || requestedDate == null || startTime == null
                || expectedEndTime == null || !expectedEndTime.isAfter(startTime)
                || locationName == null || locationName.isBlank()) {
            throw new IllegalArgumentException("Mission input is invalid");
        }
        Mission mission = new Mission();
        mission.customer = customer;
        mission.missionType = type;
        mission.title = title.trim();
        mission.description = description;
        mission.requestedDate = requestedDate;
        mission.startTime = startTime;
        mission.expectedEndTime = expectedEndTime;
        mission.locationName = locationName.trim();
        mission.latitude = latitude;
        mission.longitude = longitude;
        mission.priority = priority == null ? MissionPriority.NORMAL : priority;
        mission.notes = notes;
        return mission;
    }

    public void setCode(String code) { this.code = code; }
    public void setService(UavService service) { this.service = service; }

    public void complete(String completionNote, String equipmentCondition) {
        this.completionNote = completionNote; this.equipmentCondition = equipmentCondition;
        transitionTo(MissionStatus.COMPLETED);
    }

    public void fail(String failureReason, String failureNotes) {
        this.failureReason = failureReason; this.failureNotes = failureNotes;
        transitionTo(MissionStatus.FAILED);
    }

    public void acceptOperator() { requirePreflight(); operatorAccepted = true; operatorConflictNote = null; }
    public void reportOperatorConflict(String note) {
        requirePreflight(); operatorAccepted = false; operatorConflictNote = note;
        if (status == MissionStatus.READY) status = MissionStatus.RESOURCE_RESERVED;
    }

    public void invalidateAcceptance() { operatorAccepted = false; operatorConflictNote = null; }

    public void requireMediaWritable() {
        if (status == MissionStatus.COMPLETED || status == MissionStatus.FAILED
                || status == MissionStatus.CANCELLED || status == MissionStatus.REJECTED) {
            throw com.uav.platform.error.SystemException.conflict("MISSION_MEDIA_LOCKED");
        }
    }

    private void requirePreflight() {
        if (status != MissionStatus.CONFIRMED && status != MissionStatus.RESOURCE_RESERVED && status != MissionStatus.READY) {
            throw new IllegalStateException("MISSION_INVALID_STATUS");
        }
    }

    public void updateDraft(String title, String description, LocalDate requestedDate,
                            LocalDateTime startTime, LocalDateTime expectedEndTime,
                            String locationName, BigDecimal latitude, BigDecimal longitude,
                            MissionPriority priority, String notes) {
        if (status != MissionStatus.DRAFT) throw new IllegalStateException("MISSION_INVALID_STATUS");
        if (title == null || title.isBlank() || requestedDate == null || startTime == null || expectedEndTime == null
                || !expectedEndTime.isAfter(startTime) || locationName == null || locationName.isBlank()) {
            throw new IllegalArgumentException("Mission input is invalid");
        }
        this.title = title.trim(); this.description = description; this.requestedDate = requestedDate;
        this.startTime = startTime; this.expectedEndTime = expectedEndTime; this.locationName = locationName.trim();
        this.latitude = latitude; this.longitude = longitude;
        this.priority = priority == null ? MissionPriority.NORMAL : priority; this.notes = notes;
    }

    public void assignStation(Station station) { this.station = station; }
    public void assignUav(Uav uav) { this.uav = uav; }
    /** Re-dispatch is a pre-flight operation, separate from ordinary lifecycle transitions. */
    public void redispatchUav(Uav replacement, boolean equipmentReserved) {
        if (status != MissionStatus.CONFIRMED && status != MissionStatus.RESOURCE_RESERVED && status != MissionStatus.READY) {
            throw new IllegalStateException("MISSION_INVALID_STATUS");
        }
        this.uav = replacement;
        this.operatorAccepted = false;
        this.operatorConflictNote = null;
        this.status = hasRequiredResources(equipmentReserved) ? MissionStatus.RESOURCE_RESERVED : MissionStatus.CONFIRMED;
    }

    public void resetDispatch(boolean equipmentReserved) {
        requirePreflight();
        operatorAccepted = false;
        operatorConflictNote = null;
        status = hasRequiredResources(equipmentReserved) ? MissionStatus.RESOURCE_RESERVED : MissionStatus.CONFIRMED;
    }

    public void assignOperator(AppUser operator) { this.operator = operator; }
    public boolean hasRequiredResources(boolean equipmentReserved) {
        return station != null && uav != null && operator != null && equipmentReserved;
    }

    public void transitionTo(MissionStatus target) {
        if (target == null || !allowedTransitions(status).contains(target)) {
            throw new IllegalStateException("MISSION_INVALID_STATUS");
        }
        status = target;
        if (target == MissionStatus.CANCELLED) cancelledAt = LocalDateTime.now();
        if (target == MissionStatus.COMPLETED) completedAt = LocalDateTime.now();
    }

    private static EnumSet<MissionStatus> allowedTransitions(MissionStatus current) {
        return switch (current) {
            case DRAFT -> EnumSet.of(MissionStatus.PENDING_CONFIRMATION, MissionStatus.CANCELLED);
            case PENDING_CONFIRMATION -> EnumSet.of(MissionStatus.CONFIRMED, MissionStatus.CANCELLED, MissionStatus.REJECTED);
            case CONFIRMED -> EnumSet.of(MissionStatus.RESOURCE_RESERVED, MissionStatus.CANCELLED, MissionStatus.REJECTED);
            case RESOURCE_RESERVED -> EnumSet.of(MissionStatus.READY, MissionStatus.CANCELLED, MissionStatus.FAILED);
            case READY -> EnumSet.of(MissionStatus.IN_PROGRESS, MissionStatus.CANCELLED, MissionStatus.FAILED);
            case IN_PROGRESS -> EnumSet.of(MissionStatus.COMPLETED, MissionStatus.FAILED);
            case COMPLETED, CANCELLED, REJECTED, FAILED -> EnumSet.noneOf(MissionStatus.class);
        };
    }

}
