package com.uav.platform.modules.training.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.user.entity.AppUser;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "user_training_progress")
@Getter
@Setter
@NoArgsConstructor
public class UserTrainingProgress extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private TrainingDocument document;

    @Column(nullable = false, length = 20)
    private String status = "IN_PROGRESS";

    @Column(name = "checked_steps_json", nullable = false, columnDefinition = "TEXT")
    private String checkedStepsJson = "[]";

    @Column(name = "last_viewed_at", nullable = false)
    private OffsetDateTime lastViewedAt = OffsetDateTime.now();

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;
}
