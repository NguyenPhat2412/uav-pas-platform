package com.uav.platform.dto.response.storage.files;

/** A short-lived signed GET URL for one stored object. */
public record AdminFileDownloadResponse(String url, int expiresInSeconds) {}
