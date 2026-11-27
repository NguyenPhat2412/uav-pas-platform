package com.uav.platform.mapper;

import com.uav.platform.dto.response.AirspaceZoneResponse;
import com.uav.platform.entity.AirspaceZone;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface AirspaceMapper {

    @Mapping(
            target = "vertices",
            expression =
                    "java(com.uav.platform.service.impl.AirspaceGeometryOperations.readVertices(zone.getPolygonVertices()))")
    AirspaceZoneResponse toResponse(AirspaceZone zone);
}
