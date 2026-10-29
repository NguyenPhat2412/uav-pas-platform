package com.uav.platform.modules.training.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import lombok.Builder;

import java.util.List;

/**
 * Create or replace a lesson. VIDEO needs exactly one of videoUrl / videoAssetId, SLIDES at least one READY
 * image, ARTICLE a bodyMarkdown, DOCUMENT exactly one of documentAssetId (READY PDF) / documentUrl (https Google
 * Docs, Slides, Sheets or Drive file link). Any type may carry resources (READY PDFs, images or Word, PowerPoint,
 * Excel files). Fields that do not belong to the type are ignored.
 */
@Builder
public record UpsertTrainingLessonRequest(
        @NotNull Long courseId,
        @Size(max = 120) String sectionTitle,
        @NotBlank @Size(max = 220) String title,
        @NotBlank String type,
        Integer sortOrder,
        @Min(0) @Max(1440) Integer durationMinutes,
        Boolean active,
        @Size(max = 500) String videoUrl,
        Long videoAssetId,
        Long documentAssetId,
        @Size(max = 500) String documentUrl,
        @Size(max = 100_000) String bodyMarkdown,
        @Size(max = 60) List<@Valid @NotNull SlideRequest> slides,
        @Size(max = 30) List<@Valid @NotNull ResourceRequest> resources) {

    @Builder
    public record SlideRequest(@NotNull Long assetId, @Size(max = 300) String caption) {}

    /** A downloadable file; a blank title falls back to the uploaded file name. */
    @Builder
    public record ResourceRequest(@NotNull Long assetId, @Size(max = 220) String title) {}
}
