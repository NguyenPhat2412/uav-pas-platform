package com.uav.platform.mapper;

import com.uav.platform.dto.response.MissionResponse;
import com.uav.platform.entity.Mission;

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
    @Mapping(target = "providerId", source = "provider.id")
    @Mapping(target = "providerDisplayName", source = "provider.displayName")
    @Mapping(target = "listingId", source = "listing.id")
    @Mapping(target = "listingTitle", source = "listing.title")
    @Mapping(target = "projectId", source = "project.id")
    @Mapping(target = "projectName", source = "project.name")
    @Mapping(target = "subscriptionId", source = "subscription.id")
    @Mapping(
            target = "statusGroup",
            expression =
                    "java(com.uav.platform.common.util.OrderStatusGroups.fromMission(mission.getStatus(), false))")
    @Mapping(target = "reviewed", constant = "false")
    @Mapping(
            target = "flightPlan",
            expression =
                    "java(com.uav.platform.service.impl.FlightPlanOperations.read(mission.getFlightPlan()))")
    @Mapping(
            target = "permit",
            expression =
                    "java(com.uav.platform.service.impl.MissionPermitOperations.toResponse(mission))")
    MissionResponse toResponse(Mission mission);
}
