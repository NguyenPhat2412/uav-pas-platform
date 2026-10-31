package com.uav.platform.dto.response.training;

import java.util.Map;

/** Signed PUT for a browser to upload the file straight to the object store, with the headers to send. */
public record TrainingAssetUploadResponse(
        Long assetId, String uploadUrl, String method, Map<String, String> headers) {}
