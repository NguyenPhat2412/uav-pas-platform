package com.uav.platform.dto.request.training;

/** READY image asset to use as the course cover; null removes the cover. */
public record UpdateCourseCoverRequest(Long assetId) {}
