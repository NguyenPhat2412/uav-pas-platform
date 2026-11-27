package com.uav.platform.dto.response;

import java.util.List;

public record DispatchQueueItemResponse(
        MissionResponse mission, List<DispatchCandidateProviderResponse> candidates) {}
