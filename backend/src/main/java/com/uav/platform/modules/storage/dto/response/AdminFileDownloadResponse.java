package com.uav.platform.modules.storage.dto.response;

/** A short-lived signed GET URL for one stored object. */
public record AdminFileDownloadResponse(String url, int expiresInSeconds) {}
