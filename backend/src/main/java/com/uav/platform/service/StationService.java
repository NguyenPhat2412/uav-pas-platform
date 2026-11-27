package com.uav.platform.service;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.StationRequest;
import com.uav.platform.dto.response.StationResponse;
import com.uav.platform.enums.StationStatus;

import org.springframework.data.domain.Pageable;

import java.util.Optional;

public interface StationService {
    PageResponse<StationResponse> list(Pageable pageable);

    /** Stations whose code, name or address contains `search`, optionally of one status. */
    PageResponse<StationResponse> list(String search, StationStatus status, Pageable pageable);

    StationResponse get(Long id);

    StationResponse create(StationRequest request, String actor);

    StationResponse update(Long id, StationRequest request, String actor);

    StationResponse updateStatus(Long id, StationStatus status, String actor);

    /**
     * Removes a station nobody has used yet. A station that UAVs, equipment, missions or stock
     * movements refer to is set INACTIVE instead and returned (BR-08, P1-FR-010).
     */
    Optional<StationResponse> delete(Long id, String actor);
}
