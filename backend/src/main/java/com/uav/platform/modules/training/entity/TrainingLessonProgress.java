package com.uav.platform.modules.training.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.user.entity.AppUser;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/** A learner's state in one lesson: completion time and the last video position. */
@Entity
@Table(
        name = "training_lesson_progress",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "uq_training_lesson_progress",
                        columnNames = {"user_id", "lesson_id"}))
@Getter
@Setter
@NoArgsConstructor
public class TrainingLessonProgress extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lesson_id", nullable = false)
    private TrainingLesson lesson;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "position_seconds", nullable = false)
    private Integer positionSeconds = 0;
}
