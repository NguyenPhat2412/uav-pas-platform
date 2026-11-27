package com.uav.platform.dto.response;

import java.util.List;

public record ProviderFleetSummaryResponse(
        List<ProviderUavResponse> uavs, List<ProviderEquipmentResponse> equipment) {}
