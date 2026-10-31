package com.uav.platform.dto.request.training;

import jakarta.validation.constraints.Min;

import lombok.Builder;

/** Null fields leave the stored value unchanged. */
@Builder
public record UpdateLessonProgressRequest(Boolean completed, @Min(0) Integer positionSeconds) {}
