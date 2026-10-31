package com.uav.platform.mapper.mission;

import com.uav.platform.dto.response.mission.MissionResponse;
import com.uav.platform.entity.mission.Mission;

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
                    "java(com.uav.platform.service.impl.mission.FlightPlanOperations.read(mission.getFlightPlan()))")
    MissionResponse toResponse(Mission mission);
}
