package com.uav.platform.dto.request.training;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import lombok.Builder;

import java.util.List;

@Builder
public record UpsertTrainingDocumentRequest(
        @NotBlank(message = "Document code is required") String code,
        @NotBlank(message = "Target portal is required") String targetPortal,
        @NotBlank(message = "Category is required") String category,
        @NotBlank(message = "Level is required") String level,
        String versionTag,
        @NotNull(message = "Estimated minutes is required") Integer estimatedMinutes,
        Boolean isMandatory,
        Integer sortOrder,
        Boolean active,
        @NotBlank(message = "Title is required") String title,
        @NotBlank(message = "Summary is required") String summary,
        @NotBlank(message = "Markdown content is required") String contentMarkdown,
        List<String> checklistSteps) {

    public String getCode() {
        return code();
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

    public List<String> getChecklistSteps() {
        return checklistSteps();
    }
}
