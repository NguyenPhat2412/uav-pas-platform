package com.uav.platform.mapper;

import com.uav.platform.dto.response.UavResponse;
import com.uav.platform.dto.response.UavStatusHistoryResponse;
import com.uav.platform.entity.Uav;
import com.uav.platform.entity.UavStatusHistory;

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
