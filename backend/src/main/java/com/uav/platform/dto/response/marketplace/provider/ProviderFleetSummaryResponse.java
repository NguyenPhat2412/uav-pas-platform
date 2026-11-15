package com.uav.platform.dto.response.marketplace.provider;

import java.util.List;

public record ProviderFleetSummaryResponse(
        List<ProviderUavResponse> uavs, List<ProviderEquipmentResponse> equipment) {}
