package com.uav.platform.service.airspace;

import com.uav.platform.dto.request.airspace.AirspaceCheckRequest;
import com.uav.platform.dto.request.airspace.AirspaceZoneUpsertRequest;
import com.uav.platform.dto.response.airspace.AirspaceCheckResponse;
import com.uav.platform.dto.response.airspace.AirspaceZoneResponse;

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
