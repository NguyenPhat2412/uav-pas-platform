package com.uav.platform.dto.response.storage;

/** A short-lived signed GET URL for one stored object. */
public record AdminFileDownloadResponse(String url, int expiresInSeconds) {}
