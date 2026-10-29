package com.uav.platform.modules.training.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.training.enums.TrainingLessonType;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import org.hibernate.annotations.BatchSize;

import java.util.ArrayList;
import java.util.List;

/** One lesson of a training course (a {@link TrainingDocument}), ordered by sortOrder then id. */
@Entity
@Table(name = "training_lessons")
@Getter
@Setter
@NoArgsConstructor
public class TrainingLesson extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "document_id", nullable = false)
    private TrainingDocument document;

    @Column(name = "section_title", length = 120)
    private String sectionTitle;

    @Column(nullable = false, length = 220)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "lesson_type", nullable = false, length = 20)
    private TrainingLessonType type;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes = 5;

    @Column(nullable = false)
    private Boolean active = true;

    /** External link exactly as entered; learners get the normalised embed URL. */
    @Column(name = "video_url", length = 500)
    private String videoUrl;

    @Column(name = "video_asset_id")
    private Long videoAssetId;

    /** READY application/pdf asset of a DOCUMENT lesson; exclusive with documentUrl. */
    @Column(name = "document_asset_id")
    private Long documentAssetId;

    /**
     * Google Docs / Slides / Sheets or Drive file link of a DOCUMENT lesson, exactly as entered; learners get the
     * embeddable /preview URL.
     */
    @Column(name = "document_url", length = 500)
    private String documentUrl;

    @Column(name = "body_markdown", columnDefinition = "TEXT")
    private String bodyMarkdown;

    // Batched so listing many lessons loads slides and resources in a few queries, not one per
    // lesson.
    @BatchSize(size = 50)
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "training_lesson_slides", joinColumns = @JoinColumn(name = "lesson_id"))
    @OrderColumn(name = "sort_order")
    private List<TrainingLessonSlide> slides = new ArrayList<>();

    /** Downloadable files of the lesson (any type), in display order. */
    @BatchSize(size = 50)
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
            name = "training_lesson_resources",
            joinColumns = @JoinColumn(name = "lesson_id"))
    @OrderColumn(name = "sort_order")
    private List<TrainingLessonResource> resources = new ArrayList<>();
}
