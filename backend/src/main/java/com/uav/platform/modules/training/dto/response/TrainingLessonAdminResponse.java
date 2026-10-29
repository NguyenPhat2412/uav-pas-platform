package com.uav.platform.modules.training.dto.response;

import lombok.Builder;

import java.util.List;

/**
 * Every editable field of a lesson, as the admin editor sends it back. videoUrl is the link as entered.
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
        Long documentAssetId,
        String bodyMarkdown,
        List<Slide> slides,
        List<Resource> resources) {

    public record Slide(Long assetId, String caption, String url) {}

    public record Resource(Long assetId, String title, String url) {}
}
