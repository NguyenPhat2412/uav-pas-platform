package com.uav.platform.modules.sar.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.media.entity.MediaAsset;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.sar.common.AiTaskStatus;
import com.uav.platform.modules.sar.common.AiTaskType;
import com.uav.platform.modules.sar.common.ProcessingNode;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_tasks")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiTask extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mission_id", nullable = false)
    private Mission mission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "media_id")
    private MediaAsset media;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_type", nullable = false, length = 50)
    private AiTaskType taskType = AiTaskType.OBJECT_DETECTION_YOLOV8S;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private AiTaskStatus status = AiTaskStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "processing_node", nullable = false, length = 40)
    private ProcessingNode processingNode = ProcessingNode.KV260_EDGE;

    @Column(name = "confidence_threshold")
    private Double confidenceThreshold = 0.75;

    @Column(name = "inference_time_ms")
    private Integer inferenceTimeMs;

    private Double fps;

    @Column(name = "dpu_utilization")
    private Double dpuUtilization;

    @Column(name = "soc_temperature")
    private Double socTemperature;

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    public AiTask(Mission mission, MediaAsset media, AiTaskType taskType, ProcessingNode processingNode, Double confidenceThreshold) {
        this.mission = mission;
        this.media = media;
        this.taskType = taskType != null ? taskType : AiTaskType.OBJECT_DETECTION_YOLOV8S;
        this.processingNode = processingNode != null ? processingNode : ProcessingNode.KV260_EDGE;
        this.confidenceThreshold = confidenceThreshold != null ? confidenceThreshold : 0.75;
        this.status = AiTaskStatus.PENDING;
    }
}
