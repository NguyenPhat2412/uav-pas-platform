package com.uav.platform.modules.training.dto.response;

import lombok.Builder;

import java.util.List;

/** Course page: every summary field, the overview, the checklist and the lesson outline by section. */
@Builder
public record TrainingCourseDetailResponse(
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
        String status,
        String overviewMarkdown,
        List<String> checklistSteps,
        List<Integer> checkedSteps,
        List<Section> sections) {

    @Builder
    public record Section(String title, List<LessonItem> lessons) {}

    @Builder
    public record LessonItem(
            Long id,
            String title,
            String type,
            Integer durationMinutes,
            boolean completed,
            int resourceCount) {}
}
