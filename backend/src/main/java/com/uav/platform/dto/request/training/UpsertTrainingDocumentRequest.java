package com.uav.platform.dto.request.training;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import lombok.Builder;

import java.util.List;

@Builder
public record UpsertTrainingDocumentRequest(
        @NotBlank @Size(max = 40) String code,
        @NotBlank @Size(max = 20) String targetPortal,
        @NotBlank @Size(max = 40) String category,
        @NotBlank @Size(max = 25) String level,
        @Size(max = 25) String versionTag,
        @NotNull @Min(1) Integer estimatedMinutes,
        Boolean isMandatory,
        Integer sortOrder,
        Boolean active,
        @NotBlank @Size(max = 220) String title,
        @NotBlank @Size(max = 500) String summary,
        @NotBlank String contentMarkdown,
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
