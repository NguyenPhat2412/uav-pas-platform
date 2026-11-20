package com.uav.platform.dto.response.marketplace.admin;

import com.uav.platform.dto.response.mission.lifecycle.MissionResponse;

import java.util.List;

public record DispatchQueueItemResponse(
        MissionResponse mission, List<DispatchCandidateProviderResponse> candidates) {}
