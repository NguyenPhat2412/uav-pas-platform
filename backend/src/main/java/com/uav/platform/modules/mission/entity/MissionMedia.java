package com.uav.platform.modules.mission.entity;


import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.media.entity.MediaAsset;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "mission_media", uniqueConstraints = @UniqueConstraint(name = "uk_mission_media", columnNames = {"mission_id", "media_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MissionMedia extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mission_id", nullable = false)
    private Mission mission;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "media_id", nullable = false)
    private MediaAsset media;
    @Enumerated(EnumType.STRING)
    @Column(name = "media_role", nullable = false, length = 30)
    private MediaRole mediaRole;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by")
    private AppUser uploadedBy;

    public MissionMedia(Mission mission, MediaAsset media, MediaRole mediaRole, AppUser uploadedBy) {
        this.mission = mission; this.media = media; this.mediaRole = mediaRole; this.uploadedBy = uploadedBy;
    }
}
