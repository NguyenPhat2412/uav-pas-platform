package com.uav.platform.mapper.uav;

import com.uav.platform.dto.response.uav.UavResponse;
import com.uav.platform.dto.response.uav.UavStatusHistoryResponse;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.entity.uav.UavStatusHistory;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface UavMapper {

    @Mapping(target = "stationId", source = "station.id")
    @Mapping(target = "stationName", source = "station.name")
    UavResponse toResponse(Uav uav);

    @Mapping(target = "uavId", source = "uav.id")
    UavStatusHistoryResponse toResponse(UavStatusHistory history);
}
