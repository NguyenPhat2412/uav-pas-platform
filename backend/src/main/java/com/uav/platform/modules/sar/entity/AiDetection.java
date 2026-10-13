package com.uav.platform.modules.sar.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.mission.entity.Mission;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "ai_detections")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiDetection extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ai_task_id", nullable = false)
    private AiTask aiTask;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mission_id", nullable = false)
    private Mission mission;

    @Column(nullable = false, length = 60)
    private String label;

    @Column(nullable = false)
    private Double confidence;

    @Column(name = "box_top", nullable = false)
    private Double boxTop;

    @Column(name = "box_left", nullable = false)
    private Double boxLeft;

    @Column(name = "box_width", nullable = false)
    private Double boxWidth;

    @Column(name = "box_height", nullable = false)
    private Double boxHeight;

    private Double latitude;
    private Double longitude;

    @Column(name = "tracking_id", length = 40)
    private String trackingId;

    @Column(nullable = false)
    private Boolean verified = false;

    @Column(name = "verified_by", length = 100)
    private String verifiedBy;

    public AiDetection(AiTask aiTask, Mission mission, String label, Double confidence,
                       Double boxTop, Double boxLeft, Double boxWidth, Double boxHeight,
                       Double latitude, Double longitude, String trackingId) {
        this.aiTask = aiTask;
        this.mission = mission;
        this.label = label;
        this.confidence = confidence;
        this.boxTop = boxTop;
        this.boxLeft = boxLeft;
        this.boxWidth = boxWidth;
        this.boxHeight = boxHeight;
        this.latitude = latitude;
        this.longitude = longitude;
        this.trackingId = trackingId;
        this.verified = false;
    }
}
