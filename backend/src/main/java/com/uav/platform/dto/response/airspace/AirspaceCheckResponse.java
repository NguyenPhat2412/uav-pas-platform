package com.uav.platform.dto.response.airspace;

import java.util.List;

public record AirspaceCheckResponse(
        boolean clear,
        boolean blocked,
        boolean requiresPermit,
        String clearance,
        List<AirspaceViolationResponse> violations) {}
