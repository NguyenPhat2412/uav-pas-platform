package com.uav.platform.modules.station.service;


import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.modules.station.config.request.StationRequest;
import com.uav.platform.modules.station.config.response.StationResponse;
import org.springframework.data.domain.Pageable;

public interface StationService {
    PageResponse<StationResponse> list(Pageable pageable);
    StationResponse get(Long id);
    StationResponse create(StationRequest request, String actor);
    StationResponse update(Long id, StationRequest request, String actor);
    void delete(Long id, String actor);
}
