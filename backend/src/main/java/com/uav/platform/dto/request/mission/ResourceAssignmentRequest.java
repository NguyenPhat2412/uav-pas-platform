package com.uav.platform.dto.request.mission;

import com.uav.platform.enums.mission.*;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ResourceAssignmentRequest(
        @NotNull Long resourceId, @NotNull @Min(1) Integer quantity, String note) {
    public ResourceAssignmentRequest(Long resourceId) {
        this(resourceId, 1, null);
    }
}
