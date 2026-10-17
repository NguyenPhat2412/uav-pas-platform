package com.uav.platform.modules.mission.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.user.entity.AppUser;

import jakarta.persistence.*;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "mission_events")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MissionEvent extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mission_id", nullable = false)
    private Mission mission;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 50)
    private MissionEventType eventType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private AppUser actor;

    @Enumerated(EnumType.STRING)
    @Column(name = "old_status", length = 30)
    private MissionStatus oldStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", length = 30)
    private MissionStatus newStatus;

    @Column(length = 500)
    private String description;

    @Column(columnDefinition = "text")
    private String metadata;

    public MissionEvent(
            Mission mission,
            MissionEventType eventType,
            AppUser actor,
            MissionStatus oldStatus,
            MissionStatus newStatus,
            String description,
            String metadata) {
        this.mission = mission;
        this.eventType = eventType;
        this.actor = actor;
        this.oldStatus = oldStatus;
        this.newStatus = newStatus;
        this.description = description;
        this.metadata = metadata;
    }
}
