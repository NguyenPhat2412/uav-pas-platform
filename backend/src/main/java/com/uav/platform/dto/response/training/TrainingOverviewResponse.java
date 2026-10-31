package com.uav.platform.dto.response.training;

import lombok.Builder;

import java.util.List;

@Builder
public record TrainingOverviewResponse(
        String portal,
        Integer totalDocuments,
        Integer completedDocuments,
        Integer mandatoryDocuments,
        Integer mandatoryCompleted,
        Integer totalEstimatedMinutes,
        Integer completedMinutes,
        List<TrainingDocumentResponse> documents) {

    public String getPortal() {
        return portal();
    }

    public Integer getTotalDocuments() {
        return totalDocuments();
    }

    public Integer getCompletedDocuments() {
        return completedDocuments();
    }

    public Integer getMandatoryDocuments() {
        return mandatoryDocuments();
    }

    public Integer getMandatoryCompleted() {
        return mandatoryCompleted();
    }

    public Integer getTotalEstimatedMinutes() {
        return totalEstimatedMinutes();
    }

    public Integer getCompletedMinutes() {
        return completedMinutes();
    }

    public List<TrainingDocumentResponse> getDocuments() {
        return documents();
    }
}
