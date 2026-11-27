package com.uav.platform.service;

import com.uav.platform.dto.request.AirspaceCheckRequest;
import com.uav.platform.dto.request.AirspaceZoneUpsertRequest;
import com.uav.platform.dto.response.AirspaceCheckResponse;
import com.uav.platform.dto.response.AirspaceZoneResponse;

import org.springframework.security.core.Authentication;

import java.util.List;

public interface AirspaceService {

    List<AirspaceZoneResponse> listZones(boolean activeOnly, Authentication authentication);

    AirspaceCheckResponse check(AirspaceCheckRequest request);

    AirspaceZoneResponse createZone(
            AirspaceZoneUpsertRequest request, Authentication authentication);

    AirspaceZoneResponse updateZone(
            Long id, AirspaceZoneUpsertRequest request, Authentication authentication);

    void deleteZone(Long id, Authentication authentication);
}
