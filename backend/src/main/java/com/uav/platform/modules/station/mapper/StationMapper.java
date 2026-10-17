package com.uav.platform.modules.station.mapper;

import com.uav.platform.modules.station.dto.response.StationResponse;
import com.uav.platform.modules.station.entity.Station;

import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface StationMapper {

    StationResponse toResponse(Station station);
}
