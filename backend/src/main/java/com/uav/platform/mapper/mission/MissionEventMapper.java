package com.uav.platform.mapper.mission;

import com.uav.platform.dto.response.mission.MissionEventResponse;
import com.uav.platform.entity.mission.MissionEvent;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface MissionEventMapper {

    @Mapping(target = "actor", source = "actor.username")
    MissionEventResponse toResponse(MissionEvent event);
}
