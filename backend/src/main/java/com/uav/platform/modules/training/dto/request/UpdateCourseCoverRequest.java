package com.uav.platform.modules.training.dto.request;

/** READY image asset to use as the course cover; null removes the cover. */
public record UpdateCourseCoverRequest(Long assetId) {}
