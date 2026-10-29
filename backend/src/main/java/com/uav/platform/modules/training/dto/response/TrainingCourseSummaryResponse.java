package com.uav.platform.modules.training.dto.response;

import lombok.Builder;

/** One course card: the document's catalogue fields plus the caller's lesson progress. */
@Builder
public record TrainingCourseSummaryResponse(
        Long id,
        String code,
        String slug,
        String title,
        String summary,
        String category,
        String level,
        String targetPortal,
        Boolean isMandatory,
        Integer estimatedMinutes,
        String coverUrl,
        int lessonCount,
        int videoCount,
        int documentCount,
        int completedLessons,
        int progressPercent,
        String status) {}
