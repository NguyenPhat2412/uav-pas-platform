package com.uav.platform.modules.mission.entity;


import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.common.entity.BaseEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "mission_events")
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

    protected MissionEvent() {}

    public MissionEvent(Mission mission, MissionEventType eventType, AppUser actor,
                        MissionStatus oldStatus, MissionStatus newStatus, String description, String metadata) {
        this.mission = mission; this.eventType = eventType; this.actor = actor;
        this.oldStatus = oldStatus; this.newStatus = newStatus; this.description = description; this.metadata = metadata;
    }
    public Mission getMission() { return mission; }
    public MissionEventType getEventType() { return eventType; }
    public AppUser getActor() { return actor; }
    public MissionStatus getOldStatus() { return oldStatus; }
    public MissionStatus getNewStatus() { return newStatus; }
    public String getDescription() { return description; }
    public String getMetadata() { return metadata; }
}
