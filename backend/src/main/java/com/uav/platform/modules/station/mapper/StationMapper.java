package com.uav.platform.modules.station.mapper;

import com.uav.platform.modules.station.dto.response.StationResponse;
import com.uav.platform.modules.station.entity.Station;

public final class StationMapper {
    private StationMapper() {}

    public static StationResponse toResponse(Station station) {
        return new StationResponse(
                station.getId(),
                station.getCode(),
                station.getName(),
                station.getAddress(),
                station.getLatitude(),
                station.getLongitude(),
                station.getStatus(),
                station.getCreatedAt(),
                station.getUpdatedAt());
    }
}
