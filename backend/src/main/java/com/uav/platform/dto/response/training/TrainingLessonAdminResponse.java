package com.uav.platform.dto.response.training;

import com.fasterxml.jackson.annotation.JsonInclude;

import lombok.Builder;

import java.util.List;

/**
 * Every editable field of a lesson, as the admin editor sends it back. videoUrl and documentUrl are the links
 * as entered.
 * Each slide and resource also carries a signed preview url (null when storage is not configured).
 */
@Builder
public record TrainingLessonAdminResponse(
        Long id,
        Long courseId,
        String sectionTitle,
        String title,
        String type,
        Integer sortOrder,
        Integer durationMinutes,
        Boolean active,
        String videoUrl,
        Long videoAssetId,
        @JsonInclude(JsonInclude.Include.NON_NULL) String videoFileName,
        @JsonInclude(JsonInclude.Include.NON_NULL) String videoSignedUrl,
        Long documentAssetId,
        @JsonInclude(JsonInclude.Include.NON_NULL) String documentFileName,
        @JsonInclude(JsonInclude.Include.NON_NULL) String documentSignedUrl,
        String documentUrl,
        @JsonInclude(JsonInclude.Include.NON_NULL) TrainingLessonDetailResponse.Document document,
        String bodyMarkdown,
        List<Slide> slides,
        List<Resource> resources) {

    public record Slide(Long assetId, String caption, String url) {}

    public record Resource(
            Long assetId,
            String title,
            String url,
            @JsonInclude(JsonInclude.Include.NON_NULL) String contentType,
            @JsonInclude(JsonInclude.Include.NON_NULL) Long size) {
        public Resource(Long assetId, String title, String url) {
            this(assetId, title, url, null, null);
        }
    }
}
