package com.uav.platform.mapper.station;

import com.uav.platform.dto.response.station.StationResponse;
import com.uav.platform.entity.station.Station;

import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface StationMapper {

    StationResponse toResponse(Station station);
}
