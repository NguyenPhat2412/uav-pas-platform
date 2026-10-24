package com.uav.platform.modules.mission.mapper;

import com.uav.platform.modules.mission.dto.response.MissionResponse;
import com.uav.platform.modules.mission.entity.Mission;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface MissionMapper {

    @Mapping(target = "customerId", source = "customer.id")
    @Mapping(target = "customerName", source = "customer.fullName")
    @Mapping(target = "serviceId", source = "service.id")
    @Mapping(target = "stationId", source = "station.id")
    @Mapping(target = "uavId", source = "uav.id")
    @Mapping(target = "operatorId", source = "operator.id")
    @Mapping(
            target = "flightPlan",
            expression =
                    "java(com.uav.platform.modules.mission.service.impl.FlightPlanOperations.read(mission.getFlightPlan()))")
    MissionResponse toResponse(Mission mission);
}
