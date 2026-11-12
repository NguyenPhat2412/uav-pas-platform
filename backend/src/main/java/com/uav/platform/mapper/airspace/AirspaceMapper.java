package com.uav.platform.mapper.airspace;

import com.uav.platform.dto.response.airspace.AirspaceZoneResponse;
import com.uav.platform.entity.airspace.AirspaceZone;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface AirspaceMapper {

    @Mapping(
            target = "vertices",
            expression =
                    "java(com.uav.platform.service.impl.airspace.AirspaceGeometryOperations.readVertices(zone.getPolygonVertices()))")
    AirspaceZoneResponse toResponse(AirspaceZone zone);
}
