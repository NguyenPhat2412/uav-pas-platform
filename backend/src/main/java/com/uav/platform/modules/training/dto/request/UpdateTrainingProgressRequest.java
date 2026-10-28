package com.uav.platform.modules.training.dto.request;

import lombok.Builder;

import java.util.List;

@Builder
public record UpdateTrainingProgressRequest(List<Integer> checkedSteps, Boolean markCompleted) {

    public List<Integer> getCheckedSteps() {
        return checkedSteps();
    }

    public Boolean getMarkCompleted() {
        return markCompleted();
    }
}
