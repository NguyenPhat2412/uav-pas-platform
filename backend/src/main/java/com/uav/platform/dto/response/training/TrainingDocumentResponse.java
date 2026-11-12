package com.uav.platform.dto.response.training;

import com.fasterxml.jackson.annotation.JsonInclude;

import lombok.Builder;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;

@Builder
public record TrainingDocumentResponse(
        Long id,
        String code,
        String slug,
        String targetPortal,
        String category,
        String level,
        String versionTag,
        Integer estimatedMinutes,
        Boolean isMandatory,
        Integer sortOrder,
        Boolean active,
        String title,
        String summary,
        String contentMarkdown,
        @JsonInclude(JsonInclude.Include.NON_NULL) String coverUrl,
        List<String> checklistSteps,
        String progressStatus,
        List<Integer> checkedSteps,
        OffsetDateTime completedAt,
        LocalDateTime updatedAt) {

    public Long getId() {
        return id();
    }

    public String getCode() {
        return code();
    }

    public String getSlug() {
        return slug();
    }

    public String getTargetPortal() {
        return targetPortal();
    }

    public String getCategory() {
        return category();
    }

    public String getLevel() {
        return level();
    }

    public String getVersionTag() {
        return versionTag();
    }

    public Integer getEstimatedMinutes() {
        return estimatedMinutes();
    }

    public Boolean getIsMandatory() {
        return isMandatory();
    }

    public Integer getSortOrder() {
        return sortOrder();
    }

    public Boolean getActive() {
        return active();
    }

    public String getTitle() {
        return title();
    }

    public String getSummary() {
        return summary();
    }

    public String getContentMarkdown() {
        return contentMarkdown();
    }

    public String getCoverUrl() {
        return coverUrl();
    }

    public List<String> getChecklistSteps() {
        return checklistSteps();
    }

    public String getProgressStatus() {
        return progressStatus();
    }

    public List<Integer> getCheckedSteps() {
        return checkedSteps();
    }

    public OffsetDateTime getCompletedAt() {
        return completedAt();
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt();
    }
}
