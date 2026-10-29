package com.uav.platform.modules.training.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

/**
 * A downloadable file of a lesson (PDF or image); its position is the list index
 * (training_lesson_resources.sort_order).
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TrainingLessonResource implements Serializable {

    @Column(name = "asset_id", nullable = false)
    private Long assetId;

    @Column(nullable = false, length = 220)
    private String title;
}
