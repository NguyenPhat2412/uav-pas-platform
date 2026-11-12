package com.uav.platform.entity.training;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

/** One image of a SLIDES lesson; its position is the list index (training_lesson_slides.sort_order). */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TrainingLessonSlide implements Serializable {

    @Column(name = "asset_id", nullable = false)
    private Long assetId;

    @Column(length = 300)
    private String caption;
}
