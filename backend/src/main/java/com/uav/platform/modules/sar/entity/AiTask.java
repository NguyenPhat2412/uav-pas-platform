package com.uav.platform.modules.sar.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.media.entity.MediaAsset;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.sar.enums.AiTaskStatus;
import com.uav.platform.modules.sar.enums.AiTaskType;
import com.uav.platform.modules.sar.enums.ProcessingNode;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_tasks")
@Getter
@Setter
@NoArgsConstructor
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
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.NUMERIC)
    private Double confidenceThreshold = 0.75;

    @Column(name = "inference_time_ms")
    private Integer inferenceTimeMs;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.NUMERIC)
    private Double fps;

    @Column(name = "dpu_utilization")
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.NUMERIC)
    private Double dpuUtilization;

    @Column(name = "soc_temperature")
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.NUMERIC)
    private Double socTemperature;

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}
