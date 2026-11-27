package com.uav.platform.mapper;

import com.uav.platform.dto.response.StationResponse;
import com.uav.platform.entity.Station;

import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface StationMapper {

    StationResponse toResponse(Station station);
}
