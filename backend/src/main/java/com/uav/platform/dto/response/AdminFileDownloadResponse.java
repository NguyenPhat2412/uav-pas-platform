package com.uav.platform.dto.response;

/** A short-lived signed GET URL for one stored object. */
public record AdminFileDownloadResponse(String url, int expiresInSeconds) {}
